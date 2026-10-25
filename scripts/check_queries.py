#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Compile every zed/languages/devicetree/*.scm query against the grammar and run it
over the given .dts/.overlay files, printing capture counts.

Requires: pip install tree-sitter <path to tree-sitter-devicetree checkout>
"""

import sys
from pathlib import Path

import tree_sitter_devicetree
from tree_sitter import Language, Parser, Query, QueryCursor

QUERIES = Path(__file__).resolve().parent.parent / "zed" / "languages" / "devicetree"


def main() -> int:
    lang = Language(tree_sitter_devicetree.language())
    parser = Parser(lang)
    failed = False
    queries = {}
    for scm in sorted(QUERIES.glob("*.scm")):
        try:
            queries[scm.name] = Query(lang, scm.read_text())
        except Exception as e:  # noqa: BLE001 - report every broken query
            print(f"FAIL {scm.name}: {e}")
            failed = True
    for path in map(Path, sys.argv[1:]):
        tree = parser.parse(path.read_bytes())
        errors = tree.root_node.has_error
        print(f"{path}: parse {'HAS ERRORS' if errors else 'ok'}")
        for name, query in queries.items():
            caps = QueryCursor(query).captures(tree.root_node)
            summary = ", ".join(f"{k}={len(v)}" for k, v in sorted(caps.items()))
            print(f"  {name}: {summary}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
