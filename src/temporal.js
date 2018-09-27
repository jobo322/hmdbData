const fs = require('fs');
const path = require('path');
const peakTablesReader = require('./reader/peakList.js');
// var pathMetaboliteMetadata = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData/';
// var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
// var pathFidFiles = '/home/abolanos/hmdbProject/hmdb_fid_files/';
// var pathNmrSpectra = '/home/abolanos/hmdbProject/hmdb_nmr_spectra/';
// var pathToSaveJSON = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData'

var pathMetaboliteMetadata = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_metabolite_json\\metaboliteWithNmrData'
var pathNmrPeakList = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists';
var pathOfJcamp = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_jcamp';
var pathNmrSpectra = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_spectra';

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
    let accession = fileName.replace(/\.\w+/,'')
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
    jsonResult = getData(pathToMetadata, result);
    jsonResult.isExperimental = false;
    jsonResult.hasMultiplets = false;
    jsonResult.hasPeakList = false;
    spectra.some((e, i, arr) => {
        if (e.type.slice(8).toLowerCase() === 'nmroned') {
            var entry;
            let exist = false
            if (listOfJcamp.hasOwnProperty(accession)) {
                entry = listOfJcamp[accession][e.spectrum_id];
                if (entry) {
                    jsonResult.isExperimental = true
                    exist = true;
                    // arr[i].jcamp = path.join(listFidFiles, entry.fileName.replace(/\.*/, '.jdx'))
                }
            } else if (listNmrSpectra.hasOwnProperty(accession)) {
                entry = listNmrSpectra[accession][e.spectrum_id]
                if (entry) {
                    exist = true;
                    jsonResult.hasPeakTable = true
                    // let spectraDataFile = fs.readFileSync(path.join(pathNmrSpectra, entry.fileName), 'utf8');
                    // let spectraData = xmlParser.toJson(spectraDataFile);
                    // console.log(spectraData)
                }
            }
            if (listNmrPeakFiles.hasOwnProperty(accession)) {
                entry = listNmrPeakFiles[accession][e.spectrum_id];
                if (entry) {
                    exist = true;
                    jsonResult.hasMultiplets = true
                    var peakListData = peakTablesReader({base: entry.fileName, dir: pathNmrPeakList});
                    // console.log(peakListData)
                    readNmrPeakList(peakListData);
                }
            }
            if (exist) {
                withSpectra++
                return true
            }
        }
    });
    count++
})

console.log(count)
console.log(withSpectra)

function readNmrPeakList(peakListData) {
    let {
        assignments,
        multiplets,
        peaks
    } = peakListData;
    
    if (multiplets) {
        multiplets.forEach(m => {
            let range = {};
            let signal = {};
            if (m.range) {
                let fromTo = m.range.split('|');
                if (fromTo) var [from, to] = fromTo;
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
            

            range.signal = [signal]
            console.log(range)
        })
        
        // if (assignments) {
        //     if (!signal.pubAsignment && assignments['atom']) {
        //         let atomSplited = assignments['atom'].split('|');
        //         signal.nbAtoms = atomSplited.length;
        //         signal.pubAsignment = atomSplited
        //     }
        // }
        
        // if (peaks) {

        // }
        
        // if (!signal.nbAtoms && multiplets['hs'] !== undefined) {
            
        // }
    }
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

function mayBeAdd(path, obj, options) {
    let {
        value = '',
        name,
        id
    } = options;
    let tmp = obj;
    path.forEach(p => {
        tmp = tmp[p]
        if (!tmp) tmp[p] = {};
    })
    if (obj.hasOwnProperty(key)) {
        console.log(name, id, 'the descriptor with name -' + key+ '- exist')
    } else {
        obj[key] = value
    }
}

async function parseChildren(children, result) { // @TODO: review some problems with empty properties
    children.forEach((e, i, array) => {
        if (!e.$name) return;
        if (!Array.isArray(result)) {
            if (e.hasOwnProperty('$text')) {
                result[e.$name] = e.$text;
            } else {
                result[e.$name] = [];
                parseChildren(e.$children, result[e.$name]);
            }
        } else {
            if (e.hasOwnProperty('$text')) {
                result.push(e.$text);
            } else {
                result.push({});
                parseChildren(e.$children, result[result.length -1]);
            }
        }
    })
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