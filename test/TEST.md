
* annotation_test.js [7 messages]:
[1]  ✐ NOTE: This is the sample output for a note!
[2]  ↻ OPTIMIZE from Z: John Postlethwait
[3]  ✓ TODO: This is the sample output for a todo!
[4]  ✄ HACK: This is the sample output for a hack! Don't commit hacks!
[5]  ✗ XXX: This is the sample output for a XXX! XXX's need attention too!
[6]  ☠ FIXME from John Postlethwait: This is the sample output for a fixme! Seriously fix this...
[7]  ☢ BUG: This is the sample output for a bug! Who checked in a bug?!

* annotation_test.js [7 messages]:
[1]  ✐ NOTE: This is the sample output for a note!
[2]  ↻ OPTIMIZE from Z: John Postlethwait
[3]  ✓ TODO: This is the sample output for a todo!
[4]  ✄ HACK: This is the sample output for a hack! Don't commit hacks!
[5]  ✗ XXX: This is the sample output for a XXX! XXX's need attention too!
[6]  ☠ FIXME from John Postlethwait: This is the sample output for a fixme! Seriously fix this...
[7]  ☢ BUG: This is the sample output for a bug! Who checked in a bug?!
# TOC
   - [fixme](#fixme)
<a name=""></a>
 
<a name="fixme"></a>
# fixme
should generate correct utf8 output WITHOUT colors on DOS/Window.

```js
fixme({
    path: '.',
    ignored_directories: [],
    file_patterns: ['annotation_test.js'],
    file_encoding: 'utf8',
    line_length_limit: 1000,
    color: false
}, function (out) {
    var filecontent = fs.readFileSync(path.join(__dirname, 'fixme.withoutcolor.' + (os.EOL === "\r\n" ? 'crlf' : 'lf') + '.txt'), 'utf8');
    expect(out.trim()).to.equal(filecontent.trim());
    done();
});
```

