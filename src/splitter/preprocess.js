module.exports.protonic = function(peakListData) {
    peakListData = peakListData.replace(/[\t| ]+([0-9]+\.*[0-9]*)[\t| ]+\.{2}[\t| ]+([0-9]+\.*[0-9]*)/g, '\t$1-$2');
    peakListData = peakListData.toLowerCase().replace(/\(\s*(\w+)\s*\)(?=[\t| ]*)/g, '$1');
    peakListData = peakListData.replace(/\n*n+o\.*([\t| ]+)/g,'\nno$1');
    peakListData = peakListData.replace(/\s*j\s+hz\s+/g, '\tcoupling\t');
    peakListData = peakListData.replace(/[ ]*\t*(a+tom[0-9]*)[ ]*\t*/g, '\t$1\t');
    peakListData = peakListData.replace(/([a-z]{2,})1/g, '$1');
    peakListData = peakListData.replace(/[ ]*\t*([E|e]xp)\.*[ ]*\t*([S|s]hift)[ ]*\t*([[ppm]+|[Hz]+])[ ]*\t*/g, '\t$1-$2-$3\t');
    peakListData = peakListData.replace(/shift\s+ppm/g, 'shift-ppm')
    peakListData = peakListData.replace(/\s+hz\s+/g, '\tshift-hz\t');
    peakListData = peakListData.replace(/\s*ppm(?=\s*\n+)/g,'\trange');
    peakListData = peakListData.replace(/\s+ppm(?=\s+)/g, '\tshift-ppm');
    return peakListData;
}

module.exports.general = function(peakListData) {
    peakListData = peakListData.replace(/(\w*)\s+\n*([[N|n]+o\.*])/,'$1\n$2');
    peakListData = peakListData.replace(/[ ]*\n*[\t| ]*\n{1,}/g, '\n');
    peakListData = peakListData.replace(/[ ]*\n{1,}[\t| ]*\n*/g, '\n').replace(/([ ]*\n{1,}[ ]*\n*)$/g, '');
    return peakListData;
}