"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fixme = require("..");
const { makeProject } = require("./helpers");

function summarize(results) {
  return results.map((file) => [file.path, file.messages.map((m) => m.type)]);
}

test("scans default file types and skips ignored dirs and binaries", async function (t) {
  const root = makeProject(t);

  assert.deepEqual(summarize(await fixme.scan({ path: root })), [
    ["a.js", ["todo"]],
    ["src/b.py", ["fixme"]],
    ["src/build/out.js", ["note"]],
    ["src/long.js", ["bug"]],
  ]);
});

test("reports the line number, total lines and author", async function (t) {
  const root = makeProject(t);
  const [b] = await fixme.scan({ path: root, file_patterns: ["**/*.py"] });

  assert.equal(b.path, "src/b.py");
  assert.equal(b.total_lines, 3);
  assert.deepEqual(b.messages, [
    { type: "fixme", label: " ☠ FIXME", line_number: 3, author: "Ann", message: "in b.py" },
  ]);
});

test("honours ignored_directories", async function (t) {
  const root = makeProject(t);
  const results = await fixme.scan({ path: root, ignored_directories: ["**/build/**"] });

  assert.deepEqual(
    results.map((f) => f.path),
    ["a.js", "node_modules/dep/index.js", "src/b.py", "src/long.js"],
  );
});

test("honours file_patterns", async function (t) {
  const root = makeProject(t);
  const results = await fixme.scan({ path: root, file_patterns: ["src/*.js"] });

  assert.deepEqual(results.map((f) => f.path), ["src/long.js"]);
});

test("flags lines over line_length_limit and skips them", async function (t) {
  const root = makeProject(t);
  const [long] = await fixme.scan({
    path: root,
    file_patterns: ["src/long.js"],
    line_length_limit: 40,
  });

  assert.deepEqual(
    long.messages.map((m) => [m.line_number, m.type]),
    [[1, "line"], [2, "bug"]],
  );
  assert.match(long.messages[0].message, /maximum line-length of 40/);
});

test("skip removes checks only for that call", async function (t) {
  const root = makeProject(t);
  const opts = { path: root, file_patterns: ["src/long.js"], line_length_limit: 40 };

  assert.deepEqual(await fixme.scan({ ...opts, skip: ["bug", "line"] }), []);
  assert.deepEqual(summarize(await fixme.scan(opts)), [["src/long.js", ["line", "bug"]]]);
});

test("the default export prints and resolves with the results", async function (t) {
  const root = makeProject(t);
  const logged = [];
  t.mock.method(console, "log", (line) => logged.push(line));

  const results = await fixme({ path: root, file_patterns: ["a.js"] });

  assert.deepEqual(summarize(results), [["a.js", ["todo"]]]);
  assert.deepEqual(logged, [
    "\n* a.js [1 message]:\n  [Line 1]  ✓ TODO: in a.js",
  ]);
});
