'use strict';
const XmlStream = require('xml-stream');
const defaultOptions = {};

function convert(stream, options = {}) {
    var {
        toPreserve = []
    } = options;
    var result = [];
    if (typeof stream === 'string') {
        stream = fs.createReadStream(stream);
    }

    if (!Array.isArray(toPreserve) && typeof toPreserve === 'string') {
        toPreserve = [toPreserve];
    }
    var xmlStream = new XmlStream(stream);

    for (let p of toPreserve) {
        xmlStream.preserve(p);
        
        xmlStream.on('endElement ' + p, (item) => {
        })
    }
}

module.exports = hmdbData;
