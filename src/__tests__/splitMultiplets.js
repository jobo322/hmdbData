const splitter = require('../splitter/splitLine');
const regexpByPair = require('../splitter/regexpByPair');
const preprocess = require('../splitter/preprocess');

var toTest = [
    {
        text: [
            '3 \t2.20 \t6 \tt \t7.58 \t4 \tM03 \t2.17 .. 2.23',
            '2\t1.37\t\t3\tdd\t7.58\t8.90\t10 4 5\tM13\t\t1.24 .. 1.42',
            '2 \t2.649 \t10 \tm \t- \t3 \tm02\t2.606 .. 2.694',
            '1\t2.22\t1\ts\t-\t\tm01\t2.20 .. 2.22'
        ],
        headers: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],
        result: [
            '3;2.20;6;t;7.58;4;m03;2.17|2.23', 
            '2;1.37;3;dd;7.58|8.90;10|4|5;m13;1.24|1.42',
            '2;2.649;10;m;-;3;m02;2.606|2.694',
            '1;2.22;1;s;-;m01;2.20|2.22'],
        descriptor: 'multiplets'
    }
];

function test(text, headers, descriptor) {
    var peakListData = preprocess.general(text)
    
    if (peakListData.toLowerCase().indexOf('address') === -1) {
        peakListData = preprocess.protonic(peakListData)
    }

    peakListData = peakListData.split('\n');
    let result = []
    for (let line of peakListData) {
        let r = splitter.splitDataLine(line, headers, descriptor, regexpByPair);
        result.push({
            line: r,
        })
    }
    return result;
}

describe('regular expresion splitter of multiplet lines', () => {
    toTest.forEach(content => {
        let {
            text,
            headers,
            result,
            descriptor
        } = content;
        let processed = test(text.join('\n'), headers, descriptor);
        let title = 'split multiplet with headers ' + headers.join('|');
        it(title, () => {
            processed.forEach((r, i) => {
                let stringResult = r.line.join(';');
                expect(stringResult).toBe(result[i]);
            })
        });
    })
});
