const fs = require('fs');
const path = require('path');
const papa = require('papaparse');

var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'

let possiblePeaksHeaders = ['no.', 'no', 'hz', '(hz)', 'ppm', '(ppm)', 'height'];
let possibleMultipletsHeaders = ['no.', 'no', 'hs', 'type', 'atom1', 'multiplet1', 'ppm', '(ppm)', 'atom','multiplet'];
let possibleAssignmentsHeaders  = ['no.', 'no', 'atom', 'multiplet'];

let possibleHeaders = reduceHeaders([possiblePeaksHeaders, possibleMultipletsHeaders,possibleAssignmentsHeaders]);
let possibleDescriptors = ['multiplets', 'mulitplets', 'muliplets', 'peaks', 'assignments', 'assignment', 'assignements', 'assignement']
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
        temp.text = original;

        peakListData = peakListData.replace(/[ ]+\.\.[ ]+/g, '-');
        if (peakListData.indexOf('\t') !== -1) {
            peakListData = peakListData.replace(/[ ]*\t+[ ]*/g, ';');
        } else {
            peakListData = peakListData.replace(/\n[ ]+/g,'\n');
            peakListData = peakListData.replace(/[ ]+/g, ';');
        }
        if (peakListData[peakListData.length - 1] === '\n') peakListData = peakListData.slice(0, peakListData.length - 1)

        var result = peakListData.replace(/\n{1,}/g, '\n').split('\n');
        var hasTable = result.some((aa) => aa.replace(/[ ]+/g, ' ').toLowerCase().split(' ').some(checkForDescriptors))
        if (splitFileName[0] === 'HMDB0000394') console.log(result)
        if (hasTable) {
            // return
            let descriptorExist = false;
            let headersExist = false;
            let headers = [];
            let descriptor = [];

            result.forEach((e,i,arr) => {
                e = e.replace(/\;$/, '');
                hasTable = e.replace(/[ ]+/g, ' ').toLowerCase().split(' ').some(checkForDescriptors);
                if (hasTable) {
                    descriptorExist = true;
                    headersExist = false;
                    descriptor = e.toLowerCase().replace(/[ ]+/g, ' ').split(' ').filter(checkForDescriptors);
                    temp[descriptor[0]] = [];
                } else if (headersExist === descriptorExist && checkForHeaders(e.toLowerCase().split(';'), possibleHeaders)) {
                    descriptorExist = true;
                    descriptor = ['peaks'];
                    temp[descriptor[0]] = [];
                }
                // if (splitFileName[0] === 'HMDB0000394') console.log(descriptor)
                var eSplited = e.split(';');
                if (eSplited.length > 1 && descriptorExist) {
                    // if (splitFileName[0] === 'HMDB0000394') console.log(e)
                    
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
            if (splitFileName[0] === 'HMDB0000394') console.log(temp)
            // console.log(JSON.stringify(temp))
            // console.log(result.length)
            // if (result.length === 1) {
            //     console.log('\n\nEL NOMBRE ES ' + file)
            //     console.log(JSON.stringify(peakListData))
            //     console.log('\n\n' + JSON.stringify(original))
            // }
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
                    // console.log(toExport)
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
        // if (splitFileName[0] === 'HMDB0000394') console.log(temp)
        checkData(temp,splitFileName[0],splitFileName[2])
    })
    fs.writeFileSync('export.json', JSON.stringify(resultJson))
    console.log('counter ' + String(counter))
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
    } else if (keys.length > 2) {
        if (keys.length < 4) console.log(name, id, '  it has not somethings');    
        let filterKeys = keys.filter(checkForDescriptors)
        if (filterKeys.length !== keys.length - 1) console.log(name, id, '  it has not somethings');        
    }
}