'use strict';

// Taken from https://en.wikipedia.org/wiki/Comparison_of_programming_languages_(syntax)#Inline_comments
const singleline_comments = {
  'BASIC': 'REM',
  'batch': '::',
  'sh': '#',
  'tex': '%',
  'c-style': '//',
  'visualbasic': '\'',
  'fortran': '!',
  'assembly': ';',
  'sql': '--',
};

// Taken from https://en.wikipedia.org/wiki/Comparison_of_programming_languages_(syntax)#Block_comments
const multiline_comments = {
  'c-style': ['/*', '*/'],
  'algol-60': ['comment', ';'],
  'd': ['/+', '+/'],
  'cobra': ['/#', '#/'],
  'powershell': ['<#', '#>'],
  'html': ['<!--', '-->'],
  'xml': ['<!--', '-->'],
  'haskell': ['{-', '-}'],
  'matlab': ['%{', '%}'],
  'mustache': ['{{!', '}}'],
  'handlebars': ['{{!--', '--}}'],
  'lisp': ['#|', '|#'],
  'delphi': ['(*', '*)'],
};

exports = { singleline_comments, multiline_comments };