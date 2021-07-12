const chai = require("chai");
const chalk = require("chalk");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const expect = chai.expect;

const path = require("path");

const fixme = require("../bin/fixme");

chalk.level = 0;

describe("fixme", () => {
  beforeEach(() => {
    sinon.spy(console, "log");
  });

  afterEach(() => {
    console.log.restore();
  });

  it("should recognize a TODO", (done) => {
    const options = {
      "path": path.join(__dirname, "cases", "valid"),
      "file_patterns": [ "**/todo.txt" ],
    };

    fixme(options, done);
  });
});
