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
        if (!resultJson[splitFileName[0]]) resultJson[splitFileName[0]] = {};
        resultJson[splitFileName[0]][splitFileName[2]] = {};
        var temp = resultJson[splitFileName[0]][splitFileName[2]];

        var peakListData = fs.readFileSync(path.join(pathNmrPeakList, file), 'utf8');
        var dataLowerCase = peakListData.toLowerCase();
        var original = String(peakListData) // for debug

        peakListData = peakListData.replace(/[ ]+\.\.[ ]+/g, '-');
        if (peakListData.indexOf('\t') !== -1) {
            peakListData = peakListData.replace(/[ ]*\t+[ ]*/g, ';');
        } else {
            peakListData = peakListData.replace(/\n[ ]+/g,'\n');
            peakListData = peakListData.replace(/[ ]+/g, ';');
        }
        
        if (peakListData[peakListData.length - 1] === '\n') peakListData = peakListData.slice(0, peakListData.length - 1)

        let hasTable = peakListData.toLowerCase().indexOf('table') !== -1;
        let hasList = peakListData.toLowerCase().indexOf('list') !== -1;
        if (hasTable || hasList) {
            return
            peakListData = peakListData.replace(/\n{2,}/g, '\n');
            let result = peakListData.split('\n');
            let descriptorExist = false;
            let headersExist = false;
            let headers = [];
            let descriptor = ''
            result.forEach((e,i,arr) => {
                hasTable = e.toLowerCase().indexOf('table') !== -1;
                hasList = e.toLowerCase().indexOf('list') !== -1;
                if (hasTable || hasList) {
                    descriptorExist = true;
                    headersExist = false;
                    descriptor = e.toLowerCase().replace(/[ ]+/g, ' ')
                    temp[descriptor] = []
                } else if (descriptorExist) {
                    let eSplited = e.split(';');
                    if (eSplited.length > 1 && !headersExist) {
                        headersExist = true;
                        headers = eSplited;
                    } else if (headersExist) {
                        let toExport = {}
                        headers.forEach((head, i) => {
                            toExport[head] = eSplited[i] || '-';
                        })
                        temp[descriptor].push(toExport)
                    }
                }
            })
            console.log(JSON.stringify(temp))
            // console.log(result.length)
            // if (result.length === 1) {
            //     console.log('\n\nEL NOMBRE ES ' + file)
            //     console.log(JSON.stringify(peakListData))
            //     console.log('\n\n' + JSON.stringify(original))
            // }
        } else {
            // return
            // use some modification for file like  HMDB0000176_nmroned_1163_28507.txt
            console.log('\n\nEL NOMBRE ES ' + file)
            console.log(JSON.stringify(peakListData))
            console.log('\n\n' + JSON.stringify(original))
            let result = peakListData.split('\n');
            let descriptorExist = false;
            let headersExist = false;
            let headers = [];
            let descriptor = '';
            console.log(result)
            result.forEach((e, i, arr) => {
                hasTable = e.toLowerCase().indexOf('table') !== -1;
                hasList = e.toLowerCase().indexOf('list') !== -1;
                if (hasTable || hasList) {
                    descriptorExist = true;
                    headersExist = false;
                    descriptor = e.toLowerCase().replace(/[ ]+/g, ' ')
                    temp[descriptor] = []
                } else if (descriptorExist) {
                    let eSplited = e.split(';');
                    if (eSplited.length > 1 && !headersExist) {
                        headersExist = true;
                        headers = eSplited;
                    } else if (headersExist) {
                        let toExport = {}
                        headers.forEach((head, i) => {
                            toExport[head] = eSplited[i] || '-';
                        })
                        temp[descriptor].push(toExport)
                    }
                }
            })
        }
    // fs.writeFileSync('export.json', JSON.stringify(resultJson))
    
        //
        

    })
})
