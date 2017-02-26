'use strict';

var byline        = require('byline'),
    chalk         = require('chalk'),
    eventStream   = require('event-stream'),
    fs            = require('fs'),
    isBinaryFile  = require('isbinaryfile'),
    minimatch     = require('minimatch'),
    readdirp      = require('readdirp');

var ignoredDirectories  = ['node_modules/**', '.git/**', '.hg/**'],
    filesToScan         = ['**/*.js', 'Makefile', '**/*.sh'],
    scanPath            = process.cwd(),
    fileEncoding        = 'utf8',
    lineLengthLimit     = 1000,
    skipChecks          = [],
    messageChecks       = {
      note: {
        regex:    /[\/\/][\/\*]\s*NOTE\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
        label:    ' ✐ NOTE',
        colorer:  chalk.green
      },
      optimize: {
        regex:    /[\/\/][\/\*]\s*OPTIMIZE\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
        label:    ' ↻ OPTIMIZE',
        colorer:  chalk.blue
      },
      todo: {
        regex:    /[\/\/][\/\*]\s*TODO\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
        label:    ' ✓ TODO',
        colorer:  chalk.magenta
      },
      hack: {
        regex:    /[\/\/][\/\*]\s*HACK\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
        label:    ' ✄ HACK',
        colorer:  chalk.yellow
      },
      xxx: {
        regex:    /[\/\/][\/\*]\s*XXX\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
        label:    ' ✗ XXX',
        colorer:  chalk.black.bgYellow
      },
      fixme: {
        regex:    /[\/\/][\/\*]\s*FIXME\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
        label:    ' ☠ FIXME',
        colorer:  chalk.red
      },
      bug: {
        regex:    /[\/\/][\/\*]\s*BUG\s*(?:\(([^:]*)\))*\s*:?\s*(.*)/i,
        label:    ' ☢ BUG',
        colorer:  chalk.white.bgRed
      }
    };

/**
 * Determines whether or not to let the file through. by ensuring that the
 * file name does not match one of the excluded directories, and ensuring it
 * matches one of the file filters.
 *
 * It will also ensure that even if a binary file matches the filter patterns,
 * it will not let it through as searching binary file contents for string
 * matches will never make sense.
 *
 * @param   {String} fileInformation
 *
 * @return  {Boolean}
 */
// TODO: This could be simpler using minimatch negation patterns in one set, instead disparate ones for files and directories.
function fileFilterer (fileInformation) {
  var shouldIgnoreDirectory = false,
      shouldIgnoreFile      = true,
      letTheFileThrough;

  ignoredDirectories.forEach(function (directoryPattern) {
    if (shouldIgnoreDirectory) return;
    shouldIgnoreDirectory = minimatch(fileInformation.path, directoryPattern, { dot: true });
  });

  if (!shouldIgnoreDirectory) {
    filesToScan.forEach(function (filePattern) {
      if (!shouldIgnoreFile) return;

      shouldIgnoreFile = !(minimatch(fileInformation.name, filePattern));
    });
  }

  letTheFileThrough = !(shouldIgnoreDirectory || (!shouldIgnoreDirectory && shouldIgnoreFile));

  // Never let binary files through, searching them for comments will make no sense...
  if (letTheFileThrough && isBinaryFile.sync(fileInformation.fullPath)) {
    letTheFileThrough = false;
  }

  return letTheFileThrough;
}

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
  var messageFormat = {
    author:       null,
    message:      null,
    label:        null,
    colorer:      null,
    line_number:  lineNumber
  },
  messages = [];

  Object.keys(messageChecks).forEach(function (checkName) {
    var matchResults  = lineString.match(messageChecks[checkName].regex),
        checker       = messageChecks[checkName],
        thisMessage;

    if (matchResults && matchResults.length) {
      thisMessage = JSON.parse(JSON.stringify(messageFormat)); // Clone the above structure.

      thisMessage.label   = checker.label;
      thisMessage.colorer = checker.colorer;

      if (matchResults[1] && matchResults[1].length) {
        thisMessage.author = matchResults[1].trim();
      }

      if (matchResults[2] && matchResults[2].length) {
        thisMessage.message = matchResults[2].trim();
      }
    }

    if (thisMessage) messages.push(thisMessage);
  });

  return messages;
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
  var paddedLineNumberString = '' + lineNumber;

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
  var paddedLineNumber = getPaddedLineNumber(individualMessage.line_number, totalNumberOfLines),
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
 * Formatter function for the file name. Takes a file path, and the total
 * number of messages in the file, and formats this information for display as
 * the heading for the file messages.
 *
 * @param   {String} filePath
 * @param   {Number} numberOfMessages
 *
 * @return  {String}
 */
function formatFilePathOutput (filePath, numberOfMessages) {
  var filePathOutput = chalk.bold.white('\n* ' + filePath + ' '),
      messagesString = 'messages';

  if (numberOfMessages === 1) {
    messagesString = 'message';
  }

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
      var formattedMessage = formatMessageOutput(message, messagesInfo.total_lines);

      console.log(formattedMessage);
    });
  }
}

/**
 * Reads through the configured path scans the matching files for messages.
 */
function scanAndProcessMessages () {
  var stream = readdirp({
    root:       scanPath,
    fileFilter: fileFilterer
  });

  // Remove skipped checks for our mapping
  skipChecks.forEach(function (checkName) {
    delete messageChecks[checkName];
  });

  // TODO: Actually do something meaningful/useful with these handlers.
  stream
    .on('warn', console.warn)
    .on('error', console.error);

  stream
    .pipe(eventStream.map(function (fileInformation, callback) {
      var input                 = fs.createReadStream(fileInformation.fullPath, { encoding: fileEncoding }),
          // lineStream            = byline.createStream(input, { encoding: fileEncoding }),
          fileMessages          = { path: null, total_lines: 0, messages: [] },
          currentFileLineNumber = 1;

      fileMessages.path = fileInformation.path;

      input.pipe( eventStream.split() )
        .pipe( eventStream.map( function( fileLineString, cb ){
          var messages,
              lengthError;

          if (fileLineString.length < lineLengthLimit) {
            messages = retrieveMessagesFromLine(fileLineString, currentFileLineNumber);

            messages.forEach(function (message) {
              fileMessages.messages.push(message);
            });
          } else if (skipChecks.indexOf('line') === -1){
            lengthError = 'Fixme is skipping this line because its length is ' +
                          'greater than the maximum line-length of ' +
                          lineLengthLimit + '.';

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
 */
 // TODO(johnp): Allow custom messageChecks to be added via options.
function parseUserOptionsAndScan (options) {
  if (options) {
    if (options.path) {
      scanPath = options.path;
    }

    if (options.ignored_directories &&
        Array.isArray(options.ignored_directories) &&
        options.ignored_directories.length) {
      ignoredDirectories = options.ignored_directories;
    }

    if (options.file_patterns &&
        Array.isArray(options.file_patterns) &&
        options.file_patterns.length) {
      filesToScan = options.file_patterns;
    }

    if (options.file_encoding) {
      fileEncoding = options.file_encoding;
    }

    if (options.line_length_limit) {
      lineLengthLimit = options.line_length_limit;
    }

    if (options.skip &&
        Array.isArray(options.skip) &&
        options.skip.length) {
      skipChecks = options.skip;
    }
  }

  scanAndProcessMessages();
}

module.exports = parseUserOptionsAndScan;
