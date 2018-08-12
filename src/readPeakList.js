const fs = require('fs');
const path = require('path');
const papa = require('papaparse');

//var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'

fs.readdir(pathNmrPeakList, (err, listDir) => {
    var resultJson = [];
    listDir.forEach((file) => {
        resultJson.push({});
        var temp = resultJson[resultJson.length - 1];
        var peakListData = fs.readFileSync(path.join(pathNmrPeakList, file), 'utf8');
        var original = String(peakListData)
        peakListData = peakListData.replace(/\n\n/g, '\n');
        if (peakListData.indexOf('\t') !== -1) {
            peakListData = peakListData.replace(/\s*\t+\s*/g, ' ');
        }
        var result = peakListData.split('\n')
        console.log(result.length)
        if (result.length === 2) {
            console.log('\n\nEL NOMBRE ES ' + file)
            console.log(JSON.stringify(peakListData))
            console.log('\n\n' + JSON.stringify(original))
        }
        
        // result.forEach((e, i, arr) => {
        //     
        //     let t = temporal.split('\n');
        //     if (i%2 > 0) {
        //         console.log(t)
        //         // let headers = t[0].split(' ');
        //         // console.log(headers);
        //     } else {
        //         let header = String(temporal);
        //         temp[header] = []
        //     }
            
        //     // arr[i] = temp;
        // })

    })
})

// var result = papa.parse(peakListData, {
//     header: true
// })
// console.log(result)
// console.log(peakListData)