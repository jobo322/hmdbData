var regexpByPair = {
    'noshift-ppm': {regexp: '([0-9]+)\\s+([0-9]+\\.[0-9]+)',flag: 'i'},
    'shift-ppmhs': {regexp: '([0-9]+\\.[0-9]+)\\s+([0-9]+)',flag: 'i'},
    'shift-ppmtype': {regexp: '([0-9]+\\.[0-9]+)\\s+([a-z]+(?![0-9])|br. s.)',flag: 'i'},
    'hsshift-ppm': {regexp: '([0-9]+)\\s+([0-9]+\\.[0-9]+)', flag: 'i'},
    'atomcoupling': {regexp: '([0-9]+[a-z]*)\\s+([0-9]+\\.[0-9]+|-)',flag: 'i'},
    'couplingatom': {regexp: '([0-9]+\\.[0-9]+|-)\\s+([0-9]+[a-z]*(?!\\.)[\\s+|;])',flag: 'i'},
    'atommultiplet': {regexp: '([0-9]+[a-z]*(?!\\.))\\s+(m[0-9]+)',flag: 'i'},
    'couplingmultiplet': {regexp: '([0-9]+\\.[0-9]+|-)\\s+(m[0-9]+)',flag: 'i'},
    'typecoupling': {regexp: '([a-z]+|br. s.)\\s+([0-9]+\\.[0-9]+|-)',flag: 'i'},
    'typeatom': {regexp: '([a-z]+|br. s.)\\s+([0-9]+[a-z]*(?!\\.))',flag: 'i'},
    'typemultiplet': {regexp: '([a-z]+|br. s.)\\s+(m[0-9]+)',flag: 'i'},
    'hstype': {regexp: '([0-9]+)\\s+([a-z]+|br. s.)',flag: 'i'},
    'nohs': {regexp: '([0-9]+)\\s+([0-9]+)', flag: 'i'},
    'hsatom': {regexp: '([0-9]+(?!\\.))\\s+([0-9]+[a-z]*(?!\\.))',flag: 'i'},
    'multipletrange': {regexp: '(m[0-9]+)\\s+([0-9]+\\.[0-9]+-[0-9]+\\.[0-9]+)', flag: 'i'},
    'atomrange': {regexp: '([0-9]+[a-z]*(?!\\.))\\s+([0-9]+\\.[0-9]+-[0-9]+\\.[0-9]+)', flag: 'i'}
}
Object.keys(regexpByPair).forEach((e) => {
    regexpByPair[e] = new RegExp(regexpByPair[e].regexp, regexpByPair[e].flag);
})

module.exports = regexpByPair;