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
        // peakListData = peakListData.replace(/[0-9]+\.[0-9]+[\t| ]+([[0-9]+[ ]*]+))
        peakListData = peakListData.replace(/[ ]{2,}|[ ]*\t+[ ]*/g, ';');
        // if (splitFileName[0] === 'HMDB0000656' && splitFileName[2] === '1458') console.log(peakListData)
        // return
        var result = peakListData.split('\n');

        var hasTable = result.some((e) => checkForDescriptors(e, {separator: ' ', justCheck: true}));
        // if (splitFileName[0] === 'HMDB0000857' && splitFileName[2] === '1569') console.log(result)
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
                    if (descriptor) descriptorExist = true;
                    mayBeAdd(descriptor, temp,  {value: [], name: splitFileName[0], id: splitFileName[2]});
                } else {
                    temp.push(parseDataLine(e, headers, descriptor))
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
    fs.writeFileSync('export.json', JSON.stringify(resultJson))
})

function parseDataLine(line, headers, descriptor) {
    let result;
    switch (descriptor) {
        case 'peaks':
            break;
        case 'multiplets':
            result = parseMultipletList(line, headers);
            break;
        case 'assignments':
            result = parseAssignmentLine(line, headers);
    }
    return result;
}

function parseMultipletLine(line, headers) {
    let result = {}
    let eSplited = line.split(';');
    if (eSplited.length !== headers.length) {
        line = line.replace(/(M[0-9]+)\s+/, '$1;');
        line = line.replace(/([a-z]+)\s+([0-9]+\.[0-9]+)/g, '$1;$2');
        line = line.replace(/([0-9]+)(?!\.)\s+(M[0-9]+)/g, '$1;$2');
        line = line.replace(/([0-9]+\.[0-9]+)\s+([0-9]+)(?!\.)/g, '$1;$2');
        line = line.replace(/([0-9]+\.[0-9]+)\s+/g, '$1|');
        line = line.replace(/([0-9]+)\s+([a-z]+|\d+(?:\.))/g, '$1;$2'); //works
        // encapsulate the atom assignments when there is not coupling
        line = line.replace(/([a-z]+)\s+([0-9]+)(?!\.)/g, '$1;-;$2');
        eSplited = line.split(t)
    if (eSplited.length !== headers.length) {
        console.log(splitFileName[0], splitFileName[2] ,'has not the right separator')
        return true
    }
    headers.forEach((head, i) => {
        result[head] = eSplited[i] || '-';
    });
    return result;
}



function getDescriptorFromHeaders(headers, candidates, splitFileName) {
    let descriptor;
    let minDistance = Number.MAX_SAFE_INTEGER;
    Object.keys(candidates).some((e) => {
        let distance = compareHeaders(headers, candidates[e]) + candidates[e].length; //try to normalize choose between multiplets and assignments
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

function compareHeaders(headers, possibleHeaders) {
    let distance = 0;
    headers.forEach((e,i) => {
        if (!checkForHeaders([e], possibleHeaders)) distance++
    });
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
