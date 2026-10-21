"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const fixme = require("..");
const fileTypes = require("../bin/fileTypes");

// A file for every default pattern, annotated in that language's comment syntax.
const samples = {
  "**/*.js": ["a.js", "// TODO: x"],
  "Makefile": ["Makefile", "# TODO: x"],
  "**/*.sh": ["a.sh", "# TODO: x"],
  "**/*.html": ["a.html", "<!-- TODO: x -->"],
  "**/*.css": ["a.css", "/* TODO: x */"],
  "**/*.json": ["a.json", "// TODO: x"],
  "**/*.md": ["a.md", "<!-- TODO: x -->"],
  "**/*.txt": ["a.txt", "# TODO: x"],
  "**/*.yaml": ["a.yaml", "key: value # TODO: x"],
  "**/*.xml": ["a.xml", "<!-- TODO: x -->"],
  "**/*.yml": ["a.yml", "# TODO: x"],
  "**/*.scss": ["a.scss", "// TODO: x"],
  "**/*.less": ["a.less", "// TODO: x"],
  "**/*.php": ["a.php", "# TODO: x"],
  "**/*.java": ["a.java", "// TODO: x"],
  "**/*.py": ["a.py", "x = 1  # TODO: x"],
  "**/*.rb": ["a.rb", "#TODO: x"],
  "**/*.cpp": ["a.cpp", "// TODO: x"],
  "**/*.cs": ["a.cs", "/// TODO: x"],
  "**/*.swift": ["a.swift", "// TODO: x"],
  "**/*.rs": ["a.rs", "//! TODO: x"],
  "**/*.go": ["a.go", "// TODO: x"],
  "**/*.h": ["a.h", "/* TODO: x */"],
  "**/*.hpp": ["a.hpp", "// TODO: x"],
  "**/*.ts": ["a.ts", "// TODO: x"],
  "**/*.jsx": ["a.jsx", "{/* TODO: x */}"],
  "**/*.tsx": ["a.tsx", "// TODO: x"],
  "**/*.vue": ["a.vue", "<!-- TODO: x -->"],
  "**/*.pl": ["a.pl", "# TODO: x"],
  "**/*.lua": ["a.lua", "-- TODO: x"],
  "**/*.groovy": ["a.groovy", "// TODO: x"],
  "**/*.scala": ["a.scala", "// TODO: x"],
  "**/*.kt": ["a.kt", "// TODO: x"],
  "**/*.dart": ["a.dart", "/// TODO: x"],
};

test("every default file pattern has a sample", function () {
  assert.deepEqual(Object.keys(samples).sort(), [...fileTypes].sort());
});

test("finds annotations in every default file type", async function (t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fixme-types-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  for (const [file, line] of Object.values(samples)) {
    fs.writeFileSync(path.join(root, file), "first line\n" + line + "\n");
  }

  const found = Object.fromEntries(
    (await fixme.scan({ path: root })).map((f) => [
      f.path,
      f.messages.map((m) => [m.line_number, m.type, m.message]),
    ]),
  );

  for (const [file, line] of Object.values(samples)) {
    assert.deepEqual(found[file], [[2, "todo", "x"]], file + ": " + line);
  }
});

test("finds other comment styles", function () {
  const cases = {
    "-- FIXME: sql": "fixme",
    "## NOTE: markdown-style or doubled hash": "note",
    "  * HACK: inside a block comment": "hack",
    "{{!-- BUG: handlebars block --}}": "bug",
    "// todo: lower case with a colon": "todo",
    "# TODO lower-case colon is optional for upper case": "todo",
  };
  for (const [line, type] of Object.entries(cases)) {
    assert.deepEqual(
      fixme.retrieveMessagesFromLine(line, 1).map((m) => m.type),
      [type],
      line,
    );
  }
});

test("does not report code or prose that only mentions a keyword", function () {
  const lines = [
    // Issue #25
    "    if (data.report_type === 'others' && !note) {",
    "const note = !todo;",
    "#note { color: red; }",
    "a = b * note",
    " * Note that this function is slow.",
    "// todo list goes here",
    "x--; todo();",
    "see http://example.com/#todo: here",
    'echo "#TODO: in a string"',
    "  bug = find_bug()  # the bug finder",
  ];
  for (const line of lines) {
    assert.deepEqual(fixme.retrieveMessagesFromLine(line, 1), [], line);
  }
});

test("handles CRLF line endings", async function (t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fixme-crlf-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "a.js"), "x\r\n// TODO: crlf\r\ny\r\n");

  const [file] = await fixme.scan({ path: root });

  assert.equal(file.total_lines, 3);
  assert.deepEqual(file.messages.map((m) => [m.line_number, m.message]), [[2, "crlf"]]);
});

test("reads files with the given encoding", async function (t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fixme-enc-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "a.js"), Buffer.from("// TODO: café\n", "latin1"));

  const [file] = await fixme.scan({ path: root, file_encoding: "latin1" });

  assert.equal(file.messages[0].message, "café");
});

test("rejects a path that does not exist", async function () {
  await assert.rejects(
    fixme.scan({ path: path.join(os.tmpdir(), "fixme-does-not-exist") }),
    /ENOENT/,
  );
});
