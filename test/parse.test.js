"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fixme = require("..");

function parse(line, skip) {
  return fixme.retrieveMessagesFromLine(line, 1, skip).map(function (m) {
    return { type: m.type, author: m.author, message: m.message };
  });
}

test("finds each annotation type", function () {
  for (const type of ["note", "optimize", "todo", "hack", "xxx", "fixme", "bug"]) {
    assert.deepEqual(parse("// " + type.toUpperCase() + ": msg"), [
      { type, author: null, message: "msg" },
    ]);
  }
});

test("captures an author in parentheses", function () {
  assert.deepEqual(parse("// TODO(Jane Doe): msg"), [
    { type: "todo", author: "Jane Doe", message: "msg" },
  ]);
  assert.deepEqual(parse("// TODO (Jane Doe)  :   msg  "), [
    { type: "todo", author: "Jane Doe", message: "msg" },
  ]);
});

test("is case-insensitive and allows an @ prefix", function () {
  assert.deepEqual(parse("// @fixme: msg"), [
    { type: "fixme", author: null, message: "msg" },
  ]);
});

test("supports block, HTML, handlebars and twig comments", function () {
  const cases = {
    "/* BUG: msg */": "bug",
    "<!-- NOTE: msg -->": "note",
    "{{! HACK: msg }}": "hack",
    "{{!-- XXX: msg --}}": "xxx",
    "{# OPTIMIZE: msg #}": "optimize",
  };
  for (const [line, type] of Object.entries(cases)) {
    assert.deepEqual(parse(line), [{ type, author: null, message: "msg" }], line);
  }
});

test("matches after code on the same line", function () {
  assert.deepEqual(parse("foo(); // NOTE: msg"), [
    { type: "note", author: null, message: "msg" },
  ]);
});

test("returns a null message when there is none", function () {
  assert.deepEqual(parse("// FIXME:"), [
    { type: "fixme", author: null, message: null },
  ]);
});

test("only the word right after a comment marker counts", function () {
  assert.deepEqual(parse("// FIXME TODO: msg").map((m) => m.type), ["fixme"]);
  assert.deepEqual(
    parse("// FIXME: one // TODO: two").map((m) => m.type),
    ["todo", "fixme"],
  );
});

test("ignores URLs and plain words", function () {
  assert.deepEqual(parse("// https://bugzilla.mozilla.org/show_bug.cgi?id=1"), []);
  assert.deepEqual(parse("const todo = 1;"), []);
  assert.deepEqual(parse("// a NOTEWORTHY thing"), []);
});

test("skips the given checks", function () {
  assert.deepEqual(parse("// TODO: msg", ["todo"]), []);
});

test("parses every annotation in the fixture file", async function () {
  const results = await fixme.scan({
    path: path.join(__dirname, "fixtures"),
    file_patterns: ["annotations.txt"],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].path, "annotations.txt");
  assert.deepEqual(
    results[0].messages.map((m) => [m.line_number, m.type, m.author, m.message]),
    [
      [1, "note", null, "This is the sample output for a note!"],
      [2, "optimize", "John Postlethwait", "This is the sample output for an optimize with an author!"],
      [3, "todo", null, "This is the sample output for a todo!"],
      [4, "hack", null, "This is the sample output for a hack! Don't commit hacks!"],
      [5, "xxx", null, "This is the sample output for a XXX! XXX's need attention too!"],
      [6, "fixme", "John Postlethwait", "This is the sample output for a fixme! Seriously fix this..."],
      [7, "bug", null, "This is the sample output for a bug! Who checked in a bug?!"],
      [8, "bug", null, "This is the sample output for a bug! Who checked in a bug?!"],
      [13, "note", null, "It doesn't need to be placed at line start!"],
      [14, "todo", null, "HTML comments are supported"],
      [15, "hack", null, "Handlebars comments are supported"],
      [16, "fixme", null, "Twig comments are supported"],
      [17, "xxx", null, "Handlebars block comments are supported"],
      [18, "todo", null, "lower case with a colon and an @ prefix still match"],
      [19, "note", "Jane Doe", "whitespace is trimmed"],
      [20, "fixme", null, null],
    ],
  );
});
