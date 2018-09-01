//var peakListData = "Table of Peaks\nNo.\t(ppm)\t(Hz)\tHeight\n1\t0.000\t0.00\t0.1190\n2\t1.182\t708.59\t0.9893\n3\t1.193\t715.64\t1.0000\n4\t2.744\t1645.65\t0.0153\n5\t2.756\t1652.67\t0.0496\n6\t2.761\t1655.73\t0.0188\n7\t2.766\t1658.99\t0.0577\n8\t2.767\t1659.70\t0.0530\n9\t2.773\t1662.76\t0.0582\n10\t2.778\t1666.01\t0.0542\n11\t2.783\t1669.05\t0.0602\n12\t2.784\t1669.76\t0.0608\n13\t2.790\t1673.04\t0.0173\n14\t2.795\t1676.08\t0.0552\n15\t2.807\t1683.13\t0.0167\n16\t3.154\t1891.81\t0.1363\n17\t3.171\t1901.87\t0.1252\n18\t3.176\t1904.57\t0.1530\n19\t3.193\t1914.63\t0.1415\n20\t3.469\t2080.70\t0.1426\n21\t3.480\t2086.98\t0.1412\n22\t3.491\t2093.46\t0.1274\n23\t3.501\t2099.72\t0.1224\n\nTable of Multiplets\nNo.\tShift1 (ppm)\tHs\tType\tJ (Hz)\tAtom1\tMultiplet1\t (ppm)\n1\t1.187\t3\td\t7.06\t8\tM04\t1.170 .. 1.204\n2\t2.775\t1\tm\t10.34 7.04 6.70\t5\tM03\t2.740 .. 2.810\n3\t3.174\t1\tdd\t12.76 10.06\t4\tM02\t3.149 .. 3.198\n4\t3.485\t1\tdd\t12.75 6.27\t4\tM01\t3.464 .. 3.508\n\nTable of Assignments\nNo.\tAtom\tExp. Shift (ppm)\tMultiplet\n1\t8\t1.187\tM04\n2\t5\t2.775\tM03\n3\t4\t3.174\tM02\n4\t4\t3.485\tM01\n"

var line = '3\t3.174\t1\tdd\t12.76 10.06\t4\tM02\t3.149 .. 3.198';
peakListData = line;
peakListData = peakListData.toLowerCase().replace(/[\t| ]+([0-9]+\.*[0-9]*)[\t| ]+\.{2}[\t| ]+([0-9]+\.*[0-9]*)/g, '\t$1-$2');
peakListData = peakListData.replace(/\((\w+)\)(?=[\t| ]*)/g, '$1');
peakListData = peakListData.replace(/\n*[N|n]+o\.*([\t| ]+)/g,'\nNo.$1');
peakListData = peakListData.replace(/\s+j\s+hz\s+/g, '\tcoupling\t');
peakListData = peakListData.replace(/(\w*)\s+\n*([[N|n]+o\.*])/,'$1\n$2');
peakListData = peakListData.replace(/[ ]*\n*[\t| ]*\n{1,}/g, '\n');
peakListData = peakListData.replace(/[ ]*\n{1,}[\t| ]*\n*/g, '\n').replace(/([ ]*\n{1,}[ ]*\n*)$/g, '');
peakListData = peakListData.replace(/[ ]*\t*([A|a]+tom[0-9]*)[ ]*\t*/g, '\t$1\t');
peakListData = peakListData.replace(/([a-z]+)1/g, '$1');
peakListData = peakListData.replace(/[ ]*\t*([E|e]xp)\.*[ ]*\t*([S|s]hift)[ ]*\t*([[ppm]+|[Hz]+])[ ]*\t*/g, '\t$1-$2-$3\t');
peakListData = peakListData.replace(/shift\s+ppm/g, 'shitf-ppm')
peakListData = peakListData.replace(/\s+hz\s+/g, '\tshift-hz\t');
peakListData = peakListData.replace(/\s+ppm(?=\s*\n+)/g,'\trange');
peakListData = peakListData.replace(/\s+ppm(?=\s+)/, '\tshift-ppm');
// console.log(JSON.stringify(peakListData))

var line = peakListData;

line = line.replace(/(m[0-9]+)\s+/, '$1;');
line = line.replace(/([a-z]+)\s+([0-9]+\.[0-9]+)/g, '$1;$2');

line = line.replace(/([0-9]+[a-z]*)(?!\.)\s+(m[0-9]+)/g, '$1;$2');
console.log(JSON.stringify(line))
return
line = line.replace(/([0-9]+\.[0-9]+)\s+([0-9]+)(?!\.)/g, '$1;$2');
line = line.replace(/([0-9]+\.[0-9]+)\s+/g, '$1|');
line = line.replace(/([0-9]+)\s+([a-z]+|\d+(?:\.))/g, '$1;$2'); //works
// encapsulate the atom assignments when there is not coupling
line = line.replace(/(;[a-z]+)\s+([0-9]+[a-z]*)(?!\.)/g, '$1;-;$2');
line = line.replace(/\s+-\s+/g, ';-;')

