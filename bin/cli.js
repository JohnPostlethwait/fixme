'use strict';

let minimist = require('minimist'),
  fixme    = require('..'),
  pkg      = require('../package');

function help() {
  return '\
Usage:\n\
\n\
  fixme [options] [file|glob ...]\n\
\n\
Options:\n\
\n\
  -h, --help                 output usage information\n\
  -v, --version              output version\n\
  -p, --path                 path to scan (default: process.cwd())\n\
  -i, --ignored_directories  glob patterns for directories to ignore (default: node_modules/**, .git/**, .hg/**)\n\
  -e, --file_encoding        file encoding to be scanned (default: utf8)\n\
  -l, --line_length_limit    number of max characters a line (default: 1000)\n\
  -s, --skip                 list of checks to skip (default: none)\n\
\n\
Examples:\n\
\n\
  By default:\n\
\n\
    fixme\n\
\n\
  Some ignored directories and some including files:\n\
\n\
    fixme -i \'node_modules/**\' -i \'.git/**\' -i \'build/**\' \'src/**/*.js\' \'test/*\' \n\
';
}

let argv = minimist(process.argv.slice(2));

if (argv.version || argv.v) {
  console.log(pkg.version);
  process.exit();
}

if (argv.help || argv.h) {
  console.log(help());
  process.exit();
}

let options = {};

let path = argv.path || argv.p;
if (path) {
  options.path = path;
}

let ignored_directories = argv.ignored_directories || argv.i;
if (typeof ignored_directories === 'string') {
  ignored_directories = [ignored_directories];
}
if (ignored_directories) {
  options.ignored_directories = ignored_directories;
}

let file_patterns = argv._;
if (file_patterns.length > 0) {
  options.file_patterns = file_patterns;
}

let file_encoding = argv.file_encoding || argv.e;
if (file_encoding) {
  options.file_encoding = file_encoding;
}

let line_length_limit = argv.line_length_limit || argv.l;
if (line_length_limit) {
  options.line_length_limit = line_length_limit;
}

let skip = argv.skip || argv.s;
if (typeof skip === 'string') {
  skip = [skip];
}
if (skip) {
  options.skip = skip;
}

fixme(options);
