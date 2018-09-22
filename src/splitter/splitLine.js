module.exports.splitDataLine = function(line, headers, descriptor, regexpByPair) {
    let lineSplited;
    let neighbors = getNeighbors(headers);
    line = line.replace(/\s+-\s+/g, ';-;')// preservar no asignaciones
    switch (descriptor) {
        case 'peaks':
            lineSplited = splitPeakLine(line, headers, regexpByPair);
            break;
        case 'multiplets':
            lineSplited = splitMultipletLine(line, headers, regexpByPair);
            break;
        case 'assignments':
            lineSplited = splitAssignmentLine(line, headers, neighbors);
    }
    return lineSplited;
}

function splitPeakLine(line, headers, regexpByPair) {
    line = splitByNeighbors(line, headers, regexpByPair, 1);
    return line.split(';');;
}

function splitAssignmentLine(line, headers, descriptor) {
    line = line.replace(/(\d+)\s+/g,'$1;')
    let indexOfAtom = headers.indexOf('atom');
    if (indexOfAtom !== -1) {
        let indexOfShift = Math.max(headers.indexOf('exp-shift-ppm'), headers.indexOf('shift-ppm'));
        if (indexOfAtom < indexOfShift) {
            line = line.replace(/^(\d+);(\d+\.\d+)/g,'$1;-;$2');
        }
    }
    line = line.replace(/([0-9]+[a-z]*)\s+([a-z]+|\d+(?:\.))/g, '$1;$2');
    line = line.replace(/([0-9]+[a-z]*)(?!\.)\s+/g, '$1|');
    line = line.replace(/\s+-\s+/g, ';-;')// preservar no asignaciones
    line = line.replace(/;$/,'');
    let lineSplited = line.split(';');
    return lineSplited;
}

function splitMultipletLine(line, headers, regexpByPair) {
    line = splitByNeighbors(line, headers, regexpByPair, 1);
    line = line.replace(/([0-9]+[a-z]*)(?!\.)\s+/g, '$1|');
    if (line.split(';').length !== headers.length) line = splitByNeighbors(line, headers, regexpByPair, 2);
    

    return line.split(';');
}

function splitByNeighbors(line, headers, regexpByPair, order) {
    let neighbors = getNeighbors(headers, order);
    let listToDo = [];
    for (let i = 0; i < headers.length - 1; i++) {
        let name;
        if (neighbors[headers[i]].left) {
            let name = neighbors[headers[i]].left + headers[i]
            if (listToDo.indexOf(name) === -1) listToDo.push(name)
        }
        if (neighbors[headers[i]].right) {
            name = headers[i] + neighbors[headers[i]].right;
            if (listToDo.indexOf(name) === -1) listToDo.push(name)
        }
    }
    let howToSeparate = order === 1 ? '$1;$2' : '$1;-;$2';
    listToDo.forEach((e,i) => {
        line = line.replace(regexpByPair[e], howToSeparate)

    })
    return line
}

function getNeighbors(headers, order = 1) {
    let result = {};
    headers.forEach((e, i, array) => {
        result[e] = {
            right: array[i + order],
            left: array[i - order],
        }
    })
    return result;
}
