const fs = require('fs');
const path = require('path');
const papa = require('papaparse');

//var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';
var pathNmrPeakList = 'C:\\Users\\juanCBA\\Documents\\hmdbProject\\hmdb_nmr_peak_lists'

fs.readdir(pathNmrPeakList, (err, listDir) => {
    var resultJson = {};
    listDir.forEach((file) => {
        if (file.toLowerCase().match('nmrtwod')) return
        let splitFileName = file.split('_');
        resultJson[splitFileName[0]] = {};
        var temp = resultJson[splitFileName[0]];
        var peakListData = fs.readFileSync(path.join(pathNmrPeakList, file), 'utf8');
        var dataLowerCase = peakListData.toLowerCase();
        var original = String(peakListData) // for debug
        peakListData = peakListData.replace(/\n{2,}/g, '\n');

        if (peakListData.indexOf('\t') !== -1) {
            peakListData = peakListData.replace(/[ ]*\t+[ ]*/g, ';');
        } else {
            peakListData = peakListData.replace(/[ ]+/g, ' ');
        }
        peakListData = peakListData.replace(/[ ]+\.\.[ ]+/g, '-')
        if (peakListData[peakListData.length - 1] === '\n') peakListData = peakListData.slice(0, peakListData.length - 1)

        if (peakListData.toLowerCase().indexOf('table') !== -1) {
            let result = peakListData.split('\n');
            console.log(result.length)
            if (result.length === 1) {
                console.log('\n\nEL NOMBRE ES ' + file)
                console.log(JSON.stringify(peakListData))
                console.log('\n\n' + JSON.stringify(original))
            }
        } else {
            // use some modification for file like  HMDB0000176_nmroned_1163_28507.txt
        }
        
        

        //
        

    })
})
