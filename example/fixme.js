var fixme = require('../index.js');
//var fixme = require('fixme');
var path = require('path');
var fs = require('fs');
fixme({color: false}); //no effect, still colored
fixme({
    path: path.join(__dirname, '../test/'),
    ignored_directories: [],
    file_patterns: ['annotation_test.js'],
    file_encoding: 'utf8',
    line_length_limit: 40000,
    color: false //no effect, still colored
});
fixme({
    path: path.join(__dirname, '../test/'),
    ignored_directories: [],
    file_patterns: ['annotation_test.js'],
    file_encoding: 'utf8',
    line_length_limit: 40000,
    color: false
}, function (out) {
    console.log(out);
});
fixme({
    path: path.join(__dirname, '../test/'),
    ignored_directories: [],
    file_patterns: ['annotation_test.js'],
    file_encoding: 'utf8',
    line_length_limit: 40000,
    color: true
}, function (out) {
    console.log(out);
});
