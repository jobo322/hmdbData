const fs = require('fs');
const path = require('path');
const peakTablesReader = require('./reader/peakList.js');
const xmlParser = require('xml2json');
const nmrMetadata = require('nmr-metadata');
const OCL = require('openchemlib-extended');
const SD = require('spectra-data');
// var pathMetaboliteMetadata = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData';
// var pathNmrPeakList = '/home/abolanos/hmdbProject/peakListWrong';
// var pathOfJcamp = '/home/abolanos/hmdbProject/hmdb_nmr_jcamp';
// var pathNmrSpectra = '/home/abolanos/hmdbProject/hmdb_nmr_spectra';
// var pathToSaveJSON = '/home/abolanos/hmdbProject/jsonDataToImport'

var pathMetaboliteMetadata = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_metabolite_json\\metaboliteWithNmrData'
var pathNmrPeakList =        'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\peakListWrong';
var pathOfJcamp =            'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_jcamp';
var pathNmrSpectra =         'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_spectra';
var pathToSaveJSON =         'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\jsonDataToImport'
var debugg = false;
// @TODO: check if you can to pause the streaming while the metabolite is doing
// create a list of nmr files to import with the metadata
var listOfJcamp = createListFromPath(pathOfJcamp);
var listNmrPeakFiles = createListFromPath(pathNmrPeakList);
var listNmrSpectra = createListFromPath(pathNmrSpectra, {
    pId: 5,
    pDimension: [1,2,3]
});

var pathToMetadata = [
    {
        saveIn: 'general',
        saveAs: 'mw',
        type: 'string',
        path: ['average_molecular_weight'],
        isArray: false,
    },
    {
        saveIn: 'general',
        saveAs: 'mf',
        type: 'string',
        path: ['chemical_formula'],
        isArray: false,
    },
    {
        saveIn: 'general',
        saveAs: 'smiles',
        type: 'string',
        path: ['smiles'],
        isArray: false,
    },
    {
        saveIn: 'general',
        saveAs: 'description',
        type: 'string',
        path: ['description'],
        isArray: false,
    },
    {
        saveIn: 'general',
        saveAs: 'name',
        type: 'string',
        path: ['synonyms'],
        isArray: true,
        isObject: false
    },
    {
        saveIn: 'identifier',
        saveAs: 'cas',
        type: 'string',
        path: ['cas_registry_number'],
        isArray: true,
        isObject: false
    },
    {
        saveIn: 'identifier',
        saveAs: 'pubchem',
        type: 'string',
        path: ['pubchem_compound_id'],
        isArray: true,
        isObject: false

    }
]

var count = 0;
var withSpectra = 0;
var withExperimentalData = 0;
var withMetadata = 0;
var withPeakTable = 0
var withPM = 0
var withPME = 0
var withPE = 0
var withME = 0
let list = fs.readdirSync(pathMetaboliteMetadata);
list.forEach((fileName, i) => {

    let accession = fileName.replace(/\.\w+/,'');
    let jsonResult = {
        id: [accession, ''], 
        kind: 'sample', 
        owner: 'admin@cheminfo.org',
        groups: ['anonymousRead'],

    };
    let file = fs.readFileSync(path.format({dir: pathMetaboliteMetadata, base: fileName}));
    let result = JSON.parse(file);
    
    var spectra = result['spectra'];
    if (!spectra) {
        console.warn('Accession: ' + accession + ' has not spectra');
        return
    } else if (!spectra.some((e, i) => {
        return e.type.slice(8).toLowerCase() === 'nmroned'
    })){
        return
    }

    jsonResult.content = getData(pathToMetadata, result);

    if (jsonResult.content.general.smiles) {
        let smile = jsonResult.content.general.smiles;
        let molecule = OCL.Molecule.fromSmiles(smile);
        let molfile = molecule.toMolfile();
        jsonResult.content.general.molfile = molfile;
        let oclID = molecule.getIDCodeAndCoordinates();
        jsonResult.content.general.ocl = {
            value: oclID.idCode,
            coordinates: oclID.coordinates,
            index: molecule.getIndex()
        }
    }
    
    var nmr = [];
    spectra.some((e, i) => {
        if (e.type.slice(8).toLowerCase() === 'nmroned') {
            var entry;
            var spectrum = {
                accession,
                spectrumId: e.spectrum_id,
                hasData: false,
                hasExperimentalData: false,
                hasMetadata: false,
                hasPeakTable: false
            };

            if (listOfJcamp.hasOwnProperty(accession)) {
                entry = listOfJcamp[accession][e.spectrum_id];
                if (entry) {
                    spectrum.hasData = true;
                    spectrum.hasExperimentalData = true;
                    let jcamp = fs.readFileSync(path.join(pathOfJcamp, entry.fileName), 'utf8');
                    spectrum.filename = entry.fileName;
                    spectrum = Object.assign({}, spectrum, nmrMetadata.parseJcamp(jcamp, {computeRanges: false}));
                }
            } else if (listNmrSpectra.hasOwnProperty(accession)) {
                entry = listNmrSpectra[accession][e.spectrum_id];
                if (entry) {
                    spectrum.hasData = true;
                    spectrum.hasMetadata = true;
                    let spectraDataFile = fs.readFileSync(path.join(pathNmrSpectra, entry.fileName), 'utf8');
                    let spectraData = xmlParser.toJson(spectraDataFile, {object: true});
                    let metadata = extractSpectraMetadata(spectraData['nmr-one-d']);
                    spectrum = Object.assign({}, spectrum, metadata);
                }
            }
            if (listNmrPeakFiles.hasOwnProperty(accession)) {
                entry = listNmrPeakFiles[accession][e.spectrum_id];
                if (entry) {
                    spectrum.hasData = true;
                    spectrum.hasPeakTable = true;
                    var peakListData = peakTablesReader({base: entry.fileName, dir: pathNmrPeakList});
                    if (peakListData.peaks) {
                        let peakList = peakListData.peaks.map((peak) => {
                            let result = {};
                            if (peak['shift-ppm']) result.ppm = peak['shift-ppm'];
                            if (peak['shift-hz']) result.frequency = peak['shift-hz'];
                            if (peak['height']) result.intensity = peak['height'];
                            return result;
                        });
                        spectrum.peaksFromTable = peakList;
                    }
                    let range = readNmrPeakList(peakListData);
                    spectrum.range = range;
                }
            }
            
            if (spectrum.hasPeakTable && spectrum.hasMetadata && spectrum.hasExperimentalData) {
                withPME++
            } else if (spectrum.hasPeakTable && spectrum.hasMetadata) {
                 withPM++
            } else if (spectrum.hasExperimentalData) {
                withExperimentalData++
                if (spectrum.hasMetadata) {
                    withME++
                } else if (spectrum.hasPeakTable) {
                    withPE++
                }
            } else {
                if (spectrum.hasMetadata) {
                    withMetadata++
                }
                if (spectrum.hasPeakTable) {
                    withPeakTable++
                }
            }
            
            return
            if (spectrum.hasData) {
                let data;
                let frequency, defaultFrequency;
                if (!spectrum.hasExperimentalData) {
                    let x = [], y = [], sd;
                    if (spectrum.hasPeakTable) {
                        if (spectrum.peaksFromTable) {
                            let peaks = spectrum.peaksFromTable;
                            spectrum.dimension = 1;
                            spectrum.isFt = true;
                            spectrum.isFid = false;
                            let from = Number.MAX_SAFE_INTEGER, to = Number.MIN_SAFE_INTEGER;
                            peaks.forEach((p, i, arr) => {
                                arr[i].xL = 0.8;
                                arr[i].x = Number(p.ppm);
                                arr[i].width = 0.003;
                                arr[i].intensity = Number(p.intensity);
                                if (from > arr[i].x) {
                                    from = arr[i].x
                                } 
                                if (to < arr[i].x) {
                                    to = arr[i].x
                                }
                            });
                            if (debugg) console.log('this is from and to');
                            if (debugg) console.log(from, to);
                            from -= 0.5;
                            to += 0.5;

                            let defaultFrequency = to > 20 ? 150 : 600;
                            frequency = spectrum.frequency ? Number(spectrum.frequency.replace(/\s*[a-zA-Z]*/g, '')) : defaultFrequency;
                            
                            let nbPoints = Math.round((to - from) / 0.001 + 1);
                            // console.log('this is nbPoints %s', nbPoints);
                            // console.log('frequency is %s', frequency)
                            // console.log('from: %s to: %s', from, to);
                            let [dataX, dataY] = _getXY(from, to, nbPoints);
                            let gaussian = getGaussian(from * frequency, to * frequency, 2, nbPoints);
                            // console.log('gaussian is array %s with length %s',Array.isArray(gaussian), gaussian.length)
                            peaks.forEach((p) => {
                                addPeak(dataY, p.x, p.intensity, from, to, nbPoints, gaussian);
                            })
                            
                            // let dataXY = peak2Vector(peaks, {from: from - 0.5, to: to + 0.5, nbPoints: 8*1024});
                            if (debugg) console.log('this is the max Y');
                            sd = SD.NMR.fromXY(dataX, dataY, {frequency: frequency});
                            // fixing an error in spectra-data
                            sd.putParam('$SW_h', sd.getParamDouble('.$SW_h'));
                            sd.putParam('$SW', sd.getParamDouble('.$SW'));
                            sd.putParam('$TD', sd.getParamDouble('.$TD'));
                            data = Buffer.from(sd.toJcamp()).toString('base64');
                            if (accession === 'HMDB0000036') {
                                console.log(sd.toJcamp());
                            }
                        }
                    } else if (spectrum.hasMetadata) {
                        if (spectrum.peaksFromMetadata) {
                            let peaks = spectrum.peaksFromMetadata;
                            frequency = spectrum.frequency ? Number(spectrum.frequency.replace(/\s*[a-zA-Z]*/g, '')) : 600;
                            let from = Number.MAX_SAFE_INTEGER, to = Number.MIN_SAFE_INTEGER;
                            peaks.forEach((p, i, arr) => {
                                arr[i].xL = 0.8;
                                arr[i].x = Number(p.ppm);
                                arr[i].width = 0.003;
                                arr[i].intensity = Number(p.intensity);
                                if (from > arr[i].x) {
                                    from = arr[i].x
                                } 
                                if (to < arr[i].x) {
                                    to = arr[i].x
                                }
                            });
                            spectrum.peaksFromMetadata.forEach((p, i, arr) => {
                                arr[i].xL = 0.8;
                                arr[i].x = Number(p.ppm);
                                arr[i].width = 0.003;
                                arr[i].intensity = Number(p.intensity);
                            });
                            spectrum.dimension = 1;
                            spectrum.isFt = true;
                            spectrum.isFid = false;
                            from -= 0.5;
                            to += 0.5;

                            let defaultFrequency = to > 20 ? 150 : 600;
                            frequency = spectrum.frequency ? Number(spectrum.frequency.replace(/\s*[a-zA-Z]*/g, '')) : defaultFrequency;

                            let nbPoints = Math.round(((to - from) / 0.1) * frequency + 1);

                            let [dataX, dataY] = _getXY(from, to, nbPoints);
                            console.log('this is nbPoints %s', nbPoints);
                            console.log('frequency is %s', frequency)
                            console.log('from: %s to: %s', from, to);
                            let gaussian = getGaussian(from * frequency, to * frequency, 4, nbPoints);
                            peaks.forEach((p) => {
                                addPeak(dataY, p.x, p.intensity, from, to, nbPoints, gaussian);
                            })

                            // let dataXY = peak2Vector(peaks, {from: from - 0.5, to: to + 0.5, nbPoints: 8*1024});
                            sd = SD.NMR.fromXY(dataX, dataY, {frequency: frequency});
                            if (!spectrum.ranges) {
                                let ranges = sd.getRanges();
                                spectrum.range = ranges;
                            }
                            // fixing an error in spectra-data
                            sd.putParam('$SW_h', sd.getParamDouble('.$SW_h'));
                            sd.putParam('$SW', sd.getParamDouble('.$SW'));
                            sd.putParam('$TD', sd.getParamDouble('.$TD'));
                            data = Buffer.from(sd.toJcamp()).toString('base64');
                        }
                    }
                } else {
                    data = fs.readFileSync(path.join(pathOfJcamp, spectrum.filename), 'base64');
                    delete spectrum.filename;
                }
                if (!data) {
                    throw new Error('there is not data for an attachment');
                }
                
                let attachment = {
                    reference: accession + '_' + e.spectrum_id,
                    contents: data,
                    jpath: ['spectra', 'nmr'],
                    content_type: 'chemical/x-jcamp-dx',
                    filename: accession + '_' + e.spectrum_id + '.jdx',
                    metadata: spectrum,
                    field: 'jcamp',
                }
                nmr.push(attachment);
                withSpectra++
            }   
        }
    });
    if (nmr.length === 0) {
        console.log('has not nmr data %s', accession);
        return
    }
    
    jsonResult.attachments = nmr;
    fs.writeFileSync(path.format({dir: pathToSaveJSON, base: accession + '.json'}), JSON.stringify(jsonResult))
    count++
})

console.log('withPM  %s', withPM)
console.log('withPE %s', withPE)
console.log('withPME %s', withPME)
console.log('withME %s', withME)
console.log('withMetadata %s',withMetadata)
console.log('withExperimental %s',withExperimentalData);
function addPeak(result, freq, height, from, to, nbPoints, gaussian) {
    const center = (nbPoints * (freq - from) / (to - from)) | 0;
    // console.log('center is %s', center)
    const lnPoints = gaussian.length;
    // console.log('ln points is %s', lnPoints);
    var index = 0;
    var indexLorentz = 0;
    for (var i = center - lnPoints / 2; i < center + lnPoints / 2; i++) {
        index = i | 0;
        if (i >= 0 && i < nbPoints) {
            result[index] = result[index] + gaussian[indexLorentz] * height;
        }
      indexLorentz++;
    }
    // console.log('\n');
}

function _getXY(from, to, nbPoints) {
    const x = new Array(nbPoints);
    const y = new Array(nbPoints);
    const dx = (to - from) / (nbPoints - 1);
    for (var i = 0; i < nbPoints; i++) {
        y[i] = 0;
        x[i] = from + i * dx;
    }
    return [x, y];
}

function getGaussian(from, to, lineWidth, nbPoints) {
    let lineWidthPoints = (nbPoints * lineWidth / Math.abs(to - from)) / 2.355;
    // console.log('line Width points is %s', lineWidthPoints)
    let lnPoints = lineWidthPoints * 20;
    var gaussianLength = lnPoints | 0;
    if (gaussianLength === 0) throw new Error('gaussianLength should be not cero');
    var gaussian = new Array(gaussianLength);
    var b = lnPoints / 2;
    var c = lineWidthPoints * lineWidthPoints * 2;
    for (let i = 0; i < gaussianLength; i++) {
        gaussian[i] = 1e9 * Math.exp(-((i - b) * (i - b)) / c);
    }
    return gaussian;
}
function extractSpectraMetadata(spectraData) {
    let keyList = [
        {key: 'solvent', saveAs: 'solvent'}, 
        {key: 'nucleus', saveAs: 'nucleus', saveType: 'Array'}, 
        {key: 'frequency', saveAs: 'frequency'}, 
        {key: 'sample-ph', saveAs: 'ph'}, 
        {key: 'sample-temperature', saveAs: 'temperature'},
        {key: 'sample-temperature-units', saveAs: 'temperatureUnits'},
        {key: 'chemical-shift-reference', saveAs: 'referenceShift'},
        {key: 'references', saveAs: 'bibliography'},
        {key: 'sample-assessment', saveAs: 'sampleAssessment'},
        {key: 'spectra-assessment', saveAs: 'spectraAssessment'},
        {key: 'created-at', saveAs: 'creationDate'},
        {key: 'update-at', saveAs: 'updateDate'},
        {key: 'sample-concentration', saveAs: 'concentration'},
        {key: 'sample-concentration-units', saveAs: 'concentrationUnits'},
        {key: 'notes', saveAs: 'annotation'},
        {key: 'sample-mass', saveAs: 'sampleMass'},
        {key: 'sample-mass-units', saveAs: 'sampleMassUnits'}
    ];
    let metadata = checkToAdd(keyList, {}, spectraData);
    
    if (metadata.sampleMass) {
        if (metadata.sampleMassUnits) {
            metadata.sampleMass = {value: metadata.sampleMass, units: metadata.sampleMassUnits};
            delete metadata.sampleMassUnits
        }
    }
    if (metadata.concentrationUnits) {
        if (metadata.concentrationUnits) {
            metadata.sampleMass = {value: metadata.concentration, units: metadata.concentrationUnits};
            delete metadata.concentrationUnits
        }
    }
    if (metadata.bibliography) {
        if (!Array.isArray(metadata.bibliography.reference)) {
            metadata.bibliography = [metadata.bibliography.reference];
        }
    }
    if (metadata.temperature) {
        if (metadata.temperatureUnits) {
            let units = metadata.temperatureUnits;
            if (units.toLowerCase() === 'celsius') {
                metadata.temperature = metadata.temperature + 273.15;
            }
        }
    }
    metadata.peaksFromMetadata = getPeakList(spectraData);
    
    return metadata;

    function checkToAdd(keyList, metadata, spectraData) {
        keyList.forEach(obj => {
            if (spectraData[obj.key] && !spectraData[obj.key].hasOwnProperty('nil')) {
                let result
                switch (obj.saveType) {
                    case 'Array':
                        result = [spectraData[obj.key]];
                        break;
                    default:
                        result = spectraData[obj.key];
                }
                metadata[obj.saveAs] = result;
            }
        });
        return metadata;
    }
    function getPeakList(spectraData) {
        let result = [];
        if (spectraData['nmr-one-d-peaks']) {
            let peaks = spectraData['nmr-one-d-peaks'];
            peaks = peaks['nmr-one-d-peak'];
            if (!Array.isArray(peaks)) peaks = [peaks];
            result = peaks.map((peak) => ({ppm: peak['chemical-shift'], intensity: peak['intensity']}));
        }
        return result;
    }
}

function peak2Vector(peaks, options = {}) {
    var debugg = false;
    var {
        from = null,
        to = null,
        nbPoints = 64 *1024,
        functionName = '',
        nWidth = 4
    } = options;
    if (debugg) console.log('this is fromTo inside function %s - %s',from, to);
    var x = new Array(nbPoints);
    var y = new Array(nbPoints);
    var dx = (to - from) / (nbPoints - 1);
    if (debugg) console.log('this is dx %s', dx);
    for (let i = 0; i < nbPoints; i++) {
        x[i] = from + i * dx;
        y[i] = 0;
    }
    
    var nL = peaks.length;
    var parameters = new Array(nL * 4);
    var intensity = peaks[0].y ? 'y' : 'intensity';
    
    for (let i = 0; i < nL; i++) {
        var peak = peaks[i];
        for (let k = 0; k < 4; k++) {
            parameters[i] = peak.x;
            parameters[i + nL] = peak[intensity];
            parameters[i + nL * 2] = peak.width;
            parameters[i + nL * 3] = peak.xL;
        }
    }
    sumOfPseudoVoigt(x, parameters, y);
    function sumOfPseudoVoigt(t, p, result) {
        var nL = p.length/4, factorG1, factorG2, factorL, cols = t.length, p2;
        if (debugg) console.log('number of nL is %s and length %s', nL, p.length);
        for(let i = 0; i < nL; i++) {
            var xG = p[i + nL * 3];
            var xL = 1 - xG;
            p2 = Math.pow(p[i+nL*2]/2,2);
            factorL = xL * p[i+nL] * p2;
            factorG1 = p[i+nL*2]*p[i+nL*2]*2;
            factorG2 = xG * p[i+nL];
            for(let j = 0; j < cols; j++) {
                result[j] +=  factorG2 * Math.exp(-Math.pow(t[j]-p[i], 2)/factorG1) +  factorL/(Math.pow(t[j]-p[i],2)+p2);
            }
        }
        return result;
    }
    return { x: x, y: y };
}

function readNmrPeakList(peakListData) {
    let {
        assignments,
        multiplets,
        peaks
    } = peakListData;
    
    let ranges = [];
    if (multiplets) {
        multiplets.forEach((m) => {
            let range = {};
            let signal = {};
            if (m.range) {
                let fromTo = m.range.split('|');
                if (fromTo.length === 2) {
                    var [from, to] = fromTo;
                } else {
                    console.log(m)
                    throw new Error('fromTo has not the right shape');
                }
                range.from = from;
                range.to = to;
            }
            if (m['shift-ppm']) {
                signal.delta = m['shift-ppm'];
            }
            if (m['type']) {
                signal.multiplicity = m['type']
            }
            if (m['coupling'] && m['coupling'] !== '-') {
                let couplings = m['coupling'].split('|');
                signal.j = couplings.map((e) => ({coupling: e}));
            } 
            if (m['hs'] !== undefined) {
                range.integral = m['hs'];
                range.pubIntegral = m['hs'];
            }
            if (m['atom']) {
                let atomSplited = m['atom'].split('|');
                signal.nbAtoms = atomSplited.length;
                range.pubAsignment = atomSplited;
            }

            if (!signal.pubAsignment) {
                if (assignments) {
                    assignments.some(assignment => {
                        if (assignment['exp-shift-ppm'] || assignment['shift-ppm']) {
                            let delta = assignment['exp-shift-ppm'] !== undefined ? assignment['exp-shift-ppm'] : assignment['shift-ppm'];
                            if (delta === signal.delta) {
                                if (assignment['atom']) {
                                    let aAtomSplited = assignment['atom'].split('|');
                                    signal.nbAtoms = aAtomSplited.length;
                                    range.pubAsignment = aAtomSplited;
                                }
                            }
                        }
                    })
                    
                }
            }
            if (peaks) {
                let peakList = peaks.filter((peak) => {
                    let delta = peak['shift-ppm'];
                    return delta >= range.from && delta <= range.to;
                })
                signal.peak = peakList.map((peak) => ({x: peak['shift-ppm'], intensity: peak['height']}))
                // console.log('range is ', range.from, range.to)
                // console.log(signal.peak)
            }
            range.signal = [signal];
            ranges.push(range);
        })
    }
    
    return ranges;
}

function getData(pathToMetadata, allMetadata) {
    let result = {};
    pathToMetadata.forEach((e, i) => {
        let {
            path,
            type,
            saveIn,
            saveAs,
        } = e
        let pathToSave = [saveIn];
        let tmp = allMetadata;
        path.forEach(p => tmp = tmp[p]);
        let tmps = result;
        pathToSave.forEach(ps => {
            if (!tmps[ps]) tmps[ps] = {}
            tmps = tmps[ps]
        });
        tmps[saveAs] = tmp
    })
    return result;
}



function createListFromPath(path, options = {}) {
    var {
        pAccession = 0,
        pDimension = [1],
        pId = 2
    } = options;
    var list = fs.readdirSync(path);
    var result = {};
    list.forEach((e) => {
        let temp = e.split('_');
        let accession = temp[pAccession];
        let dimension = pDimension.map((e) => temp[e]).join('');
        if (dimension === 'nmrtwod') return;
        let id = String(temp[pId]).replace(/\.xml/, '');
        if (!result[accession]) result[accession] = {};
        let entry = result[accession];
        entry[id] = {
            dimension: dimension === 'nmroned' ? 1 : 2,
            fileName: e
        }
    })
    return result;
}

function handdleError(err) {
    if (!err) return;
    throw err
}