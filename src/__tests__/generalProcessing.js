const preprocess = require('../splitter/preprocess');

const constHeaders = {
    peaks: ['no','shift-hz', 'shift-ppm', 'height'],
    multiplets: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],
    assignments: ['no','atom', 'exp-shift-ppm', 'shift-ppm', 'multiplet']
};

const possibleHeaders = reduceHeaders(constHeaders);
const regexHeaders = new RegExp(possibleHeaders.join('|').replace(/\./g,'\.'), 'g');

var toTest = [
    {
        text: [
            'No.	Shift1 (ppm)	Hs	Type	J (Hz)	Atom1	Multiplet1	 (ppm)\n'
        ],
        headers: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],
        result: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range']
    }
];

function test(text) {
    var peakListData = preprocess.general(text);
    console.log('after general process %s', peakListData);
    peakListData = preprocess.protonic(peakListData);
    console.log('after protonic process %s', peakListData);
    let r = peakListData.replace(/\s+/g, '').match(regexHeaders) || [];
    return r;
}

describe('to change', () => {
    toTest.forEach(content => {
        let {
            text,
            headers,
            result
        } = content;
        let processed = test(text.join('\n'));
        console.log(processed)
        let title = 'test general processing with headers ' + headers.join('|');
        it(title, () => {
            expect(true).toBe(true);
        });
    })
});

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