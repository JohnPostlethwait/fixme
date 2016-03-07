var expect = require('chai').expect;
var fs = require('fs');
var fixme = require('../index.js');
var path = require('path');
var os = require('os');

describe('fixme', function () {

    //TODO: use the quiet reporter of mocha once it becomes merged...
    //TODO: fix mocha's "Uncaught AssertionError" on async tests (without dirty setTimout hacks!)
    before(function () {
        //silence the console
        //console.log = function () {};
    });

    after(function () {
        //reset console
        //delete console.log;
    });
    it('should generate correct utf8 output WITHOUT colors on ' + (os.EOL === "\r\n" ? 'DOS/Window' : 'Posix(Unix/Linux)'), function (done) {
        //silence the console
        console.log = function () {};
        fixme({
            path: '.',
            ignored_directories: [],
            file_patterns: ['annotation_test.js'],
            file_encoding: 'utf8',
            line_length_limit: 1000,
            color: false
        }, function (out) {
            var filecontent = fs.readFileSync(path.join(__dirname, 'fixme.withoutcolor.' + (os.EOL === "\r\n" ? 'crlf' : 'lf') + '.txt'), 'utf8');
            //reset console before assertion, so mocha can print
            delete console.log;
            expect(out.trim()).to.equal(filecontent.trim());
            done();
        });
    });
    it('should generate correct utf8 output WITH colors on ' + (os.EOL === "\r\n" ? 'DOS/Window' : 'Posix(Unix/Linux)'), function (done) {
        //silence the console
        console.log = function () {};
        fixme({
            path: '.',
            ignored_directories: [],
            file_patterns: ['annotation_test.js'],
            file_encoding: 'utf8',
            line_length_limit: 1000,
            color: true
        }, function (out) {
            var filecontent = fs.readFileSync(path.join(__dirname, 'fixme.withcolor.' + (os.EOL === "\r\n" ? 'crlf' : 'lf') + '.txt'), 'utf8');
            //reset console before assertion, so mocha can print
            delete console.log;
            expect(out.trim()).to.equal(filecontent.trim());
            done();
        });
    });


});