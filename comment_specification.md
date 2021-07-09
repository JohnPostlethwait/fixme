1. [Notation](#1-notation)
2. [Syntax](#2-syntax)
3. [Examples](#3-examples)

# 1. Notation

This document uses [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) for syntax notation.

# 2. Syntax

```EBNF
character = ? A character matched by the RegEx metacharacter `.`. ?;
newline = "\n" | "\r\n" | "\r" | "\f" | "\v";
whitespace = {" " | "\t" | newline};
open_comment = "//" | "/*" | "<!--" | "{{!" | "{{!--" | "{{#" |  "{#";
close_comment = newline | "*/" | "-->" | "}}" | "--}}" | "}}" | "#}";
verb = "NOTE" | "OPTIMIZE" | "TODO" | "HACK" | "XXX" | "FIXME" | "BUG";
author = "(", {character - newline}, ")";
annotation = open_comment, whitespace, verb, whitespace,
[ author, whitespace ], ":", whitespace, {character}, whitespace, close_comment;
```

In addition, a `close_comment` character must match the corresponding `open_comment` character. The corresponding close character for `//` is a `newline`, so `newline`s may not be included within the annotation. Annotations may contain no text but must be properly closed.

See [comments.js](bin/comments.js) for the full list of `open_comment`/`close_comment` pair synonyms.

# 3. Examples

The following are examples of valid annotations:

```
// TODO: Eat some cake.
// FIXME : Get ripped
/*     OPTIMIZE      :      Maybe limit use of whitespace? */
<!-- HACK: .-->
#{ TODO (Jimmbo): Have a party. #}
// XXX:
```

The following are examples of invalid annotations:
```
Not a comment.
// TODOn't: Don't do this.
/* FIXME: No closing tag.
// xxx: needs to be uppercase.
// NOTE(not valid: still part of the author.
<!-- FIXME: typo. ->
```
