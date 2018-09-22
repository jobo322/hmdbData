const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const levenshtein = require('fast-levenshtein');
const splitter = require('./splitter/splitLine');
const regexpByPair = require('./splitter/regexpByPair');
const preprocess = require('./splitter/preprocess');

// var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
// var pathNmrPeakList = '/home/abolanos/hmdbProject/peakListWrong/';
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'
var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\peakListWrong'

const constHeaders = {
    peaks: ['no','shift-hz', 'shift-ppm', 'height'],
    multiplets: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],
    assignments: ['no','atom', 'exp-shift-ppm', 'shift-ppm', 'multiplet']
}
const possibleSignalType = ['m', 's', 'd', 't', 'dd', 'dddd','dt', 'q','qq', 'p', 'pent', 'spt','quint', 'quin','br. s.', 'dq','qd','td', 'tq','dd', 'ddd', 'tt', 'sext','sxt', 'hex', 'sept', 'hept', 'oct', 'non', 'none', 'qt'];

const possibleHeaders = reduceHeaders(constHeaders);
const regexHeaders = new RegExp(possibleHeaders.join('|').replace(/\./g,'\.'), 'g');

const possibleDescriptors = ['multiplets', 'peaks', 'assignments']
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
        if (splitFileName[0] === 'HMDB0001901' || splitFileName[0] === 'HMDB0000292') return
        var peakListData = fs.readFileSync(path.join(pathNmrPeakList, file), 'utf8');
        var dataLowerCase = peakListData.toLowerCase();
        var original = String(peakListData); // for debug
        
        peakListData = preprocess.general(peakListData);
        
        if (peakListData.toLowerCase().indexOf('address') === -1) {
            peakListData = preprocess.protonic(peakListData);
            let headers = [];
            let descriptor = [];
            
            peakListData.split('\n').some((e,i,arr) => {
                let r = e.replace(/\s+/g, '').match(regexHeaders) || [];
                if (r.length > 1) {
                    headers = r;
                    descriptor = getDescriptorFromHeaders(headers, constHeaders, splitFileName);
                    if (compareHeaders(r, constHeaders[descriptor], splitFileName) > 2) return
                    if (descriptor) descriptorExist = true;
                    let exist = mayBeAdd(descriptor, temp,  {value: [], name: splitFileName[0], id: splitFileName[2]});
                    if (exist) return;
                } else {
                    let lineSplited = splitter.splitDataLine(e, headers, descriptor, regexpByPair);
                    if (!lineSplited || lineSplited.length === 1) return;
                    let result = {}
                    // if (lineSplited.length !== headers.length) {
                    //     // console.log(splitFileName[0], splitFileName[2])
                    //     // console.log(JSON.stringify(e))
                    //     // console.log(headers)
                    //     // console.log(lineSplited)
                    // }
                    headers.forEach((head, i) => {
                        result[head] = lineSplited[i];
                    });
                    let review = checkLine(result, headers, descriptor, splitFileName[0], splitFileName[2])
                    if (review) {
                        console.log(splitFileName[0], splitFileName[2]);
                        console.log(JSON.stringify(e))
                        console.log(lineSplited)
                        console.log(result)
                        return 
                    }
                    if (Array.isArray(descriptor)) {
                        console.log(splitFileName[0], splitFileName[2]);
                        console.log(JSON.stringify(e))
                    }
                    temp[descriptor].push(result)
                }
            })
        } else {
            let firstExist = false;
            let secondExist = false;
            var firstHeader, secondHeader, indexFrequency, toExport;
            peakListData = peakListData.replace(/[ ]{2,}|[ ]*\t+[ ]*/g, ';');
            peakListData.split('\n').some((e, i, arr) => {
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
                    if (eSplited.length < 2) {
                        throw new Error('parsing of headers has been problematic');
                    }
                    firstHeader = eSplited.map(ee => ee.toLowerCase().replace(/[ ]+/g, ' '));
                } else if (e.toLowerCase().indexOf('hz') !== -1) {
                    secondExist = true;
                    if (!firstExist) { // there is not the first line just No. hz ppm Height
                        if (eSplited.length <= 2) {
                            throw new Error('parsing of headers has been problematic');
                        }
                        firstHeader = eSplited.map(ee => ee.toLowerCase().replace(/[ ]+/g, ' '));
                        indexFrequency = Number.MAX_SAFE_INTEGER;
                    } else {
                        secondHeader = eSplited.map(ee => ee.toLowerCase().replace(/(hz|ppm)/, 'shift-$1'));
                        indexFrequency = firstHeader.indexOf('frequency');
                        firstHeader.splice(indexFrequency, 1, ...secondHeader);
                        firstHeader.splice(0,0,'no');
                        firstHeader[firstHeader.length - 1] = 'height';
                    }
                    mayBeAdd('peaks', temp,  {value: [], name: splitFileName[0], id: splitFileName[2]});
                }
            })
        }
        
        checkBulkData(temp,splitFileName[0],splitFileName[2])
        temp.text = original;
    })
    fs.writeFileSync('export.json', JSON.stringify(resultJson))
})



function getDescriptorFromHeaders(headers, candidates, splitFileName) {
    let descriptor;
    let minDistance = Number.MAX_SAFE_INTEGER;
    Object.keys(candidates).some((e) => {
        let distance = compareHeaders(headers, candidates[e], splitFileName); //try to normalize choose between multiplets and assignments
        if (minDistance > distance) {
            minDistance = distance;
            descriptor = e;
        }
    })
    return descriptor;
}

function mayBeAdd(key, obj, options) {
    let {
        value = '',
        name,
        id
    } = options;
    if (obj.hasOwnProperty(key)) {
        console.log(name, id, 'the descriptor with name -' + key+ '- exist')
    } else {
        obj[key] = value
    }
}

function checkForHeaders(splitedLine, possibleHeaders) {
    return splitedLine.some((e) => possibleHeaders.some((ee) => ee === e))
}

function compareHeaders(headers, possibleHeaders, splitFileName) {
    let copyHeaders = headers.concat();
    let copyPH = possibleHeaders.concat();
    if (copyPH.length < copyHeaders.length) [copyHeaders, copyPH] = [copyPH, copyHeaders];
    let distance = copyPH.reduce((dist, e) => {
        if (copyHeaders.indexOf(e) === -1) dist++
        return dist
    }, 0);
    return distance;
}

function getHeaders(dataSplited, possibleHeaders, splitFileName, options = {}) {
    let {
        tolerance = 3,
        checked = false
    } = options;
    let isHeaders = false;
    if (!checked) isHeaders = checkForHeaders(dataSplited, possibleHeaders);
    if (checked || isHeaders) {
        headers = []
        dataSplited.forEach(linePart => {
            possibleHeaders.some(ee => {
                let distance = levenshtein.get(ee, linePart);
                // console.log(distance, ee, linePart)
                if (distance < tolerance) headers.push(ee);
                return distance < tolerance;
            })
        })
        if (dataSplited.length !== headers.length) console.log(splitFileName[0], splitFileName[2], ' does not have the same headers length')
        return headers;
    }
}

function reduceHeaders(constHeaders) {
    let vectors = Object.keys(constHeaders).map(e => constHeaders[e]);
    let result = {};
    vectors.forEach((vector) => {
        if (!Array.isArray(vector)) throw new Error('reduceHeaders: argument should be an Array');
        vector.forEach((e) => {
            if (!result[e]) result[e] = '';
        })
    }) 
    return Object.keys(result);
}

function checkLine(element, headers, descriptor, name, id) {
    let fail = false;
    switch (descriptor) {
        case 'peaks':
            return checkForNumbers2(element, name, id, descriptor, 1, headers)
            break;
        case 'multiplets':
            fail = checkForNumbers2(element, name, id, descriptor, 1,  ['no', 'hs']);
            if (fail) return fail;
            let type = element['type'];
            let line;
            if (element['multiplets']) {
                if (!possibleSignalType.some((pt) => {
                    return pt === type;
                })) {
                    // console.log(name, id, 'has not a type in ' + descriptor + ' line ' + '1');
                    return true
                }
            }
            break;
        case 'assignments':
            let temp
            fail = checkForNumbers2(element, name, id, descriptor, 1,  ['no', 'exp-shift-ppm', 'shift-ppm']);
            if (fail) return fail;
            if (element.hasOwnProperty('multiplet')) {
                temp = element.multiplet.replace(/m[0-9]+/g, '');
                if (temp.length !== 0 & temp !== '-') {
                    // console.log(name, id, 'there is not a correct way of multiplet in ' + descriptor + ' line ' + 1)
                    return true
                }
            }
            if (element.hasOwnProperty('atom')) {
                temp = element.atom.match(/[0-9]+[a-z]*/g);
                if (temp.length === 0) {
                    return true
                }
            }
            break;
    }
}

function checkBulkData(peakData, name, id) {
    let keys = Object.keys(peakData);
    if (!peakData.hasOwnProperty('peaks')) {
        console.log(name, id, '  it has not peaks')
    } else if (keys.length > 1) {
        if (keys.length < 3) console.log(name, id, '  it has not somethings');                
        let hasProblemsWithHeaders = Object.keys(peakData).some((d) => {
            let headers = peakData[d][0] ? Object.keys(peakData[d][0]) : []
            let counter = 0;
            headers.forEach((header) => {
                header = header.toLowerCase();
                if(possibleHeaders.some((eh) => {
                    return eh === header
                })) {
                    counter++
                }
            })
            return counter !== headers.length
        })
        if (hasProblemsWithHeaders) console.log(name, id, '  it has strange things with headers');
    }
    keys.forEach((e) => {
        let result
        let data = peakData[e];
        switch (e) {
            case 'peaks':
                result = data[0] instanceof Object;
                if (!result) {
                    console.log(name, id, ' empty descriptor ' + e)
                    return
                }
                let headers = Object.keys(data[0]);
                data.some((element, i) => {
                    return checkForNumbers(element, name, id, e, i, headers)
                });
                break;
            case 'multiplets':
                result = data[0] instanceof Object;
                if (!result) {
                    console.log(name, id, ' empty descriptor ' + e)
                    return
                }
                let fail = false;
                data.some((element, i) => {
                    let toCheckForNumbers = ['no', 'hs', 'shift-ppm','range', 'coupling'].filter(e => {
                        headers.indexOf(e) !== -1)
                    fail = checkForNumbers(element, name, id, e, i,  toCheckForNumbers);
                    if (fail) return fail;
                    let type = element['type'];
                    if (element['multiplet']) {
                        if (!isNaN) return true;
                        if (!possibleSignalType.some((pt, i) => {
                            return pt === type
                        })) {
                            console.log(name, id, 'has not a type in ' + e + ' line ' + i);
                            return true
                        }
                    }
                })
                break;
            case 'assignments':
                result = data[0] instanceof Object;
                if (!result) {
                    console.log(name, id, ' empty descriptor ' + e)
                }
                break;
        }
    })
}

function checkForNumbers2 (element, name, id, key, line, toCheck) {
    return toCheck.some((h) => {
         let d = element[h];
         if (d) {
             if (isNaN(d) && d !== '-') {
                //  console.log(name, id, 'has not a number in ' + key + ' - ' + h + ' line ' + line);
                 return true;
             }
         }
     });
 }
 
function checkForNumbers (element, name, id, key, line, toCheck) {
   return toCheck.some((h) => {
        let info = ''
        let d = element[h];
        if (d) {
            info += JSON.stringify(d);
            info += '\n';
            d = d.split('|')
            for (let j of d) {
                info += JSON.stringify(j);
                info += '\n';
                if (isNaN(j) && j !== '-') {
                    info = name + id + 'has not a number in ' + key + ' - ' + h + ' line ' + line + '\n' + info;
                    console.log(info);
                    return true;
                }
            }
        } else {
            console.log(name, id, 'has not a number in ' + key + ' - ' + h + ' line ' + line + ' with value: ' + d);
        }
    });
}
