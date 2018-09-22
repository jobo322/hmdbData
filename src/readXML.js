const fs = require('fs');
const path = require('path');
const XmlStream = require('xml-stream');

return
// var pathMetaboliteMetadata = '/home/abolanos/hmdbProject/';
// var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
// var pathFidFiles = '/home/abolanos/hmdbProject/hmdb_fid_files/';
// var pathNmrSpectra = '/home/abolanos/hmdbProject/hmdb_nmr_spectra/';
// var pathToSaveJSON = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData'

// var pathMetaboliteMetadata = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject'
// var pathNmrPeakList = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists';
// var pathFidFiles = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_fid_files';
// var pathNmrSpectra = 'C:\\Users\\JuanCBA\\Documents\\hmdbProject\\hmdb_nmr_spectra';
// var pathToSaveJSON = '/home/abolanos/hmdbProject/hmdb_metabolite_json/metaboliteWithNmrData'
// console.log(pathMetaboliteMetadata)
// // console.log(fs.readdirSync(pathMetaboliteMetadata))
// return

// // fs.readdir(pathToSaveJSON, (err, result) => {
// //     if (err) throw err;
// //     result.forEach((e, i) => {

// //     })
// // })

// //@TODO: check if you can to pause the streaming while the metabolite is doing
// //create a list of nmr files to import with the metadata
// // var listFidFiles = createListFromPath(pathFidFiles);
// // var listNmrPeakFiles = createListFromPath(pathNmrPeakList);
// // var listNmrSpectra = createListFromPath(pathNmrSpectra, {
// //     pId: 5,
// //     pDimension: [1,2,3]
// // });
// // console.log(listFidFiles)
// // return
// var stream = fs.createReadStream(pathMetaboliteMetadata + 'urine_metabolites.xml');

// var xmlStream = new XmlStream(stream);

// var count = 0;
// var withSpectra = 0;
// xmlStream.on('endElement: metabolite', async (metabolite) => {
    
//     // if (count > 0) return//for debug
//     let accession = metabolite['accession'].$text;
//     let result = {}, jsonResult = {};
//     await parseChildren(metabolite.$children, result);

//     var spectra = result['spectra'];
//     if (!spectra) {
//         console.warn('Accession: ' + accession + ' has not spectra');
//         return
//     } else if (!spectra.some((e, i) => {
//         return e.type.slice(8).toLowerCase() === 'nmroned'
//     })){
//         return
//     }

//     // spectra.some((e, i, arr) => {
//     //     if (e.type.slice(8).toLowerCase() === 'nmroned') {
//     //         var entry;
//     //         let exist = false
//     //         if (listFidFiles.hasOwnProperty(accession)) {
//     //             entry = listFidFiles[accession][e.spectrum_id];
//     //             if (entry) {
//     //                 exist = true;
//     //                 // arr[i].jcamp = path.join(listFidFiles, entry.fileName.replace(/\.*/, '.jdx'))
//     //             }
//     //         } else if (listNmrSpectra.hasOwnProperty(accession)) {
//     //             entry = listNmrSpectra[accession][e.spectrum_id]
//     //             if (entry) {
//     //                 exist = true;
//     //                 // let spectraDataFile = fs.readFileSync(path.join(pathNmrSpectra, entry.fileName), 'utf8');
//     //                 // let spectraData = xmlParser.toJson(spectraDataFile);
//     //             }
//     //         }
//     //         if (listNmrPeakFiles.hasOwnProperty(accession)) {
//     //             entry = listNmrPeakFiles[accession][e.spectrum_id];
//     //             if (entry) {
//     //                 exist = true;
//     //                 // var peakListData = fs.readFileSync(path.join(pathNmrPeakList, entry.fileName))
//     //                 // console.log(peakListData)
//     //                 // readNmrPeakList(pathNmrPeakList, entry.fileName, arr[i])
//     //             }
//     //         }
//     //         if (exist) {
//     //             withSpectra++
//     //             return true
//     //         }
//     //     }
//     // });

//     // let fd = fs.openSync(path.join(pathToSaveJSON, accession + '.json'), 'w')
//     // fs.write(fd, JSON.stringify(result), (err) => {
//     //     fs.close(fd, handdleError)
//     // });
//     count++
// });

// xmlStream.preserve('metabolite');
// xmlStream.on('end', () => {
//     console.log(count)
//     console.log(withSpectra)
// }); 

// async function parseChildren(children, result) { // @TODO: review some problems with empty properties
//     children.forEach((e, i, array) => {
//         if (!e.$name) return;
//         if (!Array.isArray(result)) {
//             if (e.hasOwnProperty('$text')) {
//                 result[e.$name] = e.$text;
//             } else {
//                 result[e.$name] = [];
//                 parseChildren(e.$children, result[e.$name]);
//             }
//         } else {
//             if (e.hasOwnProperty('$text')) {
//                 result.push(e.$text);
//             } else {
//                 result.push({});
//                 parseChildren(e.$children, result[result.length -1]);
//             }
//         }
//     })
// }

// function createListFromPath(path, options = {}) {
//     var {
//         pAccession = 0,
//         pDimension = [1],
//         pId = 2
//     } = options;
//     var list = fs.readdirSync(path);
//     var result = {};
//     list.forEach((e) => {
//         let temp = e.split('_');
//         let accession = temp[pAccession];
//         let dimension = pDimension.map((e) => temp[e]).join('');
//         let id = String(temp[pId]).replace(/\.xml/, '');
//         if (!result[accession]) result[accession] = {};
//         let entry = result[accession];
//         entry[id] = {
//             dimension: dimension === 'nmroned' ? 1 : 2,
//             fileName: e
//         }
//     })
//     return result;
// }

// function handdleError(err) {
//     if (!err) return;
//     throw err
// }
