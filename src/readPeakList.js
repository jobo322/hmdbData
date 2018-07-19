const fs = require('fs');
const path = require('path');
const papa = require('papaparse');

var pathNmrPeakList = '/home/abolanos/hmdbProject/hmdb_nmr_peak_lists/';

var peakListData = fs.readFileSync(path.join(pathNmrPeakList, "HMDB0000005_nmroned_1024_27899.txt"), 'utf8');
var result = peakListData.split('\n\n')
// var result = papa.parse(peakListData, {
//     header: true
// })
console.log(result[0])