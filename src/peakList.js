const fs = require('fs');
const path = require('path');
const papa = require('papaparse');

// var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
var pathNmrPeakList = '/home/abolanos/hmdbProject/peakListWrong/';
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'

let possiblePeaksHeaders = ['no.', 'no', 'hz', '(hz)', 'ppm', '(ppm)', 'height'];
let possibleMultipletsHeaders = ['no.', 'no', 'hs', 'type', 'atom1', 'multiplet1', 'ppm', '(ppm)', 'j (hz)','shift1 (ppm)', 'atom','multiplet'];
let possibleAssignmentsHeaders  = ['vno.','no.', 'no', 'atom', 'multiplet', 'exp. shift (ppm)'];

let possibleHeaders = reduceHeaders([possiblePeaksHeaders, possibleMultipletsHeaders,possibleAssignmentsHeaders]);
let possibleDescriptors = ['multiplets', 'peaks', 'assignments', 'mulitplets', 'muliplets','nultiplets','mnltiplets', 'mutiplets', 'multuplets', 'assignmentrs', 'assignment', 'assignements', 'assignmets','assignement']
let existedHeaders = [];

fs.readdir(pathNmrPeakList, (err, listDir) => {
    var resultJson = {};
    var counter = 0
    listDir.forEach((file) => {
        if (file.toLowerCase().match('nmrtwod')) return

        let splitFileName = file.split('_');
        if (!resultJson[splitFileName[0]]) resultJson[splitFileName[0]] = {};
        resultJson[splitFileName[0]][splitFileName[2]] = {};
        var temp = resultJson[splitFileName[0]][splitFileName[2]];

        var peakListData = fs.readFileSync(path.join(pathNmrPeakList, file), 'utf8');
        var dataLowerCase = peakListData.toLowerCase();
        var original = String(peakListData) // for debug
        
        //looking for ranges and save it
        peakListData = peakListData.replace(/[\t| ]+([0-9]+\.*[0-9]*)[\t| ]+\.{2}[\t| ]+([0-9]+\.*[0-9]*)/g, '\t$1-$2');
        peakListData = peakListData.replace(/\((\w+)\)(?=[\t| ]*)/g, '$1');
        console.log(peakListData)
        return
        if (peakListData.indexOf('\t') !== -1) {
            peakListData = peakListData.replace(/[ ]*\t+[ ]*/g, ';');
        } else {
            peakListData = peakListData.replace(/\n[ ]+/g,'\n');
            peakListData = peakListData.replace(/[ ]+/g, ';');
        }
        
        if (peakListData[peakListData.length - 1] === '\n') peakListData = peakListData.slice(0, peakListData.length - 1);

        var result = peakListData.replace(/\n{1,}/g, '\n').split('\n');
        var hasTable = result.some((aa) => aa.replace(/[ ]{2,}/g, ' ').toLowerCase().split(' ').some(checkForDescriptors));
        // if (splitFileName[0] === 'HMDB0000857' && splitFileName[2] === '1569') console.log(result)
        if (hasTable) {
            // return
            let descriptorExist = false;
            let headersExist = false;
            let headers = [];
            let descriptor = [];

            result.forEach((e,i,arr) => {
                e = e.replace(/[ ]{2,}/g, ' ').replace(/\;$/, '');
                hasTable = e.toLowerCase().split(' ').some(checkForDescriptors);
                if (hasTable) {
                    descriptorExist = true;
                    headersExist = false;
                    descriptor = e.toLowerCase().split(' ').filter(checkForDescriptors);
                    temp[descriptor[0]] = [];
                } else if (headersExist === descriptorExist && checkForHeaders(e.toLowerCase().split(';'), possibleHeaders)) {
                    descriptorExist = true;
                    descriptor = ['peaks']; // todo: hacer que sea mas robusto
                    temp[descriptor[0]] = [];
                }
                // if (splitFileName[0] === 'HMDB0000394') console.log(descriptor)
                var eSplited = e.replace(/^[ ]+/,'').replace(/[ ]+$/,'').split(';');
                // if (splitFileName[0] === 'HMDB0061883') console.log(JSON.stringify(original))
                if (eSplited.length > 1 && descriptorExist) {
                    // if (splitFileName[0] === 'HMDB0000056' && splitFileName[2] === '1058') console.log(e)
                    
                    if (!headersExist) {
                        headersExist = true;
                        headers = eSplited;
                    } else if (headersExist) {
                        let toExport = {}
                        headers.forEach((head, i) => {
                            toExport[head] = eSplited[i] || '-';
                        })
                        temp[descriptor[0]].push(toExport)
                    }
                }
            })
        } else {
            let firstExist = false;
            let secondExist = false;
            var firstHeader, secondHeader, indexFrequency, toExport;
            result.forEach((e, i, arr) => {
                var eSplited = e.split(';');
                if (secondExist) {
                    if (eSplited.length < firstHeader.length + secondHeader - 1) console.warn('data has not all data');
                    toExport = {}, index = 0;
                    eSplited.forEach((value, i) => {
                        toExport[firstHeader[i]] = value
                    })
                    temp['peaks'].push(toExport)
                } else if (e.toLowerCase().indexOf('address') !== -1) {
                    firstExist = true;
                    secondExist = false;
                    if (eSplited.length < 2) throw new Error('parsing of headers has been problematic');
                    firstHeader = eSplited.map(ee => ee.toLowerCase().replace(/[ ]+/g, ' '));
                } else if (e.toLowerCase().indexOf('hz') !== -1) {
                    secondExist = true;
                    if (!firstExist) { // there is not the first line just No. hz ppm Height
                        if (eSplited.length <= 2) throw new Error('parsing of headers has been problematic');
                        firstHeader = eSplited.map(ee => ee.toLowerCase().replace(/[ ]+/g, ' '));
                        indexFrequency = Number.MAX_SAFE_INTEGER;
                    } else {
                        secondHeader = eSplited.map(ee => ee.toLowerCase().replace(/[ ]+/g, ' '));
                        indexFrequency = firstHeader.indexOf('frequency');
                        firstHeader.splice(indexFrequency, 1, ...secondHeader);
                        firstHeader.splice(0,0,'no.');
                        firstHeader[firstHeader.length - 1] = 'height';
                    }
                    temp['peaks'] = [];
                }
            })
        }
        // let headers = Object.keys(temp[][0])
        // if (headers.indexOf('Table of PeaksNo.') !== -1) console.log(splitFileName[0], splitFileName[2])
        // if (headers.indexOf('Multiplet1 (ppm)') !== -1) console.log(splitFileName[0], splitFileName[2])
        // Object.keys(temp).forEach(d => {
        //     let headers = Object.keys(temp[d][0])
        //     existedHeaders.push(...headers.filter((header) => {
        //         return !existedHeaders.some((eh) => {
        //             return eh === header
        //         })
        //     }))
        // })
        checkData(temp,splitFileName[0],splitFileName[2])
        temp.text = original;
    })
    fs.writeFileSync('export.json', JSON.stringify(resultJson))
    console.log(existedHeaders)
})

function checkForHeaders(splitedLine, possibleHeaders, options = {}) {
    // console.log(possibleHeaders)
    let justCheck = options.justCheck || false;
    let result = splitedLine.some((e) => possibleHeaders.some((ee) => ee === e))
    if (!justCheck) {
        // TODO
    }
    return result
}

function checkForDescriptors(linePart) {
    return possibleDescriptors.some((ee) =>  ee === linePart)
}

function reduceHeaders(vectors) {
    if (!Array.isArray(vectors)) throw new Error('reduceHeaders: argument should be an Array');
    let result = {};
    vectors.forEach((vector) => {
        if (!Array.isArray(vector)) throw new Error('reduceHeaders: argument should be an Array');
        vector.forEach((e) => {
            if (!result[e]) result[e] = '';
        })
    }) 
    return Object.keys(result);
}

async function checkData(peakData, name, id) {
    let keys = Object.keys(peakData);
    if (!peakData.hasOwnProperty('peaks')) {
        console.log(name, id, '  it has not peaks')
    } else if (keys.length > 1) {
        if (keys.length < 3) console.log(name, id, '  it has not somethings');    
        let filterKeys = keys.filter(checkForDescriptors)
        if (filterKeys.length !== keys.length) console.log(name, id, '  it has not somethings');        
        let hasProblemsWithHeaders = Object.keys(peakData).some((d) => {
            let headers = Object.keys(peakData[d][0])
            let counter = 0;
            headers.forEach((header) => {
                header = header.toLowerCase();
                if(possibleHeaders.some((eh) => {
                    return eh === header
                })) {
                    counter++
                }
            })
            // // if (name === 'HMDB0061883' && id === '1409') {
            //     console.log(counter,headers.length)
            //     if (counter !== headers.length) {
            //         console.log(headers)
            //     }
            // }
            return counter !== headers.length
        })
        if (hasProblemsWithHeaders) console.log(name, id, '  it has strange things with headers');
    }   
}