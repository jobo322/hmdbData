const fs = require('fs');
const path = require('path');
const XmlStream = require('xml-stream');

var pathMetaboliteMetadata = '/home/abolanos/hmdbProject/';
var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
var pathFidFiles = '/home/abolanos/hmdbProject/hmdb_fid_files/';

//create a list of nmr files to import with the metadata
var listFidFiles = createListFromPath(pathFidFiles);
var listNmrPeakFiles = createListFromPath(pathNmrPeakList);

var stream = fs.createReadStream(pathMetaboliteMetadata + 'urine_metabolites.xml');
// var file = fs.createWriteStream('/home/abolanos/text'); // @TODO: create a write stream to avoid possible issues with fs.write method
var xmlStream = new XmlStream(stream);

// var fd = fs.openSync('metabolite.txt', 'a');
var count = 0 //for debug
xmlStream.on('endElement: metabolite', async (metabolite) => {
    // if (count > 0) return//for debug
    let accession = metabolite['accession'].$text;
    let nmrPeakListFiles = listNmrPeakFiles[accession];
    if (!nmrPeakListFiles) return;
    let result = {};
    await parseChildren(metabolite.$children, result);

    let spectra = result['spectra']
    if (!spectra) {
        console.log(accession)
        return;
    }
    return
    spectra.forEach((e, i, arr) => {
        if (e.type.toLowerCase().match('nmr')) {
            let entry = listNmrPeakFiles[accession][e.spectrum_id];
            if (!entry) {
                console.log(accession)
                console.log(e)
                // console.log(accession, e.spectrum_id, listNmrPeakFiles[accession])
            }
            // readNmrPeakList(pathNmrPeakList, e.spectrum_id,
        }
    })
    if (count === 0) {
        prefix = '[';
    } else {
        prefix = ',';
    }
    // fs.write(fd, prefix + JSON.stringify(result), handdleError);
    // fs.close(fd, (err) => console.log(err))//for debug
    count++//for debug
});

xmlStream.preserve('metabolite');
// xmlStream.on('end', () => {
//     fs.write(fd, ']', handdleError);
//     fs.close(fd, handdleError);
// }); //uncomment for final use

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

function createListFromPath(path) {
    var list = fs.readdirSync(path)
    var result = {};
    list.forEach((e) => {
        let temp = e.split('_');
        let accession = temp[0];
        let dimension = temp[1];
        let id = temp[2];
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