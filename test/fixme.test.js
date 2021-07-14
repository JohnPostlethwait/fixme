const chai = require('chai');
const chalk = require('chalk');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const expect = chai.expect;

const path = require('path');

const fixme = require('../bin/fixme');

chalk.level = 0;

describe('fixme', () => {
  beforeEach(() => {
    sinon.spy(console, 'log');
  });

  afterEach(() => {
    console.log.restore();
  });

  const valid_cases = path.join(__dirname, 'cases', 'valid');

  it('should recognize all verbs', (done) => {
    const options = {
      'path': valid_cases,
      'file_patterns': [ '**/verbs.txt' ],
    };

    fixme(options, () => {
      expect(console.log.callCount).to.equal(8);

      const messages = console.log.getCalls().map(c => c.args[0]);
      
      expect(messages[0]).to.equal('\n* verbs.txt [7 messages]:');

      // TODO: Fix formatting here once it's changed in code.
      expect(messages[1]).to.equal('  [Line  1]  ✐ NOTE: A note.');
      expect(messages[2]).to.equal('  [Line  2]  ↻ OPTIMIZE: A possible optimization.');
      expect(messages[3]).to.equal('  [Line  3]  ✓ TODO: A todo.');
      expect(messages[4]).to.equal('  [Line  4]  ✄ HACK: A hack.');
      expect(messages[5]).to.equal('  [Line  5]  ✗ XXX: An alternate fixme style.');
      expect(messages[6]).to.equal('  [Line  6]  ☠ FIXME: A fixme.');
      expect(messages[7]).to.equal('  [Line  7]  ☢ BUG: A bug.');

      done();
    });
  });

  it('should recognize strip whitespace', (done) => {
    const options = {
      'path': valid_cases,
      'file_patterns': [ '**/whitespace.txt' ],
    };

    fixme(options, () => {
      expect(console.log.secondCall.args[0]).to.equal(
        '  [Line 1]  ↻ OPTIMIZE: Maybe limit use of whitespace?'
      );
      
      done();        
    });
  });

  it('should recognize comments after code', (done) => {
    const options = {
      'path': valid_cases,
      'file_patterns': [ '**/after-code.txt' ],
    };

    fixme(options, () => {
      expect(console.log.secondCall.args[0]).to.equal(
        '  [Line 1]  ✐ NOTE: That\'s some code.'
      );

      done();
    });
  });

  it('should recognize an author', (done) => {
    const options = {
      'path': valid_cases,
      'file_patterns': [ '**/author.txt' ],
    };

    fixme(options, () => {
      expect(console.log.secondCall.args[0]).to.equal(
        '  [Line 1]  ✓ TODO from Jimmbo: Have a party.'
      );
      expect(console.log.thirdCall.args[0]).to.equal(
        '  [Line 5]  ✓ TODO from Mary: Grow.'
      );

      done();
    });
  });
});
