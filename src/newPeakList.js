const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const levenshtein = require('fast-levenshtein');

// var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
var pathNmrPeakList = '/home/abolanos/hmdbProject/peakListWrong/';
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\peakListWrong'

const constHeaders = {
    peaks: ['no','shift-hz', 'shift-ppm', 'height'],//['no.', 'no', 'hz', '(hz)', 'ppm', '(ppm)', 'height'];
    multiplets: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],//['no.', 'no', 'hs', 'type', 'atom1', 'multiplet1', 'ppm', '(ppm)', 'j (hz)','shift1 (ppm)', 'atom','multiplet'];
    assignments: ['no','atom', 'exp-shift-ppm', 'shift-ppm', 'multiplet']
}
const possibleSignalType = ['m', 's', 'd', 't', 'dd', 'dt', 'q','qq', 'p', 'pent', 'quint', 'quin','br. s.', 'dq','qd','td', 'tq','dd', 'ddd', 'tt', 'sext','sxt', 'hex', 'sept', 'hept', 'oct', 'non', 'none', 'qt'];

const possibleHeaders = reduceHeaders(constHeaders);
const regexHeaders = new RegExp(possibleHeaders.join('|').replace(/\./g,'\.'), 'g');
console.log(regexHeaders)
// return

const possibleDescriptors = ['multiplets', 'peaks', 'assignments']//, 'mulitplets', 'muliplets','nultiplets','mnltiplets', 'mutiplets', 'multuplets', 'assignmentrs', 'assignment', 'assignements', 'assignmets','assignement']
let existedHeaders = [];

fs.readdir(pathNmrPeakList, (err, listDir) => {
    var resultJson = {};
    var counter = 0
    listDir.forEach((file) => {
        if (file.toLowerCase().match('nmrtwod')) return

        let splitFileName = file.split('_');
        // if (splitFileName[0] !== 'HMDB0000754' && splitFileName[2] !== '1523') return
        if (!resultJson[splitFileName[0]]) resultJson[splitFileName[0]] = {};
        resultJson[splitFileName[0]][splitFileName[2]] = {};
        var temp = resultJson[splitFileName[0]][splitFileName[2]];

        var peakListData = fs.readFileSync(path.join(pathNmrPeakList, file), 'utf8');
        var dataLowerCase = peakListData.toLowerCase();
        var original = String(peakListData); // for debug
        
        peakListData = peakListData.replace(/(\w*)\s+\n*([[N|n]+o\.*])/,'$1\n$2');
        peakListData = peakListData.replace(/[ ]*\n*[\t| ]*\n{1,}/g, '\n');
        peakListData = peakListData.replace(/[ ]*\n{1,}[\t| ]*\n*/g, '\n').replace(/([ ]*\n{1,}[ ]*\n*)$/g, '');
        
        if (peakListData.toLowerCase().indexOf('address') === -1) {
            peakListData = peakListData.replace(/[\t| ]+([0-9]+\.*[0-9]*)[\t| ]+\.{2}[\t| ]+([0-9]+\.*[0-9]*)/g, '\t$1-$2');
            peakListData = peakListData.toLowerCase().replace(/\((\w+)\)(?=[\t| ]*)/g, '$1');
            peakListData = peakListData.replace(/\n*n+o\.*([\t| ]+)/g,'\nno$1');
            peakListData = peakListData.replace(/\s+j\s+hz\s+/g, '\tcoupling\t');
            peakListData = peakListData.replace(/[ ]*\t*(a+tom[0-9]*)[ ]*\t*/g, '\t$1\t');
            peakListData = peakListData.replace(/([a-z]+)1/g, '$1');
            peakListData = peakListData.replace(/[ ]*\t*([E|e]xp)\.*[ ]*\t*([S|s]hift)[ ]*\t*([[ppm]+|[Hz]+])[ ]*\t*/g, '\t$1-$2-$3\t');
            peakListData = peakListData.replace(/shift\s+ppm/g, 'shift-ppm')
            peakListData = peakListData.replace(/\s+hz\s+/g, '\tshift-hz\t');
            peakListData = peakListData.replace(/\s+ppm(?=\s*\n+)/g,'\trange');
            peakListData = peakListData.replace(/\s+ppm(?=\s+)/, '\tshift-ppm');
            let headers = [];
            let descriptor = [];
            peakListData.split('\n').some((e,i,arr) => {
                let r = e.replace(/\s+/g, '').match(regexHeaders) || [];
                if (r.length > 1) {
                    headers = r;
                    descriptor = getDescriptorFromHeaders(headers, constHeaders, splitFileName);
                    if (compareHeaders(r, constHeaders[descriptor], splitFileName) > 2) return
                    if (descriptor) descriptorExist = true;
                    mayBeAdd(descriptor, temp,  {value: [], name: splitFileName[0], id: splitFileName[2]});
                } else {
                    let lineSplited = splitDataLine(e, headers, descriptor, splitFileName);
                    if (!lineSplited || lineSplited.length === 1) return;
                    let result = {}
                    headers.forEach((head, i) => {
                        result[head] = lineSplited[i] || '-';
                    });
                    let review = checkLine(result, headers, descriptor, splitFileName[0], splitFileName[2])
                    if (review) {
                        return 
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
                        firstHeader.splice(0,0,'no.');
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

function splitDataLine(line, headers, descriptor, splitFileName) {
    let lineSplited;
    switch (descriptor) {
        case 'peaks':
            lineSplited = splitPeakLine(line, headers, splitFileName);
            break;
        case 'multiplets':
            lineSplited = splitMultipletLine(line, headers, splitFileName);
            break;
        case 'assignments':
            lineSplited = splitAssignmentLine(line, headers, splitFileName);
    }
    return lineSplited;
}

function splitPeakLine(line, headers) {
    line = line.replace(/(\d+)\s+/g,'$1;')
    let lineSplited = line.split(';');
    return lineSplited;
}

function splitAssignmentLine(line, headers) {
    line = line.replace(/(\d+)\s+/g,'$1;')
    line = line.replace(/^(\d+);(\d+\.\d+)/g,'$1;-;$2');
    line = line.replace(/;$/,'');
    let lineSplited = line.split(';');
    return lineSplited;
}

function splitMultipletLine(line, headers, splitFileName) {
    let result = {}
    //falta adicionar el caso en que exista '-' y que no exista atom (poco usual)
    line = line.replace(/(m[0-9]+)\s+/, '$1;'); // separar la manera en que se asignan los multipletes
    line = line.replace(/([a-z]+|br. s.)\s+([0-9]+\.[0-9]+)/g, '$1;$2'); // separar 'type' y 'coupling'
    line = line.replace(/([0-9]+[a-z]*)(?!\.)\s+(m[0-9]+)/g, '$1;$2'); // separar 'atom' y 'multiplet'
    line = line.replace(/([0-9]+\.[0-9]+)\s+([0-9]+)(?!\.)/g, '$1;$2'); // separar 'shift-ppm' y 'hs'
    line = line.replace(/([0-9]+\.[0-9]+)\s+/g, '$1|'); //separar agrupando los couplings (depende de que todos los otros decimales esten procesados)
    line = line.replace(/([0-9]+)\s+([a-z]+|\d+(?:\.))/g, '$1;$2'); // separar 'hs' y type
    line = line.replace(/\s+-\s+/g, ';-;')// preservar no asignaciones
    if (headers.indexOf('coupling') === -1) { // encapsulate the atom assignments when there is not coupling
        line = line.replace(/(;[a-z]+|br. s.)\s+([0-9]+[a-z]*)(?!\.)/g, '$1;$2');
    } else {
        line = line.replace(/(;[a-z]+|br. s.)\s+([0-9]+[a-z]*)(?!\.)/g, '$1;-;$2');
    }
    return line.split(';');
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
    if (copyPH.length < copyHeaders.length) [copyHeaders, copyPH] = [copyPH, copyHeaders];
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

function getHeaders(dataSplited, possibleHeaders, splitFileName, options = {}) {
    let {
        tolerance = 3,
        checked = false
    } = options;
    // console.log('possible header', possibleHeaders)
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
            fail = checkForNumbers2(element, name, id, descriptor, 1,  ['no.', 'hs']);
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
            fail = checkForNumbers2(element, name, id, descriptor, 1,  ['no.', 'atom', 'exp. shift ppm', 'shift ppm']);
            if (fail) return fail;
            if (element.hasOwnProperty('multiplet')) {
                let temp = element.multiplet.replace(/[a-z]+[0-9]+/g, '');
                if (temp.length !== 0) {
                    // console.log(name, id, 'there is not a correct way of multiplet in ' + descriptor + ' line ' + 1)
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
        let data = peakData[e];
        switch (e) {
            case 'peaks':
                data.some((element, i) => {
                    return checkForNumbers(element, name, id, e, i, constHeaders[e])
                })
                break;
            case 'multiplets':
                let fail = false;
                data.some((element, i) => {
                    fail = checkForNumbers(element, name, id, e, i,  ['no.', 'hs']);
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
                break;
        }
    })
}


function checkForNumbers2 (element, name, id, key, line, toCheck) {
    return toCheck.some((h) => {
         let d = element[h];
         if (d) {
             if (isNaN(d)) {
                //  console.log(name, id, 'has not a number in ' + key + ' - ' + h + ' line ' + line);
                 return true;
             }
         }
     });
 }
 
function checkForNumbers (element, name, id, key, line, toCheck) {
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
