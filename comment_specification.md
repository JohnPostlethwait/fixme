1. [Notation](#1-notation)
2. [Syntax](#2-syntax)
3. [Examples](#3-examples)

# 1. Notation

This document uses [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) for syntax notation.

# 2. Syntax

```EBNF
annotation = open_comment, whitespace, verb, whitespace,
[ author, whitespace ], ":", whitespace, {character}, whitespace, close_comment;
open_comment = "//" | "/*" | "<!--" | "{{!" | "{{!--" | "{{#" |  "{#";
close_comment = newline | "*/" | "-->" | "}}" | "--}}" | "}}" | "#}";
whitespace = {" " | "\t" | newline};
verb = "NOTE" | "OPTIMIZE" | "TODO" | "HACK" | "XXX" | "FIXME" | "BUG";
author = "(", {character - newline}, ")";
character = ? A character matched by the RegEx metacharacter `.`. ?;
newline = "\n" | "\r\n" | "\r" | "\f" | "\v";
```

In addition, a `close_comment` character must match the corresponding `open_comment` character. The corresponding close character for `//` is a `newline`, so `newline`s may not be included within the annotation. Annotations may contain no text but must be properly closed.

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
```
