const nmrMetadata = require('nmr-metadata');
const jcampconverter = require('jcampconverter');
const fs = require('fs-extra');
const path = require('path');

async function nmrImport(ctx, result) {
    const ext = ctx.fileExt.toLowerCase();
    switch (ext) {
        case '.json':
            await importFromJSON(ctx, result);
            break
        case '.jdx':
        case '.fid':
            await importJcamp(ctx, result);
            break
    }
};

async function importFromJSON(ctx, result) {
    //check(ctx);
    const filename = ctx.filename;
    let toProcessPath = ctx.fileDir;
    var data = JSON.parse(await ctx.getContents('latin1'))
    result = Object.assign(result, data, {});
    result.groups = [];
    result.attachmentIsSkipped = true;
    try {
        fs.move(data.filePath, toProcessPath)
    } catch (e) {
        console.log(e)
    }
}

async function importJcamp(ctx, result) {
    result.kind = 'sample';
    const filename = ctx.filename;
    result.groups = [];
    result.jpath = ['spectra', 'nmr'];
    result.content_type = 'chemical/x-jcamp-dx';
    result.reference = filename.replace(/\.(fid|jdx)$/, '');

    let contents = await ctx.getContents('latin1');
    throw new Error('stop for debug');
    // username, catalog and batch are stored in the jcamp, need to parse it
    const jcamp = jcampconverter.convert(contents, {
        keepRecordsRegExp: /.*/,
        withoutXY: true
    });
    let title = jcamp.info.TITLE, reg = /(?:\w*:)(.*)(?:\n|$)/igm;
    let match = title.match(reg).map((e) => e.replace(reg, '$1'));
    result.owner = match.splice(2)[0];
    result.id= match;
    result.content = {};
    
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
}
nmrImport.source = [];

module.exports = nmrImport;