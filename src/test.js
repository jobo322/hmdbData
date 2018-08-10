const fs = require('fs');
const path = require('path');
const xmlReader = require('xmlreader');
const xml2Json = require('xml2json')

const pathToRead = '/home/abolanos/hmdbProject/hmdb_nmr_spectra_just_one';
const pathToReadJson = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData';
const pathToReadFID = '/home/abolanos/hmdbProject/hmdb_fid_files_extracted';
var counter = 1
var counterWithoutR = 0;
// @TODO: avoid != 1H
let listWithNmrData = {};
getListNmrSpectra(pathToRead, listWithNmrData);
console.log(listWithNmrData)
return
var listFidFiles = createListFromPath(pathToReadFID);

// fs.open('listNmrSpectra.json','w',(err, fd) => {
//     if (err) throw err;
//     fs.write(fd, JSON.stringify(listWithNmrData), (err) => {if(err) throw err; fs.closeSync(fd)})
// })
// return
let listOrphan = {}
fs.readdir(pathToReadJson, (err, result) => {// will be a jsZip instance
    if (err) throw err;
    result.forEach((e, i) => {

        let file = fs.readFileSync(path.join(pathToReadJson, e));
        console.log(e)
        let dataJson = JSON.parse(file);

        let accession = dataJson.accession;
        let spectra = dataJson.spectra;
        spectra.forEach((spectrum, i) => {
            if (spectrum.type.slice(8).toLowerCase() !== 'nmroned') return;
            let spectrumId = spectrum.spectrum_id;
            if (!listWithNmrData[accession]) {
                console.log(accession)
                searchForFolder(accession)
            } else {
                let dataAccession = listWithNmrData[accession];
                if (!dataAccession[spectrumId]) {
                    console.log(accession, spectrumId);
                    return
                }
                let spectraData = dataAccession[spectrumId];
                console.log(spectraData)
            }
        })
    })
})

function searchForFolder(accession) {
    return null
}
function getListNmrSpectra(pathToRead, listWithNmrDacontentta = {}) {
    let result = fs.readdirSync(pathToRead);
    result.forEach((e, i) => { 
        let file = fs.readFileSync(path.join(pathToRead, e), {encoding: 'utf8', flag: 'r'});
        console.log(xml2Json.toJson(file))
        // xmlReader.read(file, (err, result) => {
        //     for (let key in result) {
        //         if (key === 'text') continue
        //         let content = result[key];
        //         let databaseId = content['database-id'].text();
        //         if (!content['references']) {
        //             console.log('withoutReference')
        //             return
        //         } else if (!content['references'].reference) {
        //             counterWithoutR++;
        //             // console.log('voy' + String(counter++))
        //             return
        //         }
                
        //         if (!listWithNmrData[databaseId]) listWithNmrData[databaseId] = {}
        //         content['references'].reference.each((index, element) => {
        //             let db = getText(element, 'database');
        //             let spectrumID = getText(element, 'spectra-id')
        //             let tempDatabaseId = listWithNmrData[databaseId];
        //             tempDatabaseId[spectrumID] = {
        //                 database: db,
        //                 databaseId: getText(element, 'database-id'),
        //                 refText: getText(element, 'ref-text'),
        //                 structureId: getText(content, 'structure-id'),
        //             }
        //         })
        //     }
        // })
    })
    // function getText(content, key) {
    //     return content[key].text();
    // }
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