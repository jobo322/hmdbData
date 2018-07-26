const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const cheerio = require('cheerio');
const fs = require('fs');

var baseUrl = 'http://www.hmdb.ca'
var URL = 'http://www.hmdb.ca/metabolites'

var metaboliteList = [];
let result = getData(URL)
while (!result.URL.lastOne) {
    result = getData(result.URL.next)
}
console.log(metaboliteList.length)

function getData(URL, options = {}) {
    var req = new XMLHttpRequest();
    console.log(URL)
    req.open('GET', URL, false);
    req.send(null);
    console.log(req.status)
    if (req.status === 200) {
        let cheerioLoaded = cheerio.load(req.responseText);
        let nextPageURL = getNextPageURL(cheerioLoaded);
        // console.log(nextPageURL)
        addMetaboliteLinks(metaboliteList, cheerioLoaded)
        return {URL: nextPageURL, metaboliteList}
    } else {
        return getData(URL, options)
    }
}
// // read the responseText saved

// fs.readFile('responseText', {encoding: 'utf8', flag: 'r'},(err, data) => {
//     eerioLoaded = cheerio.load(data);
    
//     let nextPageURL = getNextPageURL(cheerioLoaded);
//     addMetabo
// })

function addMetaboliteLinks(list, cheerioLoaded) {
    cheerioLoaded('.metabolite-link a').each((index, element) => {
        list.push(element.attribs.href)
    })
    return list;
}

function getNextPageURL(cheerioLoaded) {
    let nextPageURL, lastOne = true;
    cheerioLoaded('.next_page a').each((index, element) => {
        if (index > 0) return;
        lastOne = false;
        nextPageURL = baseUrl + element.attribs.href;
    }) 
    return {next: nextPageURL, lastOne};
}