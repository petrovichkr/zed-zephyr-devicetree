; Adapted from joelspadin/tree-sitter-devicetree queries/highlights.scm (MIT).
; In Zed the last matching pattern wins, so generic captures come first.

(identifier) @variable

(comment) @comment

[
  (string_literal)
  (system_lib_string)
  (byte_string_literal)
] @string

(escape_sequence) @string.escape

(integer_literal) @number

[
  "/delete-node/"
  "/delete-property/"
  "/dts-v1/"
  "/incbin/"
  "/include/"
  "/memreserve/"
  "/omit-if-no-ref/"
  (plugin)
] @keyword

[
  "#define"
  "#undef"
  "#include"
  "#if"
  "#elif"
  "#else"
  "#endif"
  "#ifdef"
  "#ifndef"
] @preproc

(preproc_arg) @preproc

[
  "!"
  "~"
  "-"
  "+"
  "*"
  "/"
  "%"
  "||"
  "&&"
  "|"
  "^"
  "&"
  "=="
  "!="
  ">="
  "<="
  "<<"
  ">>"
  "="
] @operator

[
  ","
  ";"
  ":"
] @punctuation.delimiter

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
  "<"
  ">"
] @punctuation.bracket

(node
  name: (identifier) @tag)

(delete_node
  name: (identifier) @tag)

(path_node
  name: (identifier) @tag)

(unit_address) @number

(property
  name: (identifier) @property)

(delete_property
  name: (identifier) @property)

(node
  label: (identifier) @label)

(property
  label: (identifier) @label)

(memory_reservation
  label: (identifier) @label)

(reference) @constant

(call_expression
  function: (identifier) @function)

(preproc_def
  name: (identifier) @constant)

(preproc_function_def
  name: (identifier) @function)
