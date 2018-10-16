const preprocess = require('../splitter/preprocess');


var toTest = [
    {
        text: [
            'No.	Shift1 (ppm)	Hs	Type	J (Hz)	Atom1	Multiplet1	 (ppm)'
        ],
        headers: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range'],
        result: ['no', 'shift-ppm', 'hs', 'type', 'coupling', 'atom', 'multiplet', 'range']
    }
];

function test(text) {
    var peakListData = preprocess.general(text);
    return preprocess.protonic(peakListData);
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
