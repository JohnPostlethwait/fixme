"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const pkg = require("../package.json");
const { makeProject } = require("./helpers");

const cli = path.join(__dirname, "..", "bin", "cli");

function run(args, options) {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  Object.assign(env, options && options.env);
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: options && options.cwd,
    env,
    encoding: "utf8",
  });
}

test("--version prints the package version", function () {
  assert.equal(run(["--version"]).trim(), pkg.version);
  assert.equal(run(["-v"]).trim(), pkg.version);
});

test("--help prints usage", function () {
  assert.match(run(["--help"]), /^Usage:/);
});

test("scans the current directory by default, without color when piped", function (t) {
  const root = makeProject(t);

  assert.equal(
    run([], { cwd: root }),
    [
      "",
      "* a.js [1 message]:",
      "  [Line 1]  ✓ TODO: in a.js",
      "",
      "* src/b.py [1 message]:",
      "  [Line 3]  ☠ FIXME from Ann: in b.py",
      "",
      "* src/build/out.js [1 message]:",
      "  [Line 1]  ✐ NOTE: in build output",
      "",
      "* src/long.js [1 message]:",
      "  [Line 2]  ☢ BUG: after a long line",
      "",
    ].join("\n"),
  );
});

test("accepts path, patterns, ignores, line limit and skip", function (t) {
  const root = makeProject(t);
  const out = run(["-p", root, "-i", "**/build/**", "-l", "40", "-s", "bug", "src/**/*.js"]);

  assert.equal(
    out,
    "\n* src/long.js [1 message]:\n" +
      "  [Line 1]  ⚠ SKIPPING CHECK: Fixme is skipping this line because its length is greater than the maximum line-length of 40.\n",
  );
});

test("FORCE_COLOR turns color on", function (t) {
  const root = makeProject(t);

  assert.match(run(["a.js"], { cwd: root, env: { FORCE_COLOR: "1" } }), /\u001b\[/);
});

test("exits 1 when the path does not exist", function () {
  assert.throws(
    () => run(["-p", path.join(__dirname, "does-not-exist")]),
    (err) => err.status === 1 && /fixme: ENOENT/.test(err.stderr),
  );
});
