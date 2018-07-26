'use strict';

const nmrMetadata = require('nmr-metadata');
const jcampconverter = require('jcampconverter');


async function nmrImport(ctx, result) {
    result.kind = 'sample';
    const filename = ctx.filename;
    console.log(result.getUpdateType())
    result.groups = [];

    result.jpath = ['spectra', 'nmr'];
    result.content_type = 'chemical/x-jcamp-dx';
    result.reference = filename.replace(/\.(fid|jdx)$/, '');

    let contents = await ctx.getContents('latin1');
    console.log(contents)
    throw new Error('stop for debug');
    // username, catalog and batch are stored in the jcamp, need to parse it
    const jcamp = jcampconverter.convert(contents, {
        keepRecordsRegExp: /.*/,
        withoutXY: true
    });
    let title = jcamp.info.TITLE, reg = /(?:\w*:)(.*)(?:\n|$)/igm; 
    console.log(JSON.stringify(title))
    let match = title.match(reg).map((e) => e.replace(reg, '$1'));
    console.log('match',match);
    result.owner = match.splice(2)[0];
    console.log('owner', result.owner)
    result.id= match;
    result.content = {}
    const ext = ctx.fileExt.toLowerCase();
    if (ext === '.fid') {
        result.field = 'jcampFID';
    } else if (ext === '.jdx') {
        let meta;
        try {
            meta = nmrMetadata.parseJcamp(contents, {computeRanges: true});
        } catch (e) {
            meta = nmrMetadata.parseJcamp(contents);
        }
        delete meta.isFid;
        delete meta.isFt;
        result.metadata = meta;
        result.field = 'jcamp';
    } else {
        throw new Error('unexpected file extension: ' + filename);
    }
    console.log('complete',result)
};

nmrImport.source = ['hmdb_import'];

async function hmdbImport(ctx, options = {}) {
    const fs = require('fs');
    const path = require('path');
    const XmlStream = require('xml-stream');
    const xmlParser = require('xml2json');

    var listFidFiles = createListFromPath(pathFidFiles);
    var listNmrPeakFiles = createListFromPath(pathNmrPeakList);
    var listNmrSpectra = createListFromPath(pathNmrSpectra, {
        pId: 5,
        pDimension: [1,2,3]
    });

}

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

function createListFromPath(path, options = {}) {
    var {
        pAccession = 0,
        pDimension = [1],
        pId = 2
    } = options;
    var list = fs.readdirSync(path);
    var result = {};
    list.forEach((e) => {
        let temp = e.split('_');
        let accession = temp[pAccession];
        let dimension = pDimension.map((e) => temp[e]).join('');
        let id = String(temp[pId]).replace(/\.xml/, '');
        if (!result[accession]) result[accession] = {};
        let entry = result[accession];
        entry[id] = {
            dimension: dimension === 'nmroned' ? 1 : 2,
            fileName: e
        }
    })
    return result;
}

function handdleError(err) {
    if (!err) return;
    throw err
}

module.exports = nmrImport;
