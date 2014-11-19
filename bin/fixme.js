'use strict';


var byline        = require('byline'),
    chalk         = require('chalk'),
    eventStream   = require('event-stream'),
    fs            = require('fs'),
    isBinaryFile  = require('isbinaryfile'),
    minimatch     = require('minimatch'),
    readdirp      = require('readdirp');

var defaultDirectoriesIgnored = ['node_modules/**', '.git/**', '.hg/**'],
    defaultFileFilters        = ['**/*.js', 'Makefile', '**/*.sh'],
    defaultFileEncoding       = 'utf8',
    defaultLineLengthLimit    = 1000;

var checks = {
  note: {
    regex:    /.*(?:\/\/)\s*NOTE(.*):\s*(.+)*/,
    label:    '✐ NOTE: ',
    colorer:  chalk.green
  },
  optimize: {
    regex:    /.*(?:\/\/)\s*OPTIMIZE(.*):\s*(.+)*/,
    label:    '↻ OPTIMIZE: ',
    colorer:  chalk.blue
  },
  todo: {
    regex:    /.*(?:\/\/)\s*TODO(.*):\s*(.+)*/,
    label:    '✓ TODO: ',
    colorer:  chalk.yellow
  },
  hack: {
    regex:    /.*(?:\/\/)\s*HACK(.*):\s*(.+)*/,
    label:    '✄ HACK: ',
    colorer:  chalk.magenta
  },
  fixme: {
    regex:    /.*(?:\/\/)\s*FIXME(.*):\s*(.+)*/,
    label:    '☠ FIXME: ',
    colorer:  chalk.red
  }
};

// TODO (johnp): I feel like this could be simpler using negation patterns and one set, instead of one for files, and one for directories.
function fileFilterer (fileInformation) {
  var shouldIgnoreDirectory = false,
      shouldIgnoreFile      = true,
      letTheFileThrough;

  defaultDirectoriesIgnored.forEach(function (directoryPattern) {
    if (shouldIgnoreDirectory) return;
    shouldIgnoreDirectory = minimatch(fileInformation.path, directoryPattern);
  });

  if (!shouldIgnoreDirectory) {
    defaultFileFilters.forEach(function (filePattern) {
      if (!shouldIgnoreFile) return;

      shouldIgnoreFile = !(minimatch(fileInformation.name, filePattern));
    });
  }

  letTheFileThrough = !(shouldIgnoreDirectory || (!shouldIgnoreDirectory && shouldIgnoreFile));

  // Never let binary files through, searching them for comments will make no sense...
  if (letTheFileThrough && isBinaryFile(fileInformation.fullPath)) {
    letTheFileThrough = false;
  }

  return letTheFileThrough;
}

function retrieveMessagesFromLine (lineString, lineNumber) {
  var messageFormat = {
    author:       null,
    message:      null,
    label:        null,
    colorer:      null,
    line_number:  lineNumber
  },
  messages = [];

  Object.keys(checks).forEach(function (checkName) {
    var matchResults  = lineString.match(checks[checkName].regex),
        checker       = checks[checkName],
        thisMessage;

    if (matchResults && matchResults.length) {
      thisMessage = JSON.parse(JSON.stringify(messageFormat)); // Clone the above structure.

      thisMessage.label   = checker.label;
      thisMessage.colorer = checker.colorer;

      if (matchResults[1]) thisMessage.author   = matchResults[1];
      if (matchResults[2]) thisMessage.message  = matchResults[2];
    }

    if (thisMessage) messages.push(thisMessage);
  });

  return messages;
}

function getPaddedLineNumber (lineNumber, totalLinesNumber) {
  var paddedLineNumberString = '' + lineNumber;

  while (paddedLineNumberString.length < ('' + totalLinesNumber).length) {
    paddedLineNumberString = ' ' + paddedLineNumberString;
  }

  return paddedLineNumberString;
}

function formatMessageOutput (individualMessage, totalNumberOfLines) {
  var paddedLineNumber = getPaddedLineNumber(individualMessage.line_number, totalNumberOfLines),
      finalNoteString;

  finalNoteString =   chalk.gray('    [Line ' + paddedLineNumber + '] ');
  finalNoteString +=  chalk.bold(individualMessage.colorer(individualMessage.label));

  if (individualMessage.message && individualMessage.message.length) {
    finalNoteString += individualMessage.colorer(individualMessage.message);
  } else {
    finalNoteString += chalk.grey('[[no message to display]]');
  }

  return finalNoteString;
}

function formatFilePathOutput (filePath, numberOfMessages) {
  var filePathOutput = chalk.white('\n  • ' + filePath + ' '),
      messagesString = 'messages';

  if (numberOfMessages === 1) {
    messagesString = 'message';
  }

  filePathOutput += chalk.grey('[' + numberOfMessages + ' ' + messagesString + ']:');

  return filePathOutput;
}

function logMessages (messagesInfo, totalNumberOfLines) {
  if (messagesInfo.messages.length) {
    console.log(formatFilePathOutput(messagesInfo.path, messagesInfo.messages.length));

    messagesInfo.messages.forEach(function (message) {
      var formattedMessage = formatMessageOutput(message, totalNumberOfLines);

      console.log(formattedMessage);
    });
  }
}


var stream = readdirp({
  root:       '../lighthouse',
  fileFilter: fileFilterer
});

stream
  // TODO: Actually do something meaningful/useful with these handlers.
  .on('warn', function (err) { 
    console.warn('non-fatal error', err); 
    // optionally call stream.destroy() here in order to abort and cause 'close' to be emitted
  })
  .on('error', function (err) {
    console.error('fatal error', err);
  })
  .pipe(eventStream.map(function (fileInformation, callback) {
    var input                 = fs.createReadStream(fileInformation.fullPath, { encoding: defaultFileEncoding }),
        lineStream            = byline.createStream(input, { encoding: defaultFileEncoding }),
        fileMessages          = { path: null, messages: [] },
        currentFileLineNumber = 1;

    fileMessages.path = fileInformation.path;

    lineStream.on('data', function (fileLineString) {
      var messages,
          lengthError;

      if (fileLineString.length < defaultLineLengthLimit) {
        messages = retrieveMessagesFromLine(fileLineString, currentFileLineNumber);

        messages.forEach(function (message) {
          fileMessages.messages.push(message);
        });
      } else {
        lengthError = 'Fixme is skipping this line because its length is ' +
                      'greater than the maximum line-length of ' +
                      defaultLineLengthLimit + '.';

        fileMessages.messages.push({
          message:      lengthError,
          line_number:  currentFileLineNumber,
          label:        '⚠ WARNING: ',
          colorer:      chalk.underline.red
        });
      }

      currentFileLineNumber += 1;
    });

    lineStream.on('end', function () {
      logMessages(fileMessages, currentFileLineNumber, fileInformation);
    });

    callback();
  }));
