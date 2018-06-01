const fs = require('fs');
const XmlStream = require('xml-stream');

var stream = fs.createReadStream('../data/simple.xml');
var xmlStream = new XmlStream(stream);

xmlStream.preserve('subitem');
xmlStream.on('endElement: item', (item) => {
    console.log(item)
})