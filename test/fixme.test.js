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
  describe('options', () => {
    describe('path', () => {
      it('should accept a string');
      it('should not accept a number or ')
    });
    describe('ignored_directories', () => {
      it('should accept an array');
      it('should accept a string');
    });
    describe('file_patterns', () => {
      it('should accept an array');
      it('should accept a string');
    });
    describe('file_encoding', () => {
      it('should do something?');
    });
    describe('line_length_limit', () => {
      it('should stop after the limit');
      it('should not accept negative values');
    });
    describe('skip', () => {
      it('should skip a verb (take a string)');
      it('should skip verbs (take an array)');
      it('should ignore unknown values');
    });
  });

  describe('valid annotations', () => {
    const options = {
      'path': path.join(__dirname, 'cases', 'valid')
    };

    beforeEach(() => {
      sinon.stub(console, 'log');
    });

    afterEach(() => {
      console.log.restore();
    });

    it('should recognize all verbs', (done) => {
      options.file_patterns = [ '**/verbs.txt' ];

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
      options.file_patterns = [ '**/whitespace.txt' ];

      fixme(options, () => {
        expect(console.log.secondCall.args[0]).to.equal(
          '  [Line 1]  ↻ OPTIMIZE: Maybe limit use of whitespace?'
        );
      
        done();        
      });
    });

    it('should recognize comments after code', (done) => {
      options.file_patterns = [ '**/after-code.txt' ];

      fixme(options, () => {
        expect(console.log.secondCall.args[0]).to.equal(
          '  [Line 1]  ✐ NOTE: That\'s some code.'
        );

        done();
      });
    });

    it('should recognize an author', (done) => {
      options.file_patterns = [ '**/author.txt' ];

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

    it('should recognize single character messages', (done) => {
      options.file_patterns = [ '**/one-character.txt'];

      fixme(options, () => {
        const messages = console.log.getCalls().map(c => c.args[0]);

        expect(messages[1]).to.equal('  [Line 1]  ✄ HACK: .');
        expect(messages[2]).to.equal('  [Line 4]  ✄ HACK: .');
        expect(messages[3]).to.equal('  [Line 5]  ✄ HACK: .');
        expect(messages[4]).to.equal('  [Line 6]  ✄ HACK: .');

        done();
      });
    });

    it('should recognize empty messages', (done) => {
      options.file_patterns = [ '**/no-character.txt'];

      fixme(options, () => {
        const messages = console.log.getCalls().map(c => c.args[0]);

        expect(messages[1]).to.equal('  [Line 1]  ✗ XXX: [[no message to display]]');
        expect(messages[2]).to.equal('  [Line 4]  ↻ OPTIMIZE: [[no message to display]]');
        expect(messages[3]).to.equal('  [Line 5]  ↻ OPTIMIZE: [[no message to display]]');
        expect(messages[4]).to.equal('  [Line 6]  ↻ OPTIMIZE: [[no message to display]]');

        done();
      });
    });

    it('should recognize multiline comments', (done) => {
      options.file_patterns = [ '**/multiline-note.txt'];

      fixme(options, () => {
        const messages = console.log.getCalls().map(c => c.args[0]);

        expect(messages[1]).to.equal(
          '  [Line  1]  ✐ NOTE: A note\nwhose content\nspans multiple\nlines.'
        );
        expect(messages[2]).to.equal(
          '  [Line  6]  ✐ NOTE: XML note spanning\nmultiple lines.'
        );
        expect(messages[3]).to.equal('  [Line 10]  ✐ NOTE: Multiple\nlines.');

        done();
      });
    });
  
    it('should strip only leading and trailing whitespace from multiline messages', (done) => {
      options.file_patterns = [ '**/whitespace-multiline.txt'];

      fixme(options, () => {
        const messages = console.log.getCalls().map(c => c.args[0]);

        expect(messages[1]).to.equal(
          '  [Line  1]  ✐ NOTE: The leading whitespace will be stripped\n\nBut not the stuff above here.'
        );

        done();
      });
    });
  });

  describe('invalid annotations', () => {
    const options = {
      'path': path.join(__dirname, 'cases', 'invalid')
    };

    beforeEach(() => {
      sinon.stub(console, 'log');
      sinon.stub(console, 'error');
    });

    afterEach(() => {
      console.log.restore();
      console.error.restore();
    });

    // TODO: Implement test cases.

    // Silently ignored errors
    it('should not recognize a lowerase verb', (done) => {
      options.file_patterns = ['**/not-uppercase.txt'];

      fixme(options, () => {
        expect(console.log).to.not.have.been.called;

        done();
      });
    });
    it('should not recognize an invalid verb', (done) => {
      options.file_patterns = ['**/wrong-tag.txt'];

      fixme(options, () => {
        expect(console.log).to.not.have.been.called;

        done();
      });
    });
    it('should not recognize an invalid verb with an author', (done) => {
      options.file_patterns = ['**/wrong-tag-author.txt'];

      fixme(options, () => {
        expect(console.log).to.not.have.been.called;

        done();
      });
    });
    it('should not recognize an annotation without a colon', (done) => {
      options.file_patterns = ['**/no-colon.txt'];

      fixme(options, () => {
        expect(console.log).to.not.have.been.called;

        done();
      });
    });
    it('should not recognize an annotation without an opening tag', (done) => {
      options.file_patterns = ['**/no-tag.txt'];

      fixme(options, () => {
        expect(console.log).to.not.have.been.called;

        done();
      });
    });
    it('should not recognize `!note` as an annotation', (done) => {
      options.file_patterns = ['**/issue-25.txt'];

      fixme(options, () => {
        expect(console.log).to.not.have.been.called;

        done();
      });
    });
    it('should not recognize a link as an annotation', (done) => {
      options.file_patterns = ['**/link.txt'];

      fixme(options, () => {
        expect(console.log).to.not.have.been.called;

        done();
      });
    });

    // Errors causing failure
    it('should error without matching closing tag');
    it('should error with misspelled closing tag');
    it('should error when author section is not closed');
    it('should error without a closing tag');
  });
});
