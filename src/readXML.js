const fs = require('fs');
const path = require('path');
const XmlStream = require('xml-stream');
const xmlParser = require('xml2json');

var pathMetaboliteMetadata = '/home/abolanos/hmdbProject/';
var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
var pathFidFiles = '/home/abolanos/hmdbProject/hmdb_fid_files/';
var pathNmrSpectra = '/home/abolanos/hmdbProject/hmdb_nmr_spectra/';

//create a list of nmr files to import with the metadata
var listFidFiles = createListFromPath(pathFidFiles);
var listNmrPeakFiles = createListFromPath(pathNmrPeakList);
var listNmrSpectra = createListFromPath(pathNmrSpectra, {
    pId: 5,
    pDimension: [1,2,3]
});

var stream = fs.createReadStream(pathMetaboliteMetadata + 'urine_metabolites.xml');
// var file = fs.createWriteStream('/home/abolanos/text'); // @TODO: create a write stream to avoid possible issues with fs.write method
var xmlStream = new XmlStream(stream);

var fd = fs.openSync('metabolite.txt', 'a');
var count = 0

xmlStream.on('endElement: metabolite', async (metabolite) => {
    // if (count > 0) return//for debug
    let accession = metabolite['accession'].$text;
    
    let result = {};
    await parseChildren(metabolite.$children, result);

    var spectra = result['spectra'];
    if (!spectra) {
        console.warn('Accession: ' + accession + ' has not spectra');
        return
    }

    spectra.forEach((e, i, arr) => {
        if (e.type.toLowerCase().match('nmr')) {
            var entry;
            if (listNmrPeakFiles.hasOwnProperty(accession)) entry = listNmrPeakFiles[accession][e.spectrum_id];
            if (entry) {
                // readNmrPeakList(pathNmrPeakList, entry.fileName, arr[i])
            } else if (listNmrSpectra.hasOwnProperty(accession)) {
                entry = listNmrSpectra[accession][e.spectrum_id]
                if (entry) {
                    let spectraDataFile = fs.readFileSync(path.join(pathNmrSpectra, entry.fileName), 'utf8');
                    let spectraData = xmlParser.toJson(spectraDataFile);
                }
            }
            if (listFidFiles.hasOwnProperty(accession)) {
                entry = listFidFiles[accession][e.spectrum_id];
                if (entry) {
                    arr[i].jcamp = path.join(listFidFiles, entry.fileName)
                }
            }
        }
    });
    
    if (count === 0) {
        prefix = '[';
    } else {
        prefix = ',';
    }
    fs.write(fd, prefix + JSON.stringify(result), handdleError);
    // fs.close(fd, (err) => console.log(err))//for debug
    count++
});

xmlStream.preserve('metabolite');
xmlStream.on('end', () => {
    fs.write(fd, ']', handdleError);
    fs.close(fd, handdleError);
}); //uncomment for final use

async function readNmrPeakList() {

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