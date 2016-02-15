var fixme = require('../index.js');
//var fixme = require('fixme');
fixme({
    path: '../test/',
    ignored_directories: [],
    file_patterns: ['annotation_test.js'],
    file_encoding: 'utf8',
    line_length_limit: 1000
});