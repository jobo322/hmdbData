const fs = require('fs');
const path = require('path');
const XmlStream = require('xml-stream');

var pathMetaboliteMetadata = '/home/abolanos/hmdbProject/';
var pathNmrPeakList = '/home/abolanos/hmdbProject/';
var pathFidFiles = '/home/abolanos/hmdbProject/hmdb_fid_files/';

//create a list of nmr files to import with the metadata
var list = fs.readdirSync(pathFidFiles)
var spectraData = {};
list.forEach((e) => {
    let temp = e.split('_');
    let accession = temp[0];
    let dimension = temp[1];
    let code = temp[2];
    if (!spectraData[accession]) spectraData[accession] = {};
    let entry = spectraData[accession];
    entry[code] = {
        dimension: dimension === 'nmroned' ? 1 : 2,
        fileName: e
    }
})


var stream = fs.createReadStream(pathMetaboliteMetadata + 'urine_metabolites.xml');
// var file = fs.createWriteStream('/home/abolanos/text');
var xmlStream = new XmlStream(stream);

var fd = fs.openSync('metabolite.txt', 'a');
var count = 0 //for debug
xmlStream.on('endElement: metabolite', async (metabolite) => {
    // if (count > 0) return//for debug
    let accession = metabolite['accession'].$text;
    let result = {};
    await parseChildren(metabolite.$children, result);
    if (count === 0) {
        prefix = '[';
    } else {
        prefix = ',';
    }
    fs.write(fd, prefix + JSON.stringify(result), handdleError);
    // fs.close(fd, (err) => console.log(err))//for debug
    count++//for debug
});

async function readNmrPeakList() {

}

async function parseChildren(children, result) { // @TODO: review some problems with empty properties
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

function handdleError(err) {
    if (!err) return;
    throw err
}
xmlStream.preserve('metabolite');
xmlStream.on('end', () => {
    fs.write(fd, ']', handdleError);
    fs.close(fd, handdleError);
}); //uncomment for final use
