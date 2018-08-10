const fs = require('fs');
const path = require('path');
const xmlReader = require('xmlreader');


const pathToRead = '/home/abolanos/hmdbProject/hmdb_nmr_spectra';
var counter = 1
var counterWithoutR = 0;
fs.readdir(pathToRead, (err, result) => {
    let listWithNmrData = {};
    let listOfDatabase = {};
    result.forEach((e, i) => {
        let parts = e.split('_');
        if (parts[2] !== 'one') return;
        let file = fs.readFileSync(path.join(pathToRead, e), {encoding: 'utf8', flag: 'r'});
        xmlReader.read(file, (err, result) => {
            let content = result['nmr-one-d'];
            let databaseId = content['database-id'].text();
            if (!content['references']) {
                return
            } else if (!content['references'].reference) {
                counterWithoutR++;
                // console.log('voy' + String(counter++))
                return
            } else {
                // console.log('voy' + String(counter++))
            }
            content['references'].reference.each((index, element) => {
                let db = element.database.text();
                if (!listOfDatabase[db]) {
                    listOfDatabase[db] = {}
                } 
                let temp = listOfDatabase[db]
                temp[databaseId] = {
                    'databaseId': element['database-id'].text()
                }
            })
            
            
        })
        // let removeIt = true
        // let file = fs.readFileSync(path.join(pathToRead, e), {encoding: 'utf8', flag: 'r'})
        // let dataJson = JSON.parse(file);
        // let spectra = dataJson.spectra;
        // if (spectra.some((e,i) => {
        //     return e.type.slice(8).toLowerCase() === 'nmroned'
        // })) {
        //     // listWithNmrData.push(e)
        //     console.log(counter++)
        // }
    })
    console.log(Object.keys(listWithNmrData).length)
    console.log(listOfDatabase)
    console.log(counterWithoutR);
});

