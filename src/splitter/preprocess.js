module.exports.protonic = function(peakListData) {
    peakListData = peakListData.replace(/\s+([0-9]+\.*[0-9]*)\s+\.{2}\s+([0-9]+\.*[0-9]*)/g, '\t$1|$2');
    peakListData = peakListData.toLowerCase().replace(/\(\s*(\w+)\s*\)(?=[\t| ]*)/g, '$1');
    peakListData = peakListData.replace(/\n*n+o\.*(\s+)/g,'\nno$1');
    peakListData = peakListData.replace(/\s*j\s+hz\s+/g, '\tcoupling\t');
    peakListData = peakListData.replace(/[ ]*\t*(a+tom[0-9]*)[ ]*\t*/g, '\t$1\t');
    peakListData = peakListData.replace(/([a-z]{2,})1/g, '$1');
    peakListData = peakListData.replace(/\s+(exp)\.*\s+(shift)\s+([[ppm]+|[hz]+])(?=\s+)/g, '\t$1-$2-$3');
    // console.log('\n\n' + JSON.stringify(peakListData));
    peakListData = peakListData.replace(/shift\s+ppm/g, 'shift-ppm');
    peakListData = peakListData.replace(/\s+hz\s+/g, '\tshift-hz\t');
    peakListData = peakListData.replace(/(\s+)ppm(?=\s*\n+)/g,'\trange');
    peakListData = peakListData.replace(/\s+ppm(?=\s+)/g, '\tshift-ppm');
    return peakListData;
}

module.exports.general = function(peakListData) {
    peakListData = peakListData.replace(/(\w*)\s+\n*([[N|n]+o\.*])/,'$1\n$2');
    peakListData = peakListData.replace(/[ ]*\n*[\t| ]*\n{1,}/g, '\n');
    peakListData = peakListData.replace(/[ ]*\n{1,}[\t| ]*\n*/g, '\n').replace(/([ ]*\n{1,}[ ]*\n*)$/g, '');
    return peakListData;
}