const fs = require('fs');
const XmlStream = require('xml-stream');

var pathMetaboliteMetadata = '/home/abolanos/Downloads/';
var pathNmrPeakList = '/home/abolanos/Downloads/';
var pathNmrBrukerSpectra = '/home/abolanos/Downloads/';

var stream = fs.createReadStream(pathMetaboliteMetadata + 'urine_metabolites.xml');
// var file = fs.createWriteStream('/home/abolanos/text');
var xmlStream = new XmlStream(stream);

var fd = fs.openSync('metabolite.txt', 'a');
var count = 0 //for debug
xmlStream.on('endElement: metabolite', async (metabolite) => {
    if (count > 0) return//for debug
    let result = {};
    await parseChildren(metabolite.$children, result);
    fs.write(fd, JSON.stringify(result) + ',', (err) => console.log('some thing was wrong with fs.write'));
    fs.close(fd, (err) => console.log('aoeu'))//for debug
    count++//for debug
});

async function readNmrPeakList() {

}

async function parseChildren(children, result) {
    children.forEach((e, i, array) => {
        if (!e.$name) return;
        if (!Array.isArray(result)) {
            if (e.hasOwnProperty('$text')) {
                result[e.$name] = e.$text;
            } else {
                result[e.$name] = [];
                parseChildren(e.$children, result[e.$name]);
            }
        } else {
            if (e.hasOwnProperty('$text')) {
                result.push(e.$text);
            } else {
                result.push({});
                parseChildren(e.$children, result[result.length -1]);
            }
        }
    })
}

xmlStream.preserve('metabolite');
// xmlStream.on('end', () => fs.close(fd)); //uncomment for final use
