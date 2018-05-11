# Fixme #

_**NOTE:** I no longer actively maintain this package. I'd love to get PRs to keep it going though!_

![Fixme](https://nodei.co/npm/fixme.png "Fixme on NPM")

Scan for NOTE, OPTIMIZE, TODO, HACK, XXX, FIXME, and BUG comments within your source, and print them to stdout so you can deal with them. This is similar to the ```rake notes``` task from Rails.

It ends up giving you an output like this:

![](http://i.imgur.com/OXsTtCZ.png)

The color formatting is currently done using the excellent terminal coloring library [chalk](https://www.npmjs.org/package/chalk).

*Fixme currently scans your matching files line-by-line looking for annotations in the code. As such; multi-line annotation capturing is currently not supported. All annotations must be on the same line.*

## Usage ##

In order to use Fixme all you need to do is install it:

> npm install -g fixme

*Note: There really shouldn't be much reason to globally install it...*

Require it:

```javascript
var fixme = require('fixme');
```

And finally; configure it when you call it:

```javascript
// All values below are Fixme default values unless otherwise overridden here.
fixme({
  path:                 process.cwd(),
  ignored_directories:  ['node_modules/**', '.git/**', '.hg/**'],
  file_patterns:        ['**/*.js', 'Makefile', '**/*.sh'],
  file_encoding:        'utf8',
  line_length_limit:    1000,
  skip:                 []
});
```

You should then see some nice output when this is run:

```
• path/to/your/directory/file.js [4 messages]:
  [Line   1]  ✐ NOTE: This is here because sometimes an intermittent issue appears.
  [Line   7]  ↻ OPTIMIZE: This could be reworked to not do a O(N2) lookup.
  [Line   9]  ✓ TODO from John: Add a check here to ensure these are always strings.
  [Line  24]  ✄ HACK: I am doing something here that is horrible, but it works for now...
  [Line  89]  ✗ XXX: Let's do this better next time? It's bad.
  [Line 136]  ☠ FIXME: We sometimes get an undefined index in this array.
  [Line 211]  ☢ BUG: If the user inputs "Easter" we always output "Egg", even if they wanted a "Bunny".
```

### Configure Options (In More Detail) ###

  * **path:** The path to scan through for notes, defaults to process.cwd()
  * **ignored_directories:** Glob patterns for directories to ignore. Passes these straight to [minimatch](https://www.npmjs.org/package/minimatch) so check there for more information on proper syntax.
  * **file_patterns:** Glob patterns for files to scan. Also uses [minimatch](https://www.npmjs.org/package/minimatch).
  * **file_encoding:** The encoding the files scanned will be opened as.
  * **line_length_limit:** The number of max characters a line can be before Fixme gives up and doen not scan it for matches. If a line is too long, the regular expression will take an extremely long time to finish. *You have been warned!*
  * **skip:** List of check names to skip. Valid options: `note`, `optimize`, `todo`, `hack`, `xxx`, `fixme`, `bug`, `line`. `line` will disable the line length warning.

### CLI Usage ###

```sh
fixme --help
```

### Using With [GulpJS](http://gulpjs.com/) ###

Using this as a GulpJS task is pretty simple, here is a very straight-forward "notes" task:

```javascript
gulp.task('notes', fixme);
```

That, of course, assumes all of the defaults in Fixme are ok with you. If not, this is still pretty simple to configure and run as a Gulp task:

```javascript
gulp.task('notes', function () {
  fixme({
    path:                 process.cwd(),
    ignored_directories:  ['node_modules/**', '.git/**', '.hg/**'],
    file_patterns:        ['**/*.js', 'Makefile', '**/*.sh'],
    file_encoding:        'utf8',
    line_length_limit:    1000
  });
});
```

### Writing Comments for Use With Fixme ###

A code annotation needs to follow these rules to be picked up by Fixme:

  * Can be preceeded by 0 to n number of characters, this includes the comment characters //, /*, <!--, {{!, or {#
  * Must not have colon (:) before the comment character //
  * Must have one of the words: NOTE, OPTIMIZE, TODO, HACK, XXX, FIXME, or BUG
  * Can have an @ character before any of the above characters
  * Can have 0 to n space characters
  * Can have an author in parenthesis after the above word, and before a colon (:)
  * Can have 0 to n space characters
  * Must be followed by a colon (:)
  * Can have 0 to n space characters
  * Should have a message of 0 to n characters for the note

#### Displaying Authors ####

You can have an author of a comment displayed via Fixme:

```javascript
// NOTE(John Postlethwait): This comment will be shown as a note, and have an author!
```

```shell
  [Line 1]  ✐ NOTE from John Postlethwait: This comment will be shown as a note, and have an author!
```

#### More Examples ####

Take a look at the ```test/annotation_test.js``` file, all of those comments in there are supported and expected to parse with Fixme.
