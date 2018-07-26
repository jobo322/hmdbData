const fs = require('fs');
const path = require('path');
const pathToRead = '/home/abolanos/hmdbProject/hmdb_metabolite_json';
var counter = 1
fs.readdir(pathToRead, async (err, result) => {
    listWithNmrData = [];
    result.forEach((e, i) => {
        // let removeIt = true
        let file = fs.readFileSync(path.join(pathToRead, e), {encoding: 'utf8', flag: 'r'})
        let dataJson = JSON.parse(file);
        let spectra = dataJson.spectra;
        if (spectra.some((e,i) => {
            return e.type.slice(8).toLowerCase() === 'nmroned'
        })) {
            // listWithNmrData.push(e)
            console.log(counter++)
        }
    })
});

