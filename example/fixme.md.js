var fixme = require('../index.js');
var path = require('path');
//var fixme = require('fixme');
fixme({
    path: path.join(__dirname, '../test/'),
    ignored_directories: [],
    file_patterns: ['annotation_test.js'],
    file_encoding: 'utf8',
    line_length_limit: 40000,
    color: false,
    md: true
}, function (out) {
    console.log(out);
    //fs.writeFileSync('out.md',out,'utf8');
});