'use strict';

const byline       = require('byline');
const chalk        = require('chalk');
const eventStream  = require('event-stream');
const fs           = require('fs');
const isBinaryFile = require('isbinaryfile');
const minimatch    = require('minimatch');
const readdirp     = require('readdirp');

let messageChecks      = {
  note: {
    regex:    /(?:^|[^:])(\/\/|\{\{!|!|\{#|\*)(--)?\s*@?NOTE\b\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
    label:    ' ✐ NOTE',
    colorer:  chalk.green
  },
  optimize: {
    regex:    /(?:^|[^:])(\/\/|\{\{!|!|\{#|\*)(--)?\s*@?OPTIMIZE\b\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
    label:    ' ↻ OPTIMIZE',
    colorer:  chalk.blue
  },
  todo: {
    regex:    /(?:^|[^:])(\/\/|\{\{!|!|\{#|\*)(--)?\s*@?TODO\b\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
    label:    ' ✓ TODO',
    colorer:  chalk.magenta
  },
  hack: {
    regex:    /(?:^|[^:])(\/\/|\{\{!|!|\{#|\*)(--)?\s*@?HACK\b\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
    label:    ' ✄ HACK',
    colorer:  chalk.yellow
  },
  xxx: {
    regex:    /(?:^|[^:])(\/\/|\{\{!|!|\{#|\*)(--)?\s*@?XXX\b\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
    label:    ' ✗ XXX',
    colorer:  chalk.black.bgYellow
  },
  fixme: {
    regex:    /(?:^|[^:])(\/\/|\{\{!|!|\{#|\*)(--)?\s*@?FIXME\b\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
    label:    ' ☠ FIXME',
    colorer:  chalk.red
  },
  bug: {
    regex:    /(?:^|[^:])(\/\/|\{\{!|!|\{#|\*)(--)?\s*@?BUG\b\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
    label:    ' ☢ BUG',
    colorer:  chalk.white.bgRed
  }
};

/**
 * Takes a line of a file and the line number, and returns an array of all of
 * the messages found in that line. Can return multiple messages per line, for
 * example, if a message was annotated with more than one type. EG: FIXME TODO
 *
 * Each message in the array will have a label, a line_number, a colorer, and a
 * message. Will also include an author property if one is found on the
 * message.
 *
 * @param   {String} lineString The
 * @param   {Number} lineNumber
 *
 * @return  {Array}
 */
function retrieveMessagesFromLine (lineString, lineNumber) {
  const messageFormat = {
    author:      null,
    message:     null,
    label:       null,
    colorer:     null,
    line_number: lineNumber
  };
  const messages = [];

  lineString = removeCommentEnd(lineString, ['-->', '#}}', '*/', '--}}', '}}', '#}'], '');

  Object.keys(messageChecks).forEach(function (checkName) {
    let matchResults  = lineString.match(messageChecks[checkName].regex),
      checker       = messageChecks[checkName],
      thisMessage;

    if (matchResults && matchResults.length) {
      thisMessage = JSON.parse(JSON.stringify(messageFormat)); // Clone the above structure.

      thisMessage.label   = checker.label;
      thisMessage.colorer = checker.colorer;

      if (matchResults[3] && matchResults[3].length) {
        thisMessage.author = matchResults[3].trim();
      }

      if (matchResults[4] && matchResults[4].length) {
        thisMessage.message = matchResults[4].trim();
      }
    }

    if (thisMessage) messages.push(thisMessage);
  });

  return messages;
}

/**
 * Removes the end of html, twig and handlebar comments. EG: -->, --}}, etc.
 *
 * @param   {String} str
 * @param   {Array} find
 * @param   {String} replace
 *
 * @return  {String}
 */
function removeCommentEnd(str, find, replace) {
  let replaceString = str;
  for (let i = 0; i < find.length; i++) {
    replaceString = replaceString.replace(find[i], replace);
  }
  return replaceString;
}

/**
 * Takes a line number and returns a padded string matching the total number of
 * characters in totalLinesNumber. EG: A lineNumber of 12 and a
 * totalLinesNumber of 1323 will return the string '  12'.
 *
 * @param   {Number} lineNumber
 * @param   {Number} totalLinesNumber
 *
 * @return  {String}
 */
function getPaddedLineNumber (lineNumber, totalLinesNumber) {
  let paddedLineNumberString = '' + lineNumber;

  while (paddedLineNumberString.length < ('' + totalLinesNumber).length) {
    paddedLineNumberString = ' ' + paddedLineNumberString;
  }

  return paddedLineNumberString;
}

/**
 * Takes an individual message object, as output from retrieveMessagesFromLine
 * and formats it for output.
 *
 * @param     {Object}    individualMessage
 * @property  {String}    individualMessage.author
 * @property  {String}    individualMessage.message
 * @property  {String}    individualMessage.label
 * @property  {Function}  individualMessage.colorer
 * @property  {Number}    individualMessage.line_number
 * @param     {Number}    totalNumberOfLines
 *
 * @return    {String}    The formatted message string.
 */
function formatMessageOutput (individualMessage, totalNumberOfLines) {
  let paddedLineNumber = getPaddedLineNumber(individualMessage.line_number, totalNumberOfLines),
    finalLabelString,
    finalNoteString;

  finalNoteString = chalk.gray('  [Line ' + paddedLineNumber + '] ');

  finalLabelString = individualMessage.label;

  if (individualMessage.author) {
    finalLabelString += (' from ' + individualMessage.author + ': ');
  } else {
    finalLabelString += ': ';
  }

  finalLabelString = chalk.bold(individualMessage.colorer(finalLabelString));

  finalNoteString += finalLabelString;

  if (individualMessage.message && individualMessage.message.length) {
    finalNoteString += individualMessage.colorer(individualMessage.message);
  } else {
    finalNoteString += chalk.grey('[[no message to display]]');
  }

  return finalNoteString;
}

/**
 * Formatter function for the file name. Formats a heading for display from
 * the file path and number of messages.
 *
 * @param   {String} filePath
 * @param   {Number} numberOfMessages
 *
 * @return  {chalk.Chalk}
 */
function formatFilePathOutput (filePath, numberOfMessages) {
  let filePathOutput = chalk.bold.white('\n* ' + filePath + ' ');
  const messagesString = numberOfMessages === 1 ? 'message' : 'messages';

  filePathOutput += chalk.grey('[' + numberOfMessages + ' ' + messagesString + ']:');

  return filePathOutput;
}

/**
 * Takes an object representing the messages and other meta-info for the file
 * and calls off to the formatters for the messages, as well as logs the
 * formatted result.
 *
 * @param     {Object}  messagesInfo
 * @property  {String}  messagesInfo.path The file path
 * @property  {Array}   messagesInfo.messages All of the message objects for the file.
 * @property  {String}  messagesInfo.total_lines Total number of lines in the file.
 */
function logMessages (messagesInfo) {
  if (messagesInfo.messages.length) {
    console.log(formatFilePathOutput(messagesInfo.path, messagesInfo.messages.length));

    messagesInfo.messages.forEach(function (message) {
      let formattedMessage = formatMessageOutput(message, messagesInfo.total_lines);

      console.log(formattedMessage);
    });
  }
}

/**
 * Reads through the configured path scans the matching files for messages.
 * 
 * @param {Function} [done] Optional callback for when processing is finished.
 */
function scanAndProcessMessages (options, done) {
  let stream = readdirp(options.path, {
    fileFilter: function (fileInformation) {
      // TODO: This could be simpler using minimatch negation patterns in one set, instead disparate ones for files and directories.

      let shouldIgnoreDirectory = false;
      let shouldIgnoreFile      = true;
      let letTheFileThrough = true;
    
      options.ignored_directories.forEach(function (directoryPattern) {
        if (shouldIgnoreDirectory) return;
        shouldIgnoreDirectory = minimatch(fileInformation.path, directoryPattern, { dot: true });
      });
    
      if (!shouldIgnoreDirectory) {
        options.file_patterns.forEach(function (filePattern) {
          if (!shouldIgnoreFile) return;
    
          shouldIgnoreFile = !(minimatch(fileInformation.path, filePattern));
        });
      }
    
      letTheFileThrough = !(shouldIgnoreDirectory || (!shouldIgnoreDirectory && shouldIgnoreFile));
    
      // Never let binary files through, searching them for comments will make no sense...
      if (letTheFileThrough && isBinaryFile.isBinaryFileSync(fileInformation.fullPath)) {
        letTheFileThrough = false;
      }
    
      return letTheFileThrough;
    }
  });

  // Remove skipped checks for our mapping
  options.skip.forEach(function (checkName) {
    delete messageChecks[checkName];
  });

  // TODO: Actually do something meaningful/useful with these handlers.
  stream
    .on('warn', console.warn)
    .on('error', console.error);

  stream
    .pipe(eventStream.map(function (fileInformation, callback) {
      let input                 = fs.createReadStream(fileInformation.fullPath, { encoding: options.fileEncoding }),
        // lineStream            = byline.createStream(input, { encoding: fileEncoding }),
        fileMessages          = { path: null, total_lines: 0, messages: [] },
        currentFileLineNumber = 1;

      fileMessages.path = fileInformation.path;

      input.pipe( eventStream.split() )
        .pipe( eventStream.map( function( fileLineString, cb ){
          let messages,
            lengthError;

          if (fileLineString.length < options.line_length_limit) {
            messages = retrieveMessagesFromLine(fileLineString, currentFileLineNumber);

            messages.forEach(function (message) {
              fileMessages.messages.push(message);
            });
          } else if (options.skip.indexOf('line') === -1){
            lengthError = 'Fixme is skipping this line because its length is ' +
                          'greater than the maximum line-length of ' +
                          options.line_length_limit + '.';

            fileMessages.messages.push({
              message:      lengthError,
              line_number:  currentFileLineNumber,
              label:        ' ⚠ SKIPPING CHECK',
              colorer:      chalk.underline.red
            });
          }

          currentFileLineNumber += 1;
        })
        );

      input.on('end', function () {
        fileMessages.total_lines = currentFileLineNumber;

        logMessages(fileMessages);
        if (done) done();
      });

      callback();
    }));
}

/**
 * Takes an options object and over-writes the defaults, then calls off to the
 * scanner to scan the files for messages.
 *
 * @param     {Object}  options
 * @property  {String}  options.path                The base directory to recursively scan for messages. Defaults to process.cwd()
 * @property  {Array}   options.ignored_directories An array of minimatch glob patterns for directories to ignore scanning entirely.
 * @property  {Array}   options.file_patterns       An array of minimatch glob patterns for files to scan for messages.
 * @property  {String}  options.file_encoding       The encoding the files scanned will be opened with, defaults to 'utf8'.
 * @property  {Number}  options.line_length_limit   The number of characters a line can be before it is ignored. Defaults to 1000.
 * @property  {Array}   options.skip                An array of names of checks to skip.
 * 
 * @param {Function} [done] An optional callback to execute once processing is done. Takes no arguments.
 */
// TODO(johnp): Allow custom messageChecks to be added via options.
function parseUserOptionsAndScan (options, done) {
  const args = {
    path: process.cwd(),
    ignored_directories: ['node_modules/**', '.git/**', '.hg/**'],
    file_patterns: ['**/*.js', 'Makefile', '**/*.sh'],
    file_encoding: 'utf8',
    line_length_limit: 1000,
    skip: []
  };

  if (options) {
    if (options.path) {
      args.path = options.path;
    }

    if (options.ignored_directories &&
        Array.isArray(options.ignored_directories) &&
        options.ignored_directories.length) {
      args.ignored_directories = options.ignored_directories;
    }

    if (options.file_patterns &&
        Array.isArray(options.file_patterns) &&
        options.file_patterns.length) {
      args.file_patterns = options.file_patterns;
    }

    if (options.file_encoding) {
      args.file_encoding = options.file_encoding;
    }

    if (options.line_length_limit) {
      args.line_length_limit = options.line_length_limit;
    }

    if (options.skip &&
        Array.isArray(options.skip) &&
        options.skip.length) {
      args.skip = options.skip;
    }
  }

  scanAndProcessMessages(args, done);
}

module.exports = parseUserOptionsAndScan;
