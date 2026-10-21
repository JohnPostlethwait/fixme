"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Builds a throwaway project tree to scan and returns its path.
function makeProject(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fixme-test-"));
  const files = {
    "a.js": "// TODO: in a.js\n",
    "src/b.py": "x = 1\n# not a match\n// FIXME(Ann): in b.py\n",
    "src/c.rb": "puts 1\n",
    "src/build/out.js": "// NOTE: in build output\n",
    "src/long.js": "// " + "x".repeat(50) + "\n// BUG: after a long line\n",
    "notes.unknown": "// TODO: not a scanned file type\n",
    "node_modules/dep/index.js": "// TODO: in node_modules\n",
    ".git/hooks/x.js": "// TODO: in .git\n",
  };

  for (const [file, contents] of Object.entries(files)) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), contents);
  }
  // A binary file with a matching extension and a matching string inside.
  fs.writeFileSync(
    path.join(root, "src/blob.js"),
    Buffer.concat([Buffer.from([0, 1, 2, 3, 0, 0, 255]), Buffer.from("// TODO: binary")]),
  );

  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

module.exports = { makeProject };
