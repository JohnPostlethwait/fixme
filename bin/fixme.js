"use strict";

var fs = require("fs"),
  path = require("path"),
  readline = require("readline"),
  styleText = require("util").styleText,
  isBinaryFile = require("isbinaryfile").isBinaryFile,
  minimatch = require("minimatch").minimatch;

var defaults = {
    path: null, // process.cwd() at call time
    ignored_directories: ["node_modules/**", ".git/**", ".hg/**"],
    file_patterns: require("./fileTypes"),
    file_encoding: "utf8",
    line_length_limit: 1000,
    skip: [],
  },
  messageChecks = {
    note: { label: " ✐ NOTE", style: ["green"] },
    optimize: { label: " ↻ OPTIMIZE", style: ["blue"] },
    todo: { label: " ✓ TODO", style: ["magenta"] },
    hack: { label: " ✄ HACK", style: ["yellow"] },
    xxx: { label: " ✗ XXX", style: ["black", "bgYellow"] },
    fixme: { label: " ☠ FIXME", style: ["red"] },
    bug: { label: " ☢ BUG", style: ["white", "bgRed"] },
  },
  lineTooLong = { label: " ⚠ SKIPPING CHECK", style: ["underline", "red"] },
  // A message ends at the first comment closer: -->, --}}, }}, #}, */
  commentEnd = /\s*(?:--\}\}|-->|\}\}|#\}|\*\/).*$/;

// Comment openers an annotation can follow. #, --, and * only count at the
// start of a line or after whitespace, so `a--`, `"#x"` and `a * b` don't.
var commentMarker = [
  "(?:^|[^:])\\/\\/+!?", // //, ///, //! (but not the // in http://)
  "\\/\\*+!?", // /*, /**
  "(?:^|\\s)(?:#+|--|\\*+)", // #, ##, --, and * inside a block comment
  "<!--",
  "\\{\\{!(?:--)?", // {{! and {{!--
  "\\{#",
].join("|");

// Groups: 1 keyword, 2 author, 3 colon, 4 message.
Object.keys(messageChecks).forEach(function (checkName) {
  messageChecks[checkName].regex = new RegExp(
    "(?:" + commentMarker + ")\\s*@?(" + checkName + ")\\b" +
      "\\s*(?:\\(([^:)]*)\\))?\\s*(:)?\\s*(.*)",
    "gi",
  );
});

/**
 * An upper-case keyword is an annotation. Any other case needs a colon, so
 * that comments like "* Note that..." or "// todo list" are not reported.
 */
function isAnnotation(matchResults) {
  return (
    matchResults[1] === matchResults[1].toUpperCase() ||
    matchResults[3] === ":"
  );
}

/**
 * Merges the user options over the defaults.
 *
 * @param   {Object} options See parseUserOptionsAndScan.
 *
 * @return  {Object}
 */
function resolveOptions(options) {
  var resolved = Object.assign({}, defaults, { path: process.cwd() });

  options = options || {};

  if (options.path) resolved.path = options.path;
  if (nonEmptyArray(options.ignored_directories)) {
    resolved.ignored_directories = options.ignored_directories;
  }
  if (nonEmptyArray(options.file_patterns)) {
    resolved.file_patterns = options.file_patterns;
  }
  if (options.file_encoding) resolved.file_encoding = options.file_encoding;
  if (options.line_length_limit) {
    resolved.line_length_limit = Number(options.line_length_limit);
  }
  if (nonEmptyArray(options.skip)) resolved.skip = options.skip;

  return resolved;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function matchesAny(filePath, patterns, minimatchOptions) {
  return patterns.some(function (pattern) {
    return minimatch(filePath, pattern, minimatchOptions);
  });
}

/**
 * Recursively lists the files under the scan path that match the file
 * patterns and are not inside an ignored directory. Directories matching an
 * ignore pattern are not descended into. Binary files are never returned, as
 * searching them for comments makes no sense.
 *
 * @param   {Object} options Resolved options.
 *
 * @return  {Promise<Array>} Sorted, '/'-separated paths relative to options.path.
 */
async function findFiles(options) {
  var found = [];

  async function walk(relativeDir) {
    var entries;

    try {
      entries = await fs.promises.readdir(
        path.join(options.path, relativeDir),
        { withFileTypes: true },
      );
    } catch (err) {
      if (!relativeDir) throw err; // The scan path itself is unreadable.
      console.warn("fixme: unable to read directory " + relativeDir + ": " + err.message);
      return;
    }

    entries.sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

    for (var entry of entries) {
      var relativePath = relativeDir ? relativeDir + "/" + entry.name : entry.name;

      if (entry.isDirectory()) {
        if (!matchesAny(relativePath + "/", options.ignored_directories, { dot: true })) {
          await walk(relativePath);
        }
      } else if (
        entry.isFile() &&
        !matchesAny(relativePath, options.ignored_directories, { dot: true }) &&
        matchesAny(relativePath, options.file_patterns) &&
        !(await isBinaryFile(path.join(options.path, relativePath)))
      ) {
        found.push(relativePath);
      }
    }
  }

  await walk("");

  return found;
}

/**
 * Takes a line of a file and the line number, and returns an array of all of
 * the messages found in that line. Can return multiple messages per line, for
 * example, if it has more than one comment. EG: // FIXME: one // TODO: two
 *
 * Each message has a type (the check name), a label, a line_number, an author
 * (or null) and a message (or null).
 *
 * @param   {String} lineString
 * @param   {Number} lineNumber
 * @param   {Array}  [skip] Names of checks to skip.
 *
 * @return  {Array}
 */
function retrieveMessagesFromLine(lineString, lineNumber, skip) {
  var messages = [];

  Object.keys(messageChecks).forEach(function (checkName) {
    if (skip && skip.indexOf(checkName) !== -1) return;

    var matchResults = Array.from(
      lineString.matchAll(messageChecks[checkName].regex),
    ).find(isAnnotation);

    if (matchResults) {
      var message = matchResults[4].replace(commentEnd, "").trim();

      messages.push({
        type: checkName,
        label: messageChecks[checkName].label,
        line_number: lineNumber,
        author: matchResults[2] && matchResults[2].trim() ? matchResults[2].trim() : null,
        message: message || null,
      });
    }
  });

  return messages;
}

/**
 * Reads a file line-by-line and collects its messages.
 *
 * @param   {String} relativePath
 * @param   {Object} options Resolved options.
 *
 * @return  {Promise<Object>} { path, total_lines, messages }
 */
async function scanFile(relativePath, options) {
  var fileMessages = { path: relativePath, total_lines: 0, messages: [] },
    lines = readline.createInterface({
      input: fs.createReadStream(path.join(options.path, relativePath), {
        encoding: options.file_encoding,
      }),
      crlfDelay: Infinity,
    });

  for await (var line of lines) {
    fileMessages.total_lines += 1;

    if (line.length < options.line_length_limit) {
      fileMessages.messages.push.apply(
        fileMessages.messages,
        retrieveMessagesFromLine(line, fileMessages.total_lines, options.skip),
      );
    } else if (options.skip.indexOf("line") === -1) {
      fileMessages.messages.push({
        type: "line",
        label: lineTooLong.label,
        line_number: fileMessages.total_lines,
        author: null,
        message:
          "Fixme is skipping this line because its length is " +
          "greater than the maximum line-length of " +
          options.line_length_limit +
          ".",
      });
    }
  }

  return fileMessages;
}

/**
 * Scans the configured path and resolves with the messages of every file that
 * has at least one, without printing anything.
 *
 * @param   {Object} [options] See parseUserOptionsAndScan.
 *
 * @return  {Promise<Array>} [{ path, total_lines, messages }]
 */
async function scan(options) {
  var resolved = resolveOptions(options),
    results = [];

  for (var relativePath of await findFiles(resolved)) {
    var fileMessages = await scanFile(relativePath, resolved);

    if (fileMessages.messages.length) results.push(fileMessages);
  }

  return results;
}

/**
 * Applies the given styles (util.styleText format names) to text, if the
 * output supports color. Respects NO_COLOR, FORCE_COLOR and NODE_DISABLE_COLORS.
 */
function style(formats, text) {
  var forced = process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0",
    enabled =
      forced ||
      (typeof process.stdout.hasColors === "function" && process.stdout.hasColors());

  if (!enabled) return text;

  return formats.reduceRight(function (styled, format) {
    return styleText(format, styled, { validateStream: false });
  }, text);
}

/**
 * Formats a file's messages for output.
 *
 * @param   {Object} fileMessages As resolved by scanFile.
 *
 * @return  {String}
 */
function formatFileMessages(fileMessages) {
  var count = fileMessages.messages.length,
    width = String(fileMessages.total_lines).length,
    output = [
      style(["bold", "white"], "\n* " + fileMessages.path + " ") +
        style(["gray"], "[" + count + " " + (count === 1 ? "message" : "messages") + "]:"),
    ];

  fileMessages.messages.forEach(function (message) {
    var check = messageChecks[message.type] || lineTooLong,
      label = message.label + (message.author ? " from " + message.author + ": " : ": ");

    output.push(
      style(["gray"], "  [Line " + String(message.line_number).padStart(width) + "] ") +
        style(["bold"].concat(check.style), label) +
        (message.message
          ? style(check.style, message.message)
          : style(["gray"], "[[no message to display]]")),
    );
  });

  return output.join("\n");
}

/**
 * Takes an options object and over-writes the defaults, then scans the files
 * for messages and prints them to stdout.
 *
 * @param     {Object}  options
 * @property  {String}  options.path                The base directory to recursively scan for messages. Defaults to process.cwd()
 * @property  {Array}   options.ignored_directories An array of minimatch glob patterns for directories to ignore scanning entirely.
 * @property  {Array}   options.file_patterns       An array of minimatch glob patterns for files to scan for messages.
 * @property  {String}  options.file_encoding       The encoding the files scanned will be opened with, defaults to 'utf8'.
 * @property  {Number}  options.line_length_limit   The number of characters a line can be before it is ignored. Defaults to 1000.
 * @property  {Array}   options.skip                An array of names of checks to skip.
 *
 * @return    {Promise<Array>} The same results as scan().
 */
// TODO(johnp): Allow custom messageChecks to be added via options.
async function parseUserOptionsAndScan(options) {
  var results = await scan(options);

  results.forEach(function (fileMessages) {
    console.log(formatFileMessages(fileMessages));
  });

  return results;
}

module.exports = parseUserOptionsAndScan;
module.exports.scan = scan;
module.exports.retrieveMessagesFromLine = retrieveMessagesFromLine;
module.exports.formatFileMessages = formatFileMessages;
