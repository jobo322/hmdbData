const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const levenshtein = require('fast-levenshtein');

var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
// var pathNmrPeakList = '/home/abolanos/hmdbProject/peakListWrong/';
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'
// var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\peakListWrong'

const possiblePeaksHeaders = ['no.','shift-hz', 'shift-ppm', 'height'];//['no.', 'no', 'hz', '(hz)', 'ppm', '(ppm)', 'height'];
const possibleMultipletsHeaders = ['no.', 'hs', 'type', 'atom', 'multiplet', 'range', 'coupling'];//['no.', 'no', 'hs', 'type', 'atom1', 'multiplet1', 'ppm', '(ppm)', 'j (hz)','shift1 (ppm)', 'atom','multiplet'];
const possibleAssignmentsHeaders  = ['no.','atom', 'multiplet', 'exp. shift ppm', 'shift ppm'];

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
        peakListData = peakListData.replace(/[ ]*\n{1,}[\t| ]*\n*/g, '\n').replace(/([ ]*\n{1,}[ ]*\n*)$/g, '');
        peakListData = peakListData.replace(/[ ]*\t*([A|a]+tom[0-9]*)[ ]*\t*/g, '\t$1\t');
        peakListData = peakListData.replace(/[ ]*\t*([E|e]xp\.*){0,1}[ ]*\t*([S|s]hift[0-9]*)[ ]*\t*([[ppm]+|[Hz]+])[ ]*\t*/g, '\t$1 $2 $3\t');
        peakListData = peakListData.replace(/[ ]{2,}|[ ]*\t+[ ]*/g, ';');

        var result = peakListData.split('\n');

        var hasTable = result.some((e) => checkForDescriptors(e, {separator: ' ', justCheck: true}));//result.some((aa) => aa.replace(/[ ]{2,}/g, ' ').toLowerCase().split(' ').some(checkForDescriptors));
        // if (splitFileName[0] === 'HMDB0000857' && splitFileName[2] === '1569') console.log(result)
        if (hasTable) {
            let descriptorExist = false;
            let headersExist = false;
            let headers = [];
            let descriptor = [];
            // if (splitFileName[0] === 'HMDB0001341' && splitFileName[2] === '1683') console.log('entra')
            result.some((e,i,arr) => {
                hasTable = checkForDescriptors(e, {separator: ' ', justCheck: true});
                // if (splitFileName[0] === 'HMDB0001341' && splitFileName[2] === '1683') {
                //     console.log(hasTable)
                //     console.log(e)
                // }
                if (hasTable) {
                    descriptorExist = true;
                    headersExist = false;
                    descriptor = checkForDescriptors(e, {separator: ' '});
                    // if (splitFileName[0] === 'HMDB0001341' && splitFileName[2] === '1683') console.log(e)
                    mayBeAdd(descriptor, temp, {value: [], name: splitFileName[0], id: splitFileName[2]});
                    return false
                } else if (headersExist === descriptorExist && checkForHeaders(e.toLowerCase().split(';'), possibleHeaders)) {
                    descriptorExist = true;
                    descriptor = 'peaks'
                    // if (splitFileName[0] === 'HMDB0001341' && splitFileName[2] === '1683') console.log(e)
                    mayBeAdd('peaks', temp,  {value: [], name: splitFileName[0], id: splitFileName[2]});
                }
                if (descriptorExist) {
                    eSplited = e.split(';');
                    if (eSplited.length === 1 && e.length > 1) {
                        console.log(splitFileName[0], splitFileName[2] ,'does not exist ; separator')
                        return true
                    }
                    if (!headersExist) {
                        e = e.toLowerCase().replace(/([a-zA-Z]+)1/g, '$1');
                        e = e.replace(/j hz/, 'coupling');
                        e = e.replace(/;hz/, ';shift-hz');
                        e = e.replace(/;ppm(?!;)/, ';range')
                        e = e.replace(/;ppm(?=;)/,';shift-ppm')
                        headers = getHeaders(e, possibleHeaders, {separator: ';', checked: true})
                        headersExist = true;
                    } else if (headersExist) {
                        let toExport = {}
                        headers.forEach((head, i) => {
                            toExport[head] = eSplited[i] || '-';
                        })
                        temp[descriptor].push(toExport)
                    }
                }
            })
        } else {
            let firstExist = false;
            let secondExist = false;
            var firstHeader, secondHeader, indexFrequency, toExport;
            //for some proton files than it has only peak list without descriptor
            if (peakListData.toLowerCase().indexOf('address') === -1) {
                peakListData = peakListData.replace(/\n$/, '');
                peakListData = peakListData.replace(/^\n/, '');
                peakListData = peakListData.replace(/[;|\s]+[H|h]z[;|\s]+/, ';shift-hz;');
                peakListData = peakListData.replace(/[;|\s]+ppm[;|\s]+/,';shift-ppm;');
                peakListData = peakListData.replace(/[ ]+/g, ';')   
                
                result = peakListData.split('\n');
                result.some((ee) => {
                    let candidateHeaders = getHeaders(ee, possibleHeaders, {checked: true, tolerance: 2})
                    let isHeaders = checkForHeaders(candidateHeaders, possibleHeaders)
                    if (isHeaders) {
                        firstHeader = candidateHeaders;
                        return true
                    } else {
                        return false
                    }
                })
            }
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
        checkData(temp,splitFileName[0],splitFileName[2])
        temp.text = original;
    })
    fs.writeFileSync('export.json', JSON.stringify(resultJson))
})

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

function checkForDescriptors(data, options = {}) {
    let {
        separator = ' ',
        justCheck = false,
        tolerance = 3
    } = options;

    let dataSplited = data.toLowerCase().split(separator);
    let descriptor;
    let isDescriptor = dataSplited.some(linePart => {
        return possibleDescriptors.some((ee) =>  {
            let distance = levenshtein.get(ee, linePart)
            if (distance < tolerance) descriptor = ee
            return distance < tolerance;
        })
    })
    // console.log(isDescriptor, data, descriptor)
    return justCheck ? isDescriptor : descriptor
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
                    return possiblePeaksHeaders.some((h) => {
                        let d = element[h]
                        if (d) {
                            if (isNaN(d)) {
                                console.log(name, id, 'has not a number in ' + e + ' - ' + h + 'line ' + i);
                                return true;
                            }
                        }
                    })
                })
                break;
            case 'multiplets':
                let fail = false;
                data.some((element, i) => {
                    fail = ['no.', 'hs'].some((h) => {
                        let d = element[h];
                        if (d) {
                            if (isNaN(d)) {
                                console.log(name, id, 'has not a number in ' + e + ' - ' + h + ' line ' + i);
                                return true;
                            }
                        }
                    });
                    // if (fail) return fail;
                    // if ()
                })
                break
            case 'assignments':
                break;
        }
    })
}

// const possiblePeaksHeaders = ['no.','shift-hz', 'shift-ppm', 'height'];//['no.', 'no', 'hz', '(hz)', 'ppm', '(ppm)', 'height'];
// const possibleMultipletsHeaders = ['no.', 'hs', 'type', 'atom', 'multiplet', 'range', 'coupling'];//['no.', 'no', 'hs', 'type', 'atom1', 'multiplet1', 'ppm', '(ppm)', 'j (hz)','shift1 (ppm)', 'atom','multiplet'];
// const possibleAssignmentsHeaders  = ['no.','atom', 'multiplet', 'exp. shift ppm', 'shift ppm'];

// const peaksShouldBeInstanceOf = {
//     'no.': Number,
//     'shift-hz': Number,
//     'shift-ppm': Number,
//     'height': Number
// }

