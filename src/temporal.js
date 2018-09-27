const fs = require('fs');
const path = require('path');
const peakTablesReader = require('./reader/peakList.js');
const xmlParser = require('xml2json');
const nmrMetadata = require('nmr-metadata');
const SD = require('spectra-data');
var pathMetaboliteMetadata = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData';
var pathNmrPeakList = '/home/abolanos/hmdbProject/peakListWrong';
var pathOfJcamp = '/home/abolanos/hmdbProject/hmdb_nmr_jcamp';
var pathNmrSpectra = '/home/abolanos/hmdbProject/hmdb_nmr_spectra';
// var pathToSaveJSON = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData'

// var pathMetaboliteMetadata = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_metabolite_json\\metaboliteWithNmrData'
// var pathNmrPeakList = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\peakListWrong';
// var pathOfJcamp = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_jcamp';
// var pathNmrSpectra = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_spectra';

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
let list = fs.readdirSync(pathMetaboliteMetadata);
list.forEach((fileName, i) => {    
    let accession = fileName.replace(/\.\w+/,'');
    let jsonResult = {id: [accession, ''], kind: 'sample', owner: 'admin@cheminfo.org',};
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

    var nmr = []
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
                    spectrum.filename = entry.filename;
                    spectrum = Object.assign({}, spectrum, nmrMetadata.parseJcamp(jcamp, {computeRanges: false}));
                }
            } else if (listNmrSpectra.hasOwnProperty(accession)) {
                entry = listNmrSpectra[accession][e.spectrum_id]
                if (entry) {
                    spectrum.hasData = true;
                    spectrum.hasMetadata = true;
                    let spectraDataFile = fs.readFileSync(path.join(pathNmrSpectra, entry.fileName), 'utf8');
                    let spectraData = xmlParser.toJson(spectraDataFile, {object: true});
                    let metadata = extractSpectraMetadata(spectraData['nmr-one-d']);
                    spectrum = Object.assign({}, spectrum, metadata);          
                    // console.log(spectrum)     
                }
            }
            if (listNmrPeakFiles.hasOwnProperty(accession)) {
                entry = listNmrPeakFiles[accession][e.spectrum_id];
                if (entry) {
                    spectrum.hasData = true;
                    spectrum.hasPeakTable = true;
                    var peakListData = peakTablesReader({base: entry.fileName, dir: pathNmrPeakList});
                    let ranges = readNmrPeakList(peakListData);
                    spectrum.ranges = ranges;
                }
            }
            if (!spectrum.ranges) {
                if (spectrum.peaksFromMetadata) {
                    let ranges = spectrum.peaksFromMetadata;
                    spectrum.ranges = ranges;
                }
            }
            
            if (spectrum.hasData) {
                let data;
                if (!spectrum.hasExperimentalData) {
                    let x = [], y = [], sd;
                    if (spectrum.hasPeakTable) {
                        if (spectrum.range.peaks) {
                            let frequency;
                            let peaks = spectrum.range.peaks;
                            if (peaks[0].frequency && peaks[0].ppm) {
                                frequency = peaks[0].frequency / peaks[0].ppm;
                            }
                            spectrum.range.peaks.forEach((p, i) => {
                                x.push(p.ppm);
                                y.push(p.intensity);
                            });
                            sd = SD.fromXY(x, y, {frequency: frequency});
                            data = sd.toJcamp();
                        }
                    } else if (spectrum.hasMetadata) {
                        if (spectrum.peaksFromMetadata) {
                            spectrum.peaksFromMetadata.forEach((p, i) => {
                                x.push(p.ppm);
                                y.push(p.intensity);
                            });
                            sd = SD.fromXY(x, y, {frequency: frequency});
                            data = sd.toJcamp();
                        }
                    }
                } else {
                    data = fs.readFileSync(path.join(pathOfJcamp, spectrum.filename), 'base64');
                }
                if (!data) throw new Error('there is not data for an attachment');
                let attachment = {
                    reference: accession + '_' + e.spectrum_id,
                    data: data,
                    jpath: ['spectra', 'nmr'],
                    'content_type': 'chemical/x-jcamp-dx',
                    filename: accession + '_' + e.spectrum_id + '.jdx',
                    metadata: spectrum,
                    field: 'jcamp',
                }
                nmr.push(attachment);
                withSpectra++
            }
        }
    });
    // nmr.forEach(n => console.log(Object.keys(n)))
    count++
})

console.log(count)
console.log(withSpectra)
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
            result = peaks.map((peak) => ({x: peak['chemical-shift'], intensity: peak['intensity']}));
        }
        return result;
    }
}

function readNmrPeakList(peakListData) {
    let {
        assignments,
        multiplets,
        peaks
    } = peakListData;
    
    let ranges = [];
    if (multiplets) {
        multiplets.forEach(m => {
            let range = {};
            let signal = {};
            if (m.range) {
                let fromTo = m.range.split('|');
                if (fromTo.length === 2) {
                    var [from, to] = fromTo;
                } else {
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
    if (ranges.length === 0 && peaks) {
        let peakList = peaks.map((peak) => {
            let result = {};
            if (peak['shift-ppm']) result.ppm = peak['shift-ppm'];
            if (peak['shift-hz']) result.frequency = peak['shift-hz'];
            if (peak['height']) result.intensity = peak['height'];
            return result;
        })
        ranges = {peaks: peakList};
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