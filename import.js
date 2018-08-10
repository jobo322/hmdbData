const nmrMetadata = require('nmr-metadata');
const jcampconverter = require('jcampconverter');
const fs = require('fs-extra');

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
    var data = JSON.parse(await ctx.getContents('latin1'))
    result = Object.assign(result, data, {});
    result.attachmentIsSkipped = true;
    fs.move()
    //try to move the jcamp data to_process folder
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

async function tryMove(from, to, suffix = 0) {
    if (suffix > 1000) {
        throw new Error('tryMove: too many retries');
    }
    let newTo = to;
    if (suffix > 0) {
        newTo += '.' + suffix;
    }
    try {
        await fs.move(from, newTo);
    } catch (e) {
        if (e.code !== 'EEXIST') {
            throw new Error(`Could could rename ${from} to ${newTo}: ${e}`);
        }
        await tryMove(from, to, ++suffix);
    }
};

module.exports = nmrImport;