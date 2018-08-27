const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const levenshtein = require('fast-levenshtein');

var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
// var pathNmrPeakList = '/home/abolanos/hmdbProject/peakListWrong/';
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\peakListWrong'

const possiblePeaksHeaders = ['no.','shift-hz', 'shift-ppm', 'height'];//['no.', 'no', 'hz', '(hz)', 'ppm', '(ppm)', 'height'];
const possibleMultipletsHeaders = ['no.', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'];//['no.', 'no', 'hs', 'type', 'atom1', 'multiplet1', 'ppm', '(ppm)', 'j (hz)','shift1 (ppm)', 'atom','multiplet'];
const possibleAssignmentsHeaders  = ['no.','atom', 'exp. shift ppm', 'shift ppm', 'multiplet'];
const possibleSignalType = ['m', 's', 'd', 't', 'dd', 'dt', 'q', 'p', 'pent', 'quint', 'quin','br. s.', 'dq','td','dd', 'ddd', 'tt', 'sext', 'hex', 'sept', 'hept', 'oct', 'non', 'none', 'qt'];

const possibleHeaders = reduceHeaders([possiblePeaksHeaders, possibleMultipletsHeaders,possibleAssignmentsHeaders]);
const possibleDescriptors = ['multiplets', 'peaks', 'assignments']//, 'mulitplets', 'muliplets','nultiplets','mnltiplets', 'mutiplets', 'multuplets', 'assignmentrs', 'assignment', 'assignements', 'assignmets','assignement']
let existedHeaders = [];

fs.readdir(pathNmrPeakList, (err, listDir) => {
    var resultJson = {};
    var counter = 0
    listDir.forEach((file) => {
        if (file.toLowerCase().match('nmrtwod')) return

        let splitFileName = file.split('_');
        if (splitFileName[0] !== 'HMDB0000754' && splitFileName[2] !== '1523') return
        if (!resultJson[splitFileName[0]]) resultJson[splitFileName[0]] = {};
        resultJson[splitFileName[0]][splitFileName[2]] = {};
        var temp = resultJson[splitFileName[0]][splitFileName[2]];

        var peakListData = fs.readFileSync(path.join(pathNmrPeakList, file), 'utf8');
        var dataLowerCase = peakListData.toLowerCase();
        var original = String(peakListData); // for debug
        
        //looking for ranges and save it
        peakListData = peakListData.replace(/[\t| ]+([0-9]+\.*[0-9]*)[\t| ]+\.{2}[\t| ]+([0-9]+\.*[0-9]*)/g, '\t$1-$2');
        peakListData = peakListData.replace(/\((\w+)\)(?=[\t| ]*)/g, '$1');
        // peakListData = peakListData.replace(/\n*[N|n]+o\.*[\t| ]+/g,'\nNo.\t');
        peakListData = peakListData.replace(/(m\w+p\w+ts*)\w*\t*\n*([[N|n]+o\.*])/,'$1\n$2');
        peakListData = peakListData.replace(/[ ]*\n*[\t| ]*\n{1,}/g, '\n');
        peakListData = peakListData.replace(/[ ]*\n{1,}[\t| ]*\n*/g, '\n').replace(/([ ]*\n{1,}[ ]*\n*)$/g, '');
        peakListData = peakListData.replace(/[ ]*\t*([A|a]+tom[0-9]*)[ ]*\t*/g, '\t$1\t');
        peakListData = peakListData.replace(/[ ]*\t*([E|e]xp\.*){0,1}[ ]*\t*([S|s]hift[0-9]*)[ ]*\t*([[ppm]+|[Hz]+])[ ]*\t*/g, '\t$1 $2 $3\t');
        peakListData = peakListData.replace(/[ ]{2,}|[ ]*\t+[ ]*/g, ';');
        // if (splitFileName[0] === 'HMDB0000656' && splitFileName[2] === '1458') console.log(peakListData)
        // return
        var result = peakListData.split('\n');
        
        if (peakListData.toLowerCase().indexOf('address') === -1) {
            let descriptorExist = false;
            let headersExist = false;
            let headers = [];
            let descriptor = [];
            result.some((e,i,arr) => {
                e = e.toLowerCase().replace(/([a-zA-Z]+)1/g, '$1');
                e = e.replace(/j hz/, 'coupling');
                e = e.replace(/;hz/, ';shift-hz');
                e = e.replace(/;ppm(?!;)/, ';range');
                e = e.replace(/;ppm(?=;)/,';shift-ppm');
                if (checkForHeaders(e.toLowerCase().split(';'), possibleHeaders)) { // check the function
                    headers = getHeaders(e, possibleHeaders, {separator: ';', checked: true});
                    descriptor = getDescriptorFromHeaders(headers, {
                        'peaks':possiblePeaksHeaders,
                        'multiplets': possibleMultipletsHeaders,
                        'assignments': possibleAssignmentsHeaders
                    }, splitFileName);
                    // if (splitFileName[0] === 'HMDB0000754' && splitFileName[2] === '1523') console.log('the selected descriptor is ' + descriptor)
                    if (descriptor) descriptorExist = true;
                    mayBeAdd(descriptor, temp,  {value: [], name: splitFileName[0], id: splitFileName[2]});
                } else {
                    let lineSplited = splitDataLine(e, headers, descriptor, splitFileName);
                    if (!lineSplited || lineSplited.length === 1) return;
                    if (lineSplited.length !== headers.length) {
                        // console.log(headers)
                        // console.log(lineSplited)
                        console.log(splitFileName[0], splitFileName[2], ' There is some wrong with this')
                    }
                    let result = {}
                    headers.forEach((head, i) => {
                        result[head] = lineSplited[i] || '-';
                    });
                    temp[descriptor].push(result)
                }
            })
        } else {
            // return
            let firstExist = false;
            let secondExist = false;
            var firstHeader, secondHeader, indexFrequency, toExport;
            result.some((e, i, arr) => {
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
                        console.log(splitFileName[0],splitFileName[2])
                        throw new Error('parsing of headers has been problematic');
                    }
                    firstHeader = eSplited.map(ee => ee.toLowerCase().replace(/[ ]+/g, ' '));
                } else if (e.toLowerCase().indexOf('hz') !== -1) {
                    secondExist = true;
                    if (!firstExist) { // there is not the first line just No. hz ppm Height
                        if (eSplited.length <= 2) {
                            console.log(splitFileName[0],splitFileName[2])
                            throw new Error('parsing of headers has been problematic');
                        }
                        firstHeader = eSplited.map(ee => ee.toLowerCase().replace(/[ ]+/g, ' '));
                        indexFrequency = Number.MAX_SAFE_INTEGER;
                    } else {
                        secondHeader = eSplited.map(ee => ee.toLowerCase().replace(/(hz|ppm)/, 'shift-$1'));
                        indexFrequency = firstHeader.indexOf('frequency');
                        firstHeader.splice(indexFrequency, 1, ...secondHeader);
                        firstHeader.splice(0,0,'no.');
                        firstHeader[firstHeader.length - 1] = 'height';
                    }
                    mayBeAdd('peaks', temp,  {value: [], name: splitFileName[0], id: splitFileName[2]});
                }
            })
        }
        // checkData(temp,splitFileName[0],splitFileName[2])
        temp.text = original;
    })
    // fs.writeFileSync('export.json', JSON.stringify(resultJson))
})

function splitDataLine(line, headers, descriptor, splitFileName) {
    let lineSplited;
    switch (descriptor) {
        case 'peaks':
            lineSplited = splitPeakLine(line, headers);
            break;
        case 'multiplets':
            lineSplited = splitMultipletLine(line, headers);
            break;
        case 'assignments':
            lineSplited = splitAssignmentLine(line, headers);
    }
    return lineSplited;
}
function splitPeakLine(line, headers) {
    let lineSplited = line.split(';');
    if (lineSplited.length !== headers.length) {
        line = line.replace(/(\d+)\s+/g,'$1;')
        
        lineSplited = line.split(';');
    }
    return lineSplited;
}

function splitAssignmentLine(line, headers) {
    let lineSplited = line.split(';');
    if (lineSplited.length !== headers.length) {
        line = line.replace(/(\d+)\s+/g,'$1;')
        line = line.replace(/^(\d+);(\d+\.\d+)/g,'$1;-;$2');
        line = line.replace(/;$/,'');
        lineplited = line.split(';');
    }
    return lineSplited;
}
function splitMultipletLine(line, headers) {
    let result = {}
    let lineSplited = line.split(';');
    if (lineSplited.length !== headers.length) { //falta adicionar el caso en que exista '-' y que no exista atom (poco usual)
        line = line.replace(/(m[0-9]+)\s+/, '$1;');
        line = line.replace(/([a-z]+)\s+([0-9]+\.[0-9]+)/g, '$1;$2');
        line = line.replace(/([0-9]+)(?!\.)\s+(m[0-9]+)/g, '$1;$2');
        line = line.replace(/([0-9]+\.[0-9]+)\s+([0-9]+)(?!\.)/g, '$1;$2');
        line = line.replace(/([0-9]+\.[0-9]+)\s+/g, '$1|');
        line = line.replace(/([0-9]+)\s+([a-z]+|\d+(?:\.))/g, '$1;$2'); //works
        // encapsulate the atom assignments when there is not coupling
        line = line.replace(/([a-z]+)\s+([0-9]+)(?!\.)/g, '$1;-;$2');
        lineSplited = line.split(';');
    }
    return lineSplited;
}

function getDescriptorFromHeaders(headers, candidates, splitFileName) {
    let descriptor;
    let minDistance = Number.MAX_SAFE_INTEGER;
    Object.keys(candidates).some((e) => {
        // if (splitFileName[0] === 'HMDB0000754' && splitFileName[2] === '1523') {
        //     console.log('In get descriptors with ' + e)
        //     console.log('the candidate', candidates[e])
        //     console.log('the currents headers', headers)
        // }
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
        console.log(name, id, 'the current descriptor exist')
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
    if (copyPH < copyHeaders) [copyHeaders, copyPH] = [copyPH, copyHeaders];
    let distance = copyPH.reduce((dist, e) => {
        // if (splitFileName[0] === 'HMDB0000754' && splitFileName[2] === '1523') {
        //     console.log(e, copyHeaders.indexOf(e))
        // }
        if (copyHeaders.indexOf(e) === -1) dist++
        return dist
    }, 0);
    // if (splitFileName[0] === 'HMDB0000754' && splitFileName[2] === '1523') {
    //     console.log('the distance is ', distance);
    // }
    return distance;
}

function getHeaders(data, possibleHeaders, options = {}) {
    let {
        separator = ';',
        tolerance = 3,
        checked = false,
    } = options;
    // console.log('possible header', possibleHeaders)
    let isHeaders = false;
    let dataSplited = data.toLowerCase().split(separator);
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
        return headers;
    }
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

function checkData(peakData, name, id) {
    let keys = Object.keys(peakData);
    if (!peakData.hasOwnProperty('peaks')) {
        console.log(name, id, '  it has not peaks')
    } else if (keys.length > 1) {
        if (keys.length < 3) console.log(name, id, '  it has not somethings');    
        let filterKeys = keys.filter(checkForDescriptors)
        if (filterKeys.length !== keys.length) console.log(name, id, '  it has not somethings');
                
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
        let data = peakData[e];
        switch (e) {
            case 'peaks':
                data.some((element, i) => {
                    return checkForNumbers(element, name, id, e, i, possiblePeaksHeaders)
                })
                break;
            case 'multiplets':
                let fail = false;
                data.some((element, i) => {
                    fail = checkForNumbers(element, name, id, e, i,  ['no.', 'hs']);
                    if (fail) return fail;
                    let type = element['type'];
                    let line;
                    if (element['multiplets']) {
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
                break;
        }
    })
}

function checkForNumbers (element, name, id, key, line,toCheck) {
   return toCheck.some((h) => {
        let d = element[h];
        if (d) {
            if (isNaN(d)) {
                console.log(name, id, 'has not a number in ' + key + ' - ' + h + ' line ' + line);
                return true;
            }
        }
    });
}
