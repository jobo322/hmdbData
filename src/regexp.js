//var peakListData = "Table of Peaks\nNo.\t(ppm)\t(Hz)\tHeight\n1\t0.000\t0.00\t0.1190\n2\t1.182\t708.59\t0.9893\n3\t1.193\t715.64\t1.0000\n4\t2.744\t1645.65\t0.0153\n5\t2.756\t1652.67\t0.0496\n6\t2.761\t1655.73\t0.0188\n7\t2.766\t1658.99\t0.0577\n8\t2.767\t1659.70\t0.0530\n9\t2.773\t1662.76\t0.0582\n10\t2.778\t1666.01\t0.0542\n11\t2.783\t1669.05\t0.0602\n12\t2.784\t1669.76\t0.0608\n13\t2.790\t1673.04\t0.0173\n14\t2.795\t1676.08\t0.0552\n15\t2.807\t1683.13\t0.0167\n16\t3.154\t1891.81\t0.1363\n17\t3.171\t1901.87\t0.1252\n18\t3.176\t1904.57\t0.1530\n19\t3.193\t1914.63\t0.1415\n20\t3.469\t2080.70\t0.1426\n21\t3.480\t2086.98\t0.1412\n22\t3.491\t2093.46\t0.1274\n23\t3.501\t2099.72\t0.1224\n\nTable of Multiplets\nNo.\tShift1 (ppm)\tHs\tType\tJ (Hz)\tAtom1\tMultiplet1\t (ppm)\n1\t1.187\t3\td\t7.06\t8\tM04\t1.170 .. 1.204\n2\t2.775\t1\tm\t10.34 7.04 6.70\t5\tM03\t2.740 .. 2.810\n3\t3.174\t1\tdd\t12.76 10.06\t4\tM02\t3.149 .. 3.198\n4\t3.485\t1\tdd\t12.75 6.27\t4\tM01\t3.464 .. 3.508\n\nTable of Assignments\nNo.\tAtom\tExp. Shift (ppm)\tMultiplet\n1\t8\t1.187\tM04\n2\t5\t2.775\tM03\n3\t4\t3.174\tM02\n4\t4\t3.485\tM01\n"
var regexpByPair = {
    'noshift-ppm': {regexp: '([0-9]+)\\s+(-*[0-9]+\\.[0-9]+)',flag: 'i'},
    'shift-ppmhs': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+([0-9]+)',flag: 'i'},
    'shift-ppmtype': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+([a-z]+(?![0-9])|br. s.)',flag: 'i'},
    'shift-ppmshift-hz': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+(-*[0-9]+\\.[0-9]+)',flag: 'i'},
    'shift-hzshift-ppm': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+(-*[0-9]+\\.[0-9]+)',flag: 'i'},
    'shift-hzheight': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+(-*[0-9]+\\.[0-9]+)',flag: 'i'},
    'shift-ppmheight': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+(-*[0-9]+\\.[0-9]+)',flag: 'i'},
    'shift-hzhs': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+([0-9]+)',flag: 'i'},
    'shift-hztype': {regexp: '(-*[0-9]+\\.[0-9]+)\\s+([a-z]+(?![0-9])|br. s.)',flag: 'i'},
    'hsshift-hz': {regexp: '([0-9]+)\\s+(-*[0-9]+\\.[0-9]+)', flag: 'i'},
    'noshift-hz': {regexp: '([0-9]+)\\s+(-*[0-9]+\\.[0-9]+)',flag: 'i'},
    'hsshift-ppm': {regexp: '([0-9]+)\\s+(-*[0-9]+\\.[0-9]+)', flag: 'i'},
    'atomcoupling': {regexp: '([0-9]+[a-z]*)\\s+([0-9]+\\.[0-9]+|-)',flag: 'i'},
    'couplingatom': {regexp: '([0-9]+\\.[0-9]+|-)\\s+([0-9]+[a-z]*(?!\\.)[\\s+|;])',flag: 'i'},
    'atommultiplet': {regexp: '([\\s+|;][0-9]+[a-z]*(?!\\.))\\s+(m[0-9]+)',flag: 'i'},
    'couplingmultiplet': {regexp: '([0-9]+\\.[0-9]+|-)\\s+(m[0-9]+)',flag: 'i'},
    'typecoupling': {regexp: '([a-z]+|br. s.)\\s+([0-9]+\\.[0-9]+|-)',flag: 'i'},
    'typeatom': {regexp: '([a-z]+|br. s.)\\s+([0-9]+[a-z]*(?!\\.))',flag: 'i'},
    'typemultiplet': {regexp: '([a-z]+|br. s.)\\s+(m[0-9]+)',flag: 'i'},
    'hstype': {regexp: '([0-9]+)\\s+([a-z]+|br. s.)',flag: 'i'},
    'nohs': {regexp: '(^[0-9]+)\\s+([0-9]+[\\s+|;])', flag: 'i'},
    'hsatom': {regexp: '([0-9]+(?!\\.))\\s+([0-9]+[a-z]*(?!\\.))',flag: 'i'},
    'multipletrange': {regexp: '(m[0-9]+)\\s+([0-9]+\\.[0-9]+\\|[0-9]+\\.[0-9]+)', flag: 'i'},
    'atomrange': {regexp: '([0-9]+[a-z]*(?!\\.))\\s+([0-9]+\\.[0-9]+\\|[0-9]+\\.[0-9]+)', flag: 'i'}
}
Object.keys(regexpByPair).forEach((e) => {
    regexpByPair[e] = new RegExp(regexpByPair[e].regexp, regexpByPair[e].flag);
})

const constHeaders = {
    peaks: ['no','shift-hz', 'shift-ppm', 'height'],//['no.', 'no', 'hz', '(hz)', 'ppm', '(ppm)', 'height'];
    multiplets: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],//['no.', 'no', 'hs', 'type', 'atom1', 'multiplet1', 'ppm', '(ppm)', 'j (hz)','shift1 (ppm)', 'atom','multiplet'];
    assignments: ['no','atom', 'exp-shift-ppm', 'shift-ppm', 'multiplet']
}

var toTest = [
    {
        text: [
           '1 \t4.05 \t8 \tdd \t8.38 4.75 \t \tm01\t4.02 .. 4.07\n4 \t2.22 \t3 \ts \tM01 \t2.21 .. 2.23'
        ],
        headers: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],
        result: [
            '1;4.05;8;dd;8.38|4.75;-;m01;4.02|4.07',
            '4;2.22;3;s;-;-;m01;2.21|2.23'
            ],
        descriptor: 'multiplets'
    },
    // {
    //     text: [
    //         '2\t7.84\t\t2\tm\t4a 7a\t\tm01\t7.78-7.88',
    //         '2\t3.70\t\t4\tm\t5 2 7 3\tm01\t3.65-3.73',
    //         '3\t1.49\t72\tm\t\t\tm07\t1.49-1.49'
    //     ],
    //     headers: [ 'no', 'shift-ppm', 'hs', 'type', 'atom', 'multiplet', 'range' ],
    //     result: ['2;7.84;2;m;4a|7a;m01;7.78-7.88','2;3.70;4;m;5|2|7|3;m01;3.65-3.73','3;1.49;72;m;-;m07;1.49-1.49'],
    //     descriptor: 'multiplets'
    // }
    
    // {
    //     text: '2 \t2.35 \t23 \ts \tM02 \t2.26 .. 2.48\n\n2\t1.39\t\t2\tm\t-\t\t\t\tM10\t\t1.38 .. 1.39 \n 4 \t3.990 \t13 \tdd \t6.560 4.520 \t2 \tM01 \t3.965 .. 4.008\n\n\n3 \t2.20 \t6 \tt \t7.58 \t4 \tM03 \t2.17 .. 2.23\n4 \t2.06 \t11 \tm \t- \t9 6 \tM04 \t2.02 .. 2.11\n5 \t1.61 \t5 \tm \t- \t5 \tM05 \t1.57 .. 1.65\n6 \t1.33 \t21 \tm \t- \t13 12 11 10 \tM06 \t1.23 .. 1.41\n\n1\t1.56\t\t1\tm\t17.38 10.97 6.70\t5\tM04\t\t1.46 .. 1.66\n\n1 \t4 \t0.886 \tM04\n\n1 \t5a \t6.82 \tm01', 
    //     headers: ['coupling'],
    //     descriptor: 'multiplets'
    // },
    // {
    //     text: '10 \t5.45 \t2724.0 \t0.1390',
    //     headers: [],
    //     descriptor: 'peaks'
    // },
    // {
    //     text: '1 \t2 \t2.50 \tM01\n2 \t3 \t2.50 \tM01',
    //     headers: [],
    //     descriptor: 'assignments'
    // }
]
toTest.forEach((e, i) => {
    let result = test(e.text.join('\n'), e.headers, e.descriptor)
    result.forEach((r,j) => {
        if (e.result[j]) {
            console.log(r.line === e.result[j])
        } else {
            console.log(r.line)
        }
    })
})
function test(text, headers, descriptor) {
    var peakListData = text;
    peakListData = peakListData.replace(/(\w*)\s+\n*([[N|n]+o\.*])/,'$1\n$2');
    peakListData = peakListData.replace(/[ ]*\n*[\t| ]*\n{1,}/g, '\n');
    peakListData = peakListData.replace(/[ ]*\n{1,}[\t| ]*\n*/g, '\n').replace(/([ ]*\n{1,}[ ]*\n*)$/g, '');
    
    if (peakListData.toLowerCase().indexOf('address') === -1) {
        peakListData = peakListData.replace(/[\t| ]+([0-9]+\.*[0-9]*)[\t| ]+\.{2}[\t| ]+([0-9]+\.*[0-9]*)/g, '\t$1|$2');
        peakListData = peakListData.toLowerCase().replace(/\(\s*(\w+)\s*\)(?=[\t| ]*)/g, '$1');
        peakListData = peakListData.replace(/\n*n+o\.*(\s+)/g,'\nno$1');
        peakListData = peakListData.replace(/\s*j\s+hz\s+/g, '\tcoupling\t');
        peakListData = peakListData.replace(/[ ]*\t*(a+tom[0-9]*)[ ]*\t*/g, '\t$1\t');
        peakListData = peakListData.replace(/([a-z]{2,})1/g, '$1');
        peakListData = peakListData.replace(/\s+(exp)\.*\s+(shift)\s+([[ppm]+|[hz]+])\s+/g, '\t$1-$2-$3\t');
        peakListData = peakListData.replace(/shift\s+ppm/g, 'shift-ppm')
        peakListData = peakListData.replace(/\s+hz\s+/g, '\tshift-hz\t');
        peakListData = peakListData.replace(/\s*ppm(?=\s*\n+)/g,'\trange');
        peakListData = peakListData.replace(/\s+ppm(?=\s+)/g, '\tshift-ppm');
    }

    peakListData = peakListData.split('\n');
    let result = []
    for (let line of peakListData) {
        let r = splitDataLine(line, headers, descriptor)
        result.push({
            line: r,
        })
    }
    return result
}


function splitDataLine(line, headers, descriptor, splitFileName) {
    let lineSplited;
    let neighbors = getNeighbors(headers, 1);
    switch (descriptor) {
        case 'peaks':
            lineSplited = splitPeakLine(line, headers, neighbors, splitFileName);
            break;
        case 'multiplets':
            lineSplited = splitMultipletLine(line, headers, neighbors, splitFileName);
            break;
        case 'assignments':
            lineSplited = splitAssignmentLine(line, headers, neighbors, splitFileName);
    }
    return lineSplited;
}

function splitPeakLine(line, headers, descriptor) {
    console.log(JSON.stringify(line), descriptor);
    line = line.replace(/(\d+)\s+/g,'$1;')
    let lineSplited = line.split(';');
    return lineSplited;
}

function splitAssignmentLine(line, headers, descriptor) {
    console.log(JSON.stringify(line), descriptor);
    line = line.replace(/(\d+)\s+/g,'$1;')
    let indexOfAtom = headers.indexOf('atom');
    if (indexOfAtom !== -1) {
        let indexOfShift = Math.max(headers.indexOf('exp-shift-ppm'), headers.indexOf('shift-ppm'));
        if (indexOfAtom < indexOfShift) {
            line = line.replace(/^(\d+);(\d+\.\d+)/g,'$1;-;$2');
        }
    }
    line = line.replace(/([0-9]+[a-z]*)\s+([a-z]+|\d+(?:\.))/g, '$1;$2');
    // line = line.replace(/([0-9]+[a-z]*)(?!\.)\s+(m[0-9]+)/g, '$1;$2');
    line = line.replace(/([0-9]+[a-z]*)(?!\.)\s+/g, '$1|');
    line = line.replace(/\s+-\s+/g, ';-;')// preservar no asignaciones
    line = line.replace(/;$/,'');
    let lineSplited = line.split(';');
    return lineSplited;
}

function splitMultipletLine(line, headers, splitFileName) {
    console.log(JSON.stringify(line))
    line = splitter(line, headers, 1);
    console.log(line)
    if (line.split(';').length !== headers.length) line = splitter(line, headers, 2);
    if (line.split(';').length !== headers.length) line = splitter(line, headers, 3);
    line = line.replace(/([0-9]+[a-z]*)(?!\.)\s+/g, '$1|');
    console.log(line)
    return line;
}

function splitter (line, headers, order) {
    let neighbors = getNeighbors(headers, order);
    let listToDo = [];
    for (let i = 0; i < headers.length - 1; i++) {
        let name;
        if (neighbors[headers[i]].left) {
            let name = neighbors[headers[i]].left + headers[i]
            if (listToDo.indexOf(name) === -1) listToDo.push(name)
        }
        if (neighbors[headers[i]].right) {
            name = headers[i] + neighbors[headers[i]].right;
            if (listToDo.indexOf(name) === -1) listToDo.push(name)
        }
    }
    console.log(listToDo)
    let howToSeparate;
    switch (order) {
        case 1:
            howToSeparate = '$1;$2'
            break
        case 2:
            howToSeparate = '$1;-;$2';
            break;
        case 3:
            howToSeparate = '$1;-;-;$2';
    }
    listToDo.forEach((e,i) => {
        line = line.replace(regexpByPair[e], howToSeparate);
        console.log(JSON.stringify(line), i);
    });
    return line;
}

function getNeighbors(headers, order) {
    let result = {};
    headers.forEach((e, i, array) => {
        result[e] = {
            right: array[i + order],
            left: array[i - order],
        }
    })
    return result;
}
