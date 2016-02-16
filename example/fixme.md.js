var fixme = require('../index.js');
var path = require('path');
//var fixme = require('fixme');
var Convert = require('ansi-to-html');
var convert = new Convert();
var fs = require('fs');

fixme({
    path: path.join(__dirname, '../test/'),
    ignored_directories: [],
    file_patterns: ['annotation_test.js'],
    file_encoding: 'utf8',
    line_length_limit: 40000,
    color: true,
    md: true
}, function (out) {
    console.log(out);
    //console.log(convert.toHtml(out));
    fs.writeFileSync(path.join(__dirname,'out.md'),convert.toHtml(out),'utf8');
    fs.writeFileSync(path.join(__dirname,'out.raw.md'),out,'utf8');
});