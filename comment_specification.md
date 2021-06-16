1. [Notation](notation)
2. [Syntax](syntax)

# [1. Notation](#notation)

This document uses [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) for syntax notation.

# [2. Syntax](#syntax)

```EBNF
annotation = comment_character, whitespace, verb, whitespace,
"(", text, ")", whitespace, ":", whitespace, annotation_text, [close_comment_character];
open_comment = "//" | "/*" | "<!--" | "{{!" | "#{";
whitespace = {whitespace} | " " | tab;
tab = ? A TAB character. ?;
verb = "NOTE" | "OPTIMIZE" | "TODO" | "HACK" | "XXX" | "FIXME" | "BUG";
character = ? Any characters matched by the regex `.` metacharacter. ?;
text = {character};
author = text;
annotation_text = text;
close_comment = "-->" | "#}}" | "*/" | "--}}" "}}" | "#}";
```
