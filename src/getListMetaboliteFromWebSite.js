const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const cheerio = require('cheerio');
const fs = require('fs');

var baseUrl = 'http://www.hmdb.ca'
var URL = 'http://www.hmdb.ca/metabolites'

var req = new XMLHttpRequest();
console.log(URL)
req.open('GET', URL + '/HMDB0000002', false);
req.send(null);
console.log(req.status)
if (req.status === 200) {
    let fd = fs.openSync('responseHMDB0000002', 'w')
    fs.write(fd, req.responseText)
    fs.close(fd)
    let cheerioLoaded = cheerio.load(req.responseText);
}