"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports2) {
    "use strict";
    var ALIAS = Symbol.for("yaml.alias");
    var DOC = Symbol.for("yaml.document");
    var MAP = Symbol.for("yaml.map");
    var PAIR = Symbol.for("yaml.pair");
    var SCALAR = Symbol.for("yaml.scalar");
    var SEQ = Symbol.for("yaml.seq");
    var NODE_TYPE = Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar2(node) || isCollection(node)) && !!node.anchor;
    exports2.ALIAS = ALIAS;
    exports2.DOC = DOC;
    exports2.MAP = MAP;
    exports2.NODE_TYPE = NODE_TYPE;
    exports2.PAIR = PAIR;
    exports2.SCALAR = SCALAR;
    exports2.SEQ = SEQ;
    exports2.hasAnchor = hasAnchor;
    exports2.isAlias = isAlias;
    exports2.isCollection = isCollection;
    exports2.isDocument = isDocument;
    exports2.isMap = isMap2;
    exports2.isNode = isNode;
    exports2.isPair = isPair;
    exports2.isScalar = isScalar2;
    exports2.isSeq = isSeq2;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var BREAK = Symbol("break visit");
    var SKIP = Symbol("skip children");
    var REMOVE = Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path) {
      const ctrl = callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = visit_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path) {
      const ctrl = await callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path) {
      if (typeof visitor === "function")
        return visitor(key, node, path);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path);
      return void 0;
    }
    function replaceNode(key, path, node) {
      const parent = path[path.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports2.visit = visit;
    exports2.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports2.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref2 = sourceObjects.get(source);
            if (typeof ref2 === "object" && ref2.anchor && (identity.isScalar(ref2.node) || identity.isCollection(ref2.node))) {
              ref2.node.anchor = ref2.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports2.anchorIsValid = anchorIsValid;
    exports2.anchorNames = anchorNames;
    exports2.createNodeAnchors = createNodeAnchors;
    exports2.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports2) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports2.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports2.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports2) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports2.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const { anchors: anchors2, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        let data = anchors2.get(source);
        if (!data) {
          toJS.toJS(source, null, ctx);
          data = anchors2.get(source);
        }
        if (!data || data.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, source, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
        return data.res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports2.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports2.Scalar = Scalar;
    exports2.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref2 = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref2 = sourceObjects.get(value);
        if (ref2) {
          ref2.anchor ?? (ref2.anchor = onAnchor(value));
          return new Alias.Alias(ref2.anchor);
        } else {
          ref2 = { anchor: null, node: null };
          sourceObjects.set(value, ref2);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref2)
            ref2.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref2)
        ref2.node = node;
      return node;
    }
    exports2.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path, value) {
      let v = value;
      for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path, value) {
        if (isEmptyPath(path))
          this.add(value);
        else {
          const [key, ...rest] = path;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports2.Collection = Collection;
    exports2.collectionFromPath = collectionFromPath;
    exports2.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports2) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports2.indentComment = indentComment;
    exports2.lineComment = lineComment;
    exports2.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports2) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports2.FOLD_BLOCK = FOLD_BLOCK;
    exports2.FOLD_FLOW = FOLD_FLOW;
    exports2.FOLD_QUOTED = FOLD_QUOTED;
    exports2.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body2 = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body2}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports2.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports2.createStringifyContext = createStringifyContext;
    exports2.stringify = stringify;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n")
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports2.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports2) {
    "use strict";
    var node_process = require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports2.debug = debug;
    exports2.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      value = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
      if (identity.isSeq(value))
        for (const it of value.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(value))
        for (const it of value)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, value);
    }
    function mergeValue(ctx, map, value) {
      const source = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    exports2.addMergeToJSMap = addMergeToJSMap;
    exports2.isMergeKey = isMergeKey;
    exports2.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports2) {
    "use strict";
    var log4 = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log4.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports2.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports2.Pair = Pair;
    exports2.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        if (i < items.length - 1)
          str += ",";
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        if (!reqNewline && (lines.length > linesAtValue || str.includes("\n")))
          reqNewline = true;
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports2.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports2) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports2.YAMLMap = YAMLMap;
    exports2.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports2.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports2.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports2.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports2) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports2.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports2.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports2.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports2) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num3 = typeof value === "number" ? value : Number(value);
      if (!isFinite(num3))
        return isNaN(num3) ? ".nan" : num3 < 0 ? "-.inf" : ".inf";
      let n = JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^\d/.test(n)) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports2.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num3 = Number(node.value);
        return isFinite(num3) ? num3.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports2.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports2.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports2) {
    "use strict";
    var node_buffer = require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports2.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports2.createPairs = createPairs;
    exports2.pairs = pairs;
    exports2.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports2.YAMLOMap = YAMLOMap;
    exports2.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports2.falseTag = falseTag;
    exports2.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num3 = Number(node.value);
        return isFinite(num3) ? num3.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intBin = intBin;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports2.YAMLSet = YAMLSet;
    exports2.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num3 = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num3(60) + num3(p), num3(0));
      return sign === "-" ? num3(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num3 = (n) => n;
      if (typeof value === "bigint")
        num3 = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num3(-1);
      }
      const _60 = num3(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports2.floatTime = floatTime;
    exports2.intTime = intTime;
    exports2.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports2.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports2.coreKnownTags = coreKnownTags;
    exports2.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports2.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body2 = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body2 += stringifyComment.lineComment(body2, "", commentString(contentComment));
        if ((body2[0] === "|" || body2[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body2}`;
        } else
          lines.push(body2);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports2.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        if (Collection.isEmptyPath(path)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (Collection.isEmptyPath(path))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        if (Collection.isEmptyPath(path)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports2.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports2) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end && end.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports2.YAMLError = YAMLError;
    exports2.YAMLParseError = YAMLParseError;
    exports2.YAMLWarning = YAMLWarning;
    exports2.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports2) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports2.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports2) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports2.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports2) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports2.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports2.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports2) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep: sep2, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep2?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep2) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep2 ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep2, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports2.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports2) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value && value.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports2.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports2) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep2 = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep2 + cb;
              sep2 = "";
              break;
            }
            case "newline":
              if (comment)
                sep2 += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports2.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap2 = fc.start.source === "{";
      const fcName = isMap2 ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap2 ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep: sep2, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep2?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep2 && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap2 && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap2 && !sep2 && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep2, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep2 ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap2 && !props.found && ctx.options.strict) {
              if (sep2)
                for (const st of sep2) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source && value.source[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep2, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap2) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap2 ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce && ce.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports2.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt && kt.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports2.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep2 = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep2 + indent.slice(trimIndent) + content;
          sep2 = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep2 === " ")
            sep2 = "\n";
          else if (!prevMoreIndented && sep2 === "\n")
            sep2 = "\n\n";
          value += sep2 + indent.slice(trimIndent) + content;
          sep2 = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep2 === "\n")
            value += "\n";
          else
            sep2 = "\n";
        } else {
          value += sep2 + content;
          sep2 = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports2.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return foldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return foldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function foldLines(source) {
      let first, line;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep2 = " ";
      let pos = first.lastIndex;
      line.lastIndex = pos;
      while (match = line.exec(source)) {
        if (match[1] === "") {
          if (sep2 === "\n")
            res += sep2;
          else
            sep2 = "\n";
        } else {
          res += sep2 + match[1];
          sep2 = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep2 + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = { x: 2, u: 4, U: 8 }[next];
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      if (isNaN(code)) {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
      return String.fromCodePoint(code);
    }
    exports2.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports2.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports2) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports2.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError);
          isSrcToken = false;
        }
      }
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports2.composeEmptyNode = composeEmptyNode;
    exports2.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports2) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports2.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          Array.prototype.push.apply(doc.errors, this.errors);
          Array.prototype.push.apply(doc.warnings, this.warnings);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports2.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports2) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body2 = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body2 };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body2 = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body2;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body2 });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports2.createScalarToken = createScalarToken;
    exports2.resolveAsScalar = resolveAsScalar;
    exports2.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports2) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep: sep2, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep2)
        for (const st of sep2)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports2.stringify = stringify;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports2) {
    "use strict";
    var BREAK = Symbol("break visit");
    var SKIP = Symbol("skip children");
    var REMOVE = Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path) => {
      let item = cst;
      for (const [field, index] of path) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path) => {
      const parent = visit.itemAtPath(cst, path.slice(0, -1));
      const field = path[path.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path, item, visitor) {
      let ctrl = visitor(item, path);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
    }
    exports2.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports2) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar2 = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports2.createScalarToken = cstScalar.createScalarToken;
    exports2.resolveAsScalar = cstScalar.resolveAsScalar;
    exports2.setScalarValue = cstScalar.setScalarValue;
    exports2.stringify = cstStringify.stringify;
    exports2.visit = cstVisit.visit;
    exports2.BOM = BOM;
    exports2.DOCUMENT = DOCUMENT;
    exports2.FLOW_END = FLOW_END;
    exports2.SCALAR = SCALAR;
    exports2.isCollection = isCollection;
    exports2.isScalar = isScalar2;
    exports2.prettyToken = prettyToken;
    exports2.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports2) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return yield* this.parseBlockStart();
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        switch (this.charAt(0)) {
          case "!":
            return (yield* this.pushTag()) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
          case "&":
            return (yield* this.pushUntil(isNotAnchorChar)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
          case "-":
          // this is an error
          case "?":
          // this is an error outside flow collections
          case ":": {
            const inFlow = this.flowLevel > 0;
            const ch1 = this.charAt(1);
            if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
              if (!inFlow)
                this.indentNext = this.indentValue + 1;
              else if (this.flowKey)
                this.flowKey = false;
              return (yield* this.pushCount(1)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
            }
          }
        }
        return 0;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports2.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports2) {
    "use strict";
    var LineCounter2 = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports2.LineCounter = LineCounter2;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                Array.prototype.push.apply(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              Array.prototype.push.apply(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && (!top || top.type !== "doc-end")) {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep2;
          if (scalar.end) {
            sep2 = scalar.end;
            sep2.push(this.sourceToken);
            delete scalar.end;
          } else
            sep2 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep: sep2 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  Array.prototype.push.apply(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep2 = it.sep;
                  sep2.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep: sep2 }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  Array.prototype.push.apply(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top && top.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep2 = fc.end.splice(1, fc.end.length);
            sep2.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep: sep2 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports2.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log4 = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument3(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument3(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log4.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports2.parse = parse;
    exports2.parseAllDocuments = parseAllDocuments;
    exports2.parseDocument = parseDocument3;
    exports2.stringify = stringify;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports2.Composer = composer.Composer;
    exports2.Document = Document.Document;
    exports2.Schema = Schema.Schema;
    exports2.YAMLError = errors.YAMLError;
    exports2.YAMLParseError = errors.YAMLParseError;
    exports2.YAMLWarning = errors.YAMLWarning;
    exports2.Alias = Alias.Alias;
    exports2.isAlias = identity.isAlias;
    exports2.isCollection = identity.isCollection;
    exports2.isDocument = identity.isDocument;
    exports2.isMap = identity.isMap;
    exports2.isNode = identity.isNode;
    exports2.isPair = identity.isPair;
    exports2.isScalar = identity.isScalar;
    exports2.isSeq = identity.isSeq;
    exports2.Pair = Pair.Pair;
    exports2.Scalar = Scalar.Scalar;
    exports2.YAMLMap = YAMLMap.YAMLMap;
    exports2.YAMLSeq = YAMLSeq.YAMLSeq;
    exports2.CST = cst;
    exports2.Lexer = lexer.Lexer;
    exports2.LineCounter = lineCounter.LineCounter;
    exports2.Parser = parser.Parser;
    exports2.parse = publicApi.parse;
    exports2.parseAllDocuments = publicApi.parseAllDocuments;
    exports2.parseDocument = publicApi.parseDocument;
    exports2.stringify = publicApi.stringify;
    exports2.visit = visit.visit;
    exports2.visitAsync = visit.visitAsync;
  }
});

// src/main.ts
var import_node_child_process3 = require("node:child_process");

// src/jsonrpc.ts
function readMessages(stream, onMessage) {
  let buf = Buffer.alloc(0);
  stream.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (; ; ) {
      const sep2 = buf.indexOf("\r\n\r\n");
      if (sep2 < 0) return;
      const header = buf.subarray(0, sep2).toString("ascii");
      const len = Number(/content-length:\s*(\d+)/i.exec(header)?.[1]);
      if (!Number.isFinite(len)) throw new Error(`bad LSP header: ${header}`);
      if (buf.length < sep2 + 4 + len) return;
      const body2 = buf.subarray(sep2 + 4, sep2 + 4 + len).toString("utf8");
      buf = buf.subarray(sep2 + 4 + len);
      onMessage(JSON.parse(body2));
    }
  });
}
function writeMessage(stream, msg) {
  const body2 = Buffer.from(JSON.stringify(msg), "utf8");
  stream.write(`Content-Length: ${body2.length}\r
\r
`);
  stream.write(body2);
}
var Peer = class {
  constructor(out, prefix) {
    this.out = out;
    this.prefix = prefix;
  }
  next = 1;
  pending = /* @__PURE__ */ new Map();
  send(msg) {
    writeMessage(this.out, { jsonrpc: "2.0", ...msg });
  }
  notify(method, params) {
    this.send({ method, params });
  }
  request(method, params) {
    const id = `${this.prefix}${this.next++}`;
    this.send({ id, method, params });
    return new Promise((resolve4, reject) => this.pending.set(id, { resolve: resolve4, reject }));
  }
  /** Returns true when `msg` answered one of our own requests. */
  settle(msg) {
    if (msg.method || msg.id === void 0) return false;
    const p = this.pending.get(msg.id);
    if (!p) return false;
    this.pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
    return true;
  }
};

// src/proxy.ts
var import_node_fs6 = require("node:fs");
var import_node_path5 = require("node:path");
var import_node_url5 = require("node:url");

// src/documents.ts
var import_node_fs = require("node:fs");
var import_node_url = require("node:url");
function offsetOf(text, pos) {
  let offset = 0;
  for (let line = 0; line < pos.line; line++) {
    const nl = text.indexOf("\n", offset);
    if (nl < 0) return text.length;
    offset = nl + 1;
  }
  return Math.min(offset + pos.character, text.length);
}
function applyChanges(text, changes) {
  for (const c of changes) {
    if (!c.range) text = c.text;
    else text = text.slice(0, offsetOf(text, c.range.start)) + c.text + text.slice(offsetOf(text, c.range.end));
  }
  return text;
}
var DocumentStore = class {
  docs = /* @__PURE__ */ new Map();
  /** Feed every Zed -> server message through here. */
  observe(method, params) {
    const uri = params?.textDocument?.uri;
    if (!uri?.startsWith("file:")) return false;
    const file = (0, import_node_url.fileURLToPath)(uri);
    switch (method) {
      case "textDocument/didOpen":
        this.docs.set(file, params.textDocument.text ?? "");
        return true;
      case "textDocument/didChange":
        this.docs.set(file, applyChanges(this.docs.get(file) ?? this.read(file), params.contentChanges ?? []));
        return true;
      case "textDocument/didClose":
        this.docs.delete(file);
        return true;
      case "textDocument/didSave":
        return true;
    }
    return false;
  }
  read = (file) => this.docs.get(file) ?? (0, import_node_fs.readFileSync)(file, "utf8");
};

// src/ui/backend.ts
var import_node_child_process = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_path3 = require("node:path");
var import_node_url4 = require("node:url");

// src/zephyr.ts
var import_node_fs2 = require("node:fs");
var import_node_path = require("node:path");
var import_yaml = __toESM(require_dist(), 1);
var defaultDiscovery = {
  buildParents: [".", "build"],
  exclude: ["twister-out*", "twister-*", "twister"]
};
function readModule(name, path) {
  const file = (0, import_node_path.join)(path, "zephyr", "module.yml");
  if (!(0, import_node_fs2.existsSync)(file)) return void 0;
  const doc = (0, import_yaml.parse)((0, import_node_fs2.readFileSync)(file, "utf8")) ?? {};
  const s = doc.build?.settings ?? {};
  const abs = (v) => v === void 0 ? void 0 : (0, import_node_path.resolve)(path, v);
  return {
    name: doc.name ?? name,
    path,
    dtsRoot: abs(s.dts_root),
    boardRoot: abs(s.board_root),
    snippetRoot: abs(s.snippet_root)
  };
}
function workspaceModules(ws) {
  return ws.projects.flatMap((p) => readModule(p.name, p.path) ?? []);
}
var globToRegExp = (glob) => new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
function subdirs(dir) {
  try {
    return (0, import_node_fs2.readdirSync)(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => (0, import_node_path.join)(dir, d.name));
  } catch {
    return [];
  }
}
var strings = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
function readBuildInfo(file) {
  try {
    return (0, import_yaml.parse)((0, import_node_fs2.readFileSync)(file, "utf8"));
  } catch {
    return void 0;
  }
}
function contextFromBuildInfo(file, ctxName, buildDir, image) {
  const info = readBuildInfo(file);
  const dt = info?.cmake?.devicetree;
  const files = strings(dt?.files);
  if (!files.length) return void 0;
  const dir = (0, import_node_path.join)(file, "..");
  const compileCommands = (0, import_node_path.join)(dir, "compile_commands.json");
  return {
    ctxName,
    buildDir,
    image,
    mtimeMs: (0, import_node_fs2.statSync)(file).mtimeMs,
    dtsFile: files[0],
    // build_info lists the board dts first, then every overlay in build order
    overlays: files.slice(1),
    includePaths: strings(dt["include-dirs"]),
    zephyrBindings: strings(dt["bindings-dirs"]),
    bindingType: "Zephyr",
    compileCommands: (0, import_node_fs2.existsSync)(compileCommands) ? compileCommands : void 0
  };
}
function discoverBuilds(topdir, opts = defaultDiscovery) {
  const exclude = opts.exclude.map(globToRegExp);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const parent of opts.buildParents) {
    for (const dir of subdirs((0, import_node_path.resolve)(topdir, parent))) {
      const name = dir.slice(dir.lastIndexOf(import_node_path.sep) + 1);
      if (seen.has(dir) || exclude.some((re) => re.test(name))) continue;
      seen.add(dir);
      const top = (0, import_node_path.join)(dir, "build_info.yml");
      if (!(0, import_node_fs2.existsSync)(top)) continue;
      const label = (0, import_node_path.relative)(topdir, dir).split(import_node_path.sep).join("/");
      const images = readBuildInfo(top)?.cmake?.images;
      if (Array.isArray(images) && images.length) {
        for (const img of images) {
          if (typeof img?.name !== "string") continue;
          const ctx = contextFromBuildInfo((0, import_node_path.join)(dir, img.name, "build_info.yml"), `${label}/${img.name}`, dir, img.name);
          if (ctx) out.push(ctx);
        }
      } else {
        const ctx = contextFromBuildInfo(top, label, dir);
        if (ctx) out.push(ctx);
      }
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}
function dtsRootIncludes(root) {
  const dts = (0, import_node_path.join)(root, "dts");
  const arches = subdirs(dts).filter((d) => !/[\\/](bindings|common|vendor)$/.test(d));
  return [
    (0, import_node_path.join)(root, "include"),
    (0, import_node_path.join)(root, "include", "zephyr"),
    (0, import_node_path.join)(dts, "common"),
    (0, import_node_path.join)(dts, "vendor"),
    ...arches,
    dts
  ].filter(import_node_fs2.existsSync);
}
function restrictedDefaults(ws, modules) {
  const roots = [...modules.flatMap((m) => m.dtsRoot ?? []), ...ws.zephyrBase ? [ws.zephyrBase] : []];
  const unique = [...new Set(roots)];
  return {
    cwd: ws.topdir,
    defaultBindingType: "Zephyr",
    defaultIncludePaths: unique.flatMap(dtsRootIncludes),
    defaultZephyrBindings: unique.map((r) => (0, import_node_path.join)(r, "dts", "bindings")).filter(import_node_fs2.existsSync),
    // SDK and third-party modules must not be touched by rename refactorings
    defaultLockRenameEdits: externalRoots(ws),
    autoChangeContext: true,
    allowAdhocContexts: true
  };
}
function externalRoots(ws) {
  return ws.projects.filter((p) => (0, import_node_path.resolve)(p.path) !== (0, import_node_path.resolve)(ws.manifestPath)).map((p) => p.path);
}
function isUnder(file, roots) {
  return roots.some((r) => {
    const rel = (0, import_node_path.relative)(r, file);
    return rel === "" || !rel.startsWith("..") && !/^[a-zA-Z]:/.test(rel) && !rel.startsWith(import_node_path.sep);
  });
}

// src/ui/catalog.ts
var IMPLICIT = /* @__PURE__ */ new Set(["compatible", "reg", "status"]);
function bindingBuses(b) {
  if (b["on-bus"]) return [b["on-bus"]];
  return (b.extends ?? []).map((e) => /^(.+)-device$/.exec(e)?.[1]).filter((x) => !!x);
}
function buildCatalog(raw) {
  const seen = /* @__PURE__ */ new Set();
  const out = {};
  for (const b of raw) {
    const buses = b?.compatible && !b.isChildBinding ? bindingBuses(b) : [];
    const key = `${b?.compatible}\0${b?.filePath}`;
    if (!buses.length || seen.has(key)) continue;
    seen.add(key);
    const entry = {
      compatible: b.compatible,
      file: b.filePath,
      description: typeof b.description === "string" ? b.description.trim() : void 0,
      required: Object.entries(b.properties ?? {}).filter(([name, p]) => p?.required && !IMPLICIT.has(name) && !p.deprecated).map(([name, p]) => ({
        name,
        type: p.type ?? "unknown",
        enum: Array.isArray(p.enum) ? p.enum : void 0,
        default: p.default,
        description: typeof p.description === "string" ? p.description.trim() : void 0
      }))
    };
    for (const bus of new Set(buses)) (out[bus] ??= []).push(entry);
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.compatible.localeCompare(b.compatible));
  return out;
}

// src/ui/edits.ts
var import_node_url2 = require("node:url");
var sameFile = (url, file) => url === (0, import_node_url2.pathToFileURL)(file).href;
function statement(property, value) {
  if (value === null) return `/delete-property/ ${property};`;
  if (value === true) return `${property};`;
  return `${property} = ${value};`;
}
function planEdit(node, req, src) {
  const uri = (0, import_node_url2.pathToFileURL)(req.overlay).href;
  const edit = (e) => ({ changes: { [uri]: [e] } });
  const own = node.properties.filter((p) => p.name.value === req.property && sameFile(p.url, req.overlay)).at(-1);
  if (own) {
    if (req.value === null) {
      const line = src.lines(req.overlay)[own.range.start.line] ?? "";
      const wholeLine = line.trim() === src.slice(req.overlay, own.range).trim();
      return edit({
        range: wholeLine ? { start: { line: own.range.start.line, character: 0 }, end: { line: own.range.start.line + 1, character: 0 } } : own.range,
        newText: ""
      });
    }
    return edit({ range: own.range, newText: statement(req.property, req.value) });
  }
  return edit(insertInto(node, req.nodePath, req.overlay, [statement(req.property, req.value)], src));
}
function planEdits(node, nodePath, overlay, props, src) {
  const edits = [];
  const rest = [];
  for (const p of props) {
    const own = node.properties.filter((x) => x.name.value === p.property && sameFile(x.url, overlay)).at(-1);
    if (own) edits.push({ range: own.range, newText: statement(p.property, p.value) });
    else rest.push(statement(p.property, p.value));
  }
  if (rest.length) edits.push(insertInto(node, nodePath, overlay, rest, src));
  return edits;
}
function planChild(parent, req, src) {
  const body2 = [
    `${req.label ? `${req.label}: ` : ""}${req.name} {`,
    ...req.props.map((p) => `	${statement(p.name, p.value)}`),
    ...(req.children ?? []).flatMap((c) => [`	${c.name} {`, ...c.props.map((p) => `		${statement(p.name, p.value)}`), "	};"]),
    "};"
  ];
  return { changes: { [(0, import_node_url2.pathToFileURL)(req.overlay).href]: [insertInto(parent, req.parentPath, req.overlay, body2, src)] } };
}
function planAddress(node, req, src) {
  const uri = (0, import_node_url2.pathToFileURL)(req.overlay).href;
  const edits = planEdit(node, { nodePath: req.nodePath, overlay: req.overlay, property: "reg", value: req.reg }, src).changes[uri];
  const named = node.nodes.filter((d) => d.type === "CHILD");
  if (named.length && named.every((d) => sameFile(d.url, req.overlay))) {
    for (const d of named) for (const a of d.name?.address ?? []) if (sameFile(a.url, req.overlay)) edits.push({ range: a.range, newText: req.unit });
  }
  return { changes: { [uri]: edits } };
}
function insertInto(node, nodePath, overlay, lines, src) {
  const block = node.nodes.filter((d) => sameFile(d.url, overlay) && d.scopeClose).at(-1);
  if (block?.scopeClose) {
    const close = block.scopeClose;
    const line = src.lines(overlay)[close.line] ?? "";
    const indent = /^\s*/.exec(line.slice(0, close.character))?.[0] ?? "";
    const onlyIndentBefore = line.slice(0, close.character).trim() === "";
    const text = lines.map((l) => `${indent}	${l}
`).join("");
    return onlyIndentBefore ? { range: { start: { line: close.line, character: 0 }, end: { line: close.line, character: 0 } }, newText: text } : { range: { start: close, end: close }, newText: `
${text}${indent}` };
  }
  const ref2 = node.labels[0] ? `&${node.labels[0]}` : `&{${nodePath}}`;
  const all = src.lines(overlay);
  const last = Math.max(all.length - 1, 0);
  const end = { line: last, character: (all[last] ?? "").length };
  const lead = all.length && all.join("").trim() ? (all[last] ?? "") === "" ? "\n" : "\n\n" : "";
  return { range: { start: end, end }, newText: `${lead}${ref2} {
${lines.map((l) => `	${l}
`).join("")}};
` };
}

// src/ui/model.ts
var import_node_fs3 = require("node:fs");
var import_node_path2 = require("node:path");
var import_node_url3 = require("node:url");

// src/ui/pins.ts
function cells(value) {
  const out = [];
  for (const group of value.matchAll(/<([^>]*)>/g)) {
    let depth = 0;
    let cur = "";
    for (const ch of group[1]) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (/\s/.test(ch) && depth === 0) {
        if (cur) out.push(cur);
        cur = "";
      } else cur += ch;
    }
    if (cur) out.push(cur);
  }
  return out;
}
var strings2 = (value) => [...value.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
var pad2 = (n) => n.padStart(2, "0");
function decodePinmux(cell) {
  let m = /^(\w+?)_GPIO(\d+)$/.exec(cell);
  if (m) return { pin: `GPIO${m[2]}`, function: m[1] };
  m = /^STM32\w*_PINMUX\(\s*'([A-Z])'\s*,\s*(\d+)/.exec(cell);
  if (m) return { pin: `P${m[1]}${m[2]}` };
  m = /^NRF_PSEL(?:_DISCONNECTED)?\(\s*(\w+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(cell);
  if (m) return { pin: `P${m[2]}.${pad2(m[3])}`, function: m[1] };
  m = /^([A-Z][A-Z0-9_]*?)_P([A-K])(\d+)_(?:AF)?\d+$/.exec(cell);
  if (m) return { pin: `P${m[2]}${m[3]}`, function: m[1] };
  return void 0;
}
var labelFunction = (label) => label.replace(/_p[a-z]\d+$/i, "").replace(/_p\d_\d+$/i, "");
function pinFromLabel(label) {
  let m = /_p([a-z])(\d+)$/i.exec(label);
  if (m) return `P${m[1].toUpperCase()}${m[2]}`;
  m = /_p(\d)_(\d+)$/i.exec(label);
  if (m) return `P${m[1]}.${pad2(m[2])}`;
  return void 0;
}
function gpioPin(ctrl, label, arg) {
  const n = /^\d+$/.test(arg) ? Number(arg) : void 0;
  if (n === void 0) return `${label}.${arg}`;
  if (ctrl?.compatible.some((c) => /stm32.*gpio|^wch,gpio/.test(c))) {
    const port = /gpio([a-k])$/i.exec(label)?.[1];
    if (port) return `P${port.toUpperCase()}${n}`;
  }
  if (ctrl?.compatible.some((c) => /^espressif,esp32.*gpio/.test(c))) {
    const bank = Number(/gpio(\d+)$/.exec(label)?.[1] ?? 0);
    return `GPIO${bank * 32 + n}`;
  }
  if (ctrl?.compatible.some((c) => /^nordic,nrf-gpio/.test(c))) {
    const port = /gpio(\d+)$/.exec(label)?.[1] ?? "0";
    return `P${port}.${String(n).padStart(2, "0")}`;
  }
  return `${label}.${n}`;
}
var FLAG_BITS = {
  GPIO_ACTIVE_LOW: 1,
  GPIO_ACTIVE_HIGH: 0,
  GPIO_PUSH_PULL: 0,
  GPIO_SINGLE_ENDED: 2,
  GPIO_LINE_OPEN_DRAIN: 4,
  GPIO_LINE_OPEN_SOURCE: 0,
  GPIO_OPEN_DRAIN: 6,
  GPIO_OPEN_SOURCE: 2,
  GPIO_PULL_UP: 16,
  GPIO_PULL_DOWN: 32
};
function decodeGpioFlags(text) {
  let bits = 0;
  const extra = [];
  for (const raw of text.replace(/[()\s]/g, "").split("|")) {
    if (!raw) continue;
    if (raw in FLAG_BITS) bits |= FLAG_BITS[raw];
    else if (/^(0x[0-9a-f]+|\d+)$/i.test(raw)) {
      const n = Number(raw);
      bits |= n & 55;
      if (n & 64) extra.push("GPIO_INT_WAKEUP");
      if (n & ~127) extra.push(`0x${(n & ~127).toString(16)}`);
    } else extra.push(raw);
  }
  const single = (bits & 2) !== 0;
  return {
    activeLow: (bits & 1) !== 0,
    pull: bits & 16 ? "up" : bits & 32 ? "down" : void 0,
    drive: single ? bits & 4 ? "open-drain" : "open-source" : void 0,
    extra
  };
}
function buildPinMap(nodes) {
  const byLabel = /* @__PURE__ */ new Map();
  for (const n of Object.values(nodes)) for (const l of n.labels) byLabel.set(l, n);
  const usages = [];
  const unknown = [];
  const pinctrlCells = (state) => [state, ...state.children.map((c) => nodes[c]).filter((c) => !!c)].flatMap(
    (n) => n.props.filter((p) => p.name === "pinmux" || p.name === "psels" || p.name === "pins").flatMap((p) => cells(p.value).map((cell) => ({ cell, prop: p, node: n.path })))
  );
  for (const owner of Object.values(nodes)) {
    const names = strings2(owner.props.find((p) => p.name === "pinctrl-names")?.value ?? "");
    for (const prop3 of owner.props) {
      const state = /^pinctrl-(\d+)$/.exec(prop3.name);
      if (state) {
        const stateName = names[Number(state[1])] ?? state[1];
        for (const ref2 of cells(prop3.value)) {
          const label = ref2.replace(/^&/, "");
          const target = byLabel.get(label);
          const decoded = target ? pinctrlCells(target) : [];
          let found = false;
          for (const { cell, prop: src, node } of decoded) {
            const d = decodePinmux(cell) ?? (pinFromLabel(label) ? { pin: pinFromLabel(label) } : void 0);
            if (!d) {
              unknown.push({ owner: owner.path, property: prop3.name, value: cell });
              continue;
            }
            found = true;
            usages.push({
              pin: d.pin,
              function: d.function ?? labelFunction(label),
              owner: owner.path,
              property: prop3.name,
              state: stateName,
              disabled: owner.disabled,
              origin: src.origin,
              ref: label,
              source: node,
              cell
            });
          }
          if (!found && !decoded.length) {
            const pin = pinFromLabel(label);
            if (pin) usages.push({ pin, function: labelFunction(label), owner: owner.path, property: prop3.name, state: stateName, disabled: owner.disabled, origin: prop3.origin, ref: label });
            else unknown.push({ owner: owner.path, property: prop3.name, value: ref2 });
          }
        }
      } else if (/(^|-)gpios$/.test(prop3.name)) {
        const c = cells(prop3.value);
        let index = 0;
        for (let i = 0; i < c.length; i++) {
          if (!c[i].startsWith("&") || c[i + 1] === void 0) continue;
          const label = c[i].slice(1);
          const ctrl = byLabel.get(label);
          const flags = c[i + 2] !== void 0 && !c[i + 2].startsWith("&") ? c[i + 2] : void 0;
          usages.push({
            cell: c[i],
            index: index++,
            // ports are named by the controller's first label, whichever label the reference uses
            pin: gpioPin(ctrl, ctrl?.labels[0] ?? label, c[i + 1]),
            flags,
            gpioFlags: flags !== void 0 ? decodeGpioFlags(flags) : void 0,
            function: "GPIO",
            owner: owner.path,
            property: prop3.name,
            disabled: owner.disabled,
            origin: prop3.origin
          });
        }
      }
    }
  }
  const owners = /* @__PURE__ */ new Map();
  for (const u of usages) {
    if (u.disabled || u.state !== void 0 && u.state !== "default") continue;
    owners.set(u.pin, (owners.get(u.pin) ?? /* @__PURE__ */ new Set()).add(u.owner));
  }
  const conflicts = [...owners].filter(([, o]) => o.size > 1).map(([pin]) => pin);
  const order = (p) => p.replace(/\d+/g, (d) => d.padStart(4, "0"));
  usages.sort((a, b) => order(a.pin).localeCompare(order(b.pin)) || a.owner.localeCompare(b.owner));
  return { usages, conflicts: conflicts.sort((a, b) => order(a).localeCompare(order(b))), unknown };
}

// src/ui/buses.ts
var MACROS = {
  I2C_BITRATE_STANDARD: 1e5,
  I2C_BITRATE_FAST: 4e5,
  I2C_BITRATE_FAST_PLUS: 1e6,
  I2C_BITRATE_HIGH: 34e5,
  I2C_BITRATE_ULTRA: 5e6
};
function cellNumber(cell) {
  const c = cell.trim().replace(/^\((.*)\)$/s, "$1").trim();
  if (/^0x[0-9a-f]+$/i.test(c)) return parseInt(c, 16);
  if (/^\d+$/.test(c)) return Number(c);
  const m = /^DT_FREQ_([MK])\(\s*(\d+)\s*\)$/.exec(c);
  if (m) return Number(m[2]) * (m[1] === "M" ? 1e6 : 1e3);
  const sz = /^DT_SIZE_([MK])\(\s*(\d+)\s*\)$/.exec(c);
  if (sz) return Number(sz[2]) * (sz[1] === "M" ? 1024 * 1024 : 1024);
  return MACROS[c];
}
var SPEED_PROPS = ["clock-frequency", "current-speed", "bus-speed", "i3c-scl-hz", "max-frequency"];
var ADDRESSED = /* @__PURE__ */ new Set(["i2c", "spi"]);
var NOT_A_BUS_LINK = /^(pinctrl-\d+|.*-gpios|gpios|clocks|dmas|interrupt-parent|interrupts-extended|io-channels|power-domains|phandle)$/;
var prop = (n, name) => n.props.find((p) => p.name === name);
var unitAddress = (n) => {
  const at = n.name.indexOf("@");
  return at < 0 || !/^[0-9a-f]+$/i.test(n.name.slice(at + 1)) ? void 0 : parseInt(n.name.slice(at + 1), 16);
};
var hexAddr = (n) => `0x${n.toString(16)}`;
function buildBuses(nodes, bindings, pins) {
  const byLabel = /* @__PURE__ */ new Map();
  for (const n of Object.values(nodes)) for (const l of n.labels) byLabel.set(l, n);
  const buses = /* @__PURE__ */ new Map();
  for (const n of Object.values(nodes)) {
    const type = n.binding ? bindings[n.binding]?.bus?.[0] : void 0;
    if (!type) continue;
    const speedProp = SPEED_PROPS.map((s) => prop(n, s)).find(Boolean);
    const speedCell = speedProp ? cells(speedProp.value)[0] : void 0;
    buses.set(n.path, {
      path: n.path,
      type,
      disabled: n.disabled,
      speed: speedProp ? { property: speedProp.name, text: speedProp.value, value: speedCell === void 0 ? void 0 : cellNumber(speedCell) } : void 0,
      pins: pins.usages.filter((u) => u.owner === n.path && u.property.startsWith("pinctrl-") && (u.state ?? "default") === "default").map((u) => ({ pin: u.pin, function: u.function })),
      csPins: csPins(prop(n, "cs-gpios")?.value ?? "", byLabel),
      devices: [],
      issues: []
    });
  }
  for (const bus of buses.values()) {
    for (const c of nodes[bus.path].children) {
      const child = nodes[c];
      if (!child?.compatible.length) continue;
      const regCell = cells(prop(child, "reg")?.value ?? "")[0];
      const address = regCell === void 0 ? void 0 : cellNumber(regCell);
      const freq = cells(prop(child, "spi-max-frequency")?.value ?? "")[0];
      bus.devices.push({
        path: child.path,
        link: "child",
        reg: regCell,
        address,
        frequency: freq === void 0 ? void 0 : cellNumber(freq),
        cs: bus.type === "spi" && address !== void 0 ? bus.csPins[address] || void 0 : void 0,
        disabled: child.disabled
      });
    }
  }
  for (const n of Object.values(nodes)) {
    if (n.path === "/aliases") continue;
    for (const p of n.props) {
      if (NOT_A_BUS_LINK.test(p.name)) continue;
      for (const ref2 of p.value.matchAll(/&([A-Za-z_]\w*)/g)) {
        const target = byLabel.get(ref2[1]);
        const bus = target && buses.get(target.path);
        if (!bus || bus.path === n.path || nodes[bus.path].children.includes(n.path)) continue;
        bus.devices.push({ path: n.path, link: n.path === "/chosen" ? "chosen" : "phandle", property: p.name, disabled: n.disabled });
      }
    }
  }
  for (const bus of buses.values()) check(bus, nodes);
  const order = (b) => `${b.disabled ? 1 : 0}${b.type}${b.path}`;
  return [...buses.values()].sort((a, b) => order(a).localeCompare(order(b)));
}
function csPins(value, byLabel) {
  const c = cells(value);
  const out = [];
  for (let i = 0; i < c.length; ) {
    if (c[i].startsWith("&") && c[i + 1] !== void 0) {
      const label = c[i].slice(1);
      out.push(gpioPin(byLabel.get(label), label, c[i + 1]));
      i += 3;
    } else {
      if (c[i] === "0") out.push("");
      i++;
    }
  }
  return out;
}
function check(bus, nodes) {
  const add = (severity, node, message) => bus.issues.push({ severity, node, message });
  const name = (path) => nodes[path]?.name ?? path;
  const children = bus.devices.filter((d) => d.link === "child");
  const enabled = children.filter((d) => !d.disabled);
  for (const d of children) {
    if (ADDRESSED.has(bus.type) && d.reg === void 0) add("error", d.path, `${name(d.path)} has no reg (${bus.type === "spi" ? "chip select" : "address"})`);
    const unit = unitAddress(nodes[d.path]);
    if (d.address !== void 0 && unit !== void 0 && unit !== d.address) {
      add("warning", d.path, `${name(d.path)}: unit address @${unit.toString(16)} does not match reg ${d.reg}`);
    }
    if (!d.disabled && bus.disabled) add("warning", d.path, `${name(d.path)} is enabled, but its bus is disabled`);
    if (bus.type === "spi" && d.address !== void 0 && bus.csPins.length && d.address >= bus.csPins.length) {
      add("error", d.path, `${name(d.path)}: chip select ${d.address} is outside cs-gpios (${bus.csPins.length} entr${bus.csPins.length === 1 ? "y" : "ies"})`);
    }
    if (d.frequency !== void 0 && bus.speed?.property === "clock-frequency" && bus.speed.value !== void 0 && d.frequency > bus.speed.value) {
      add("warning", d.path, `${name(d.path)}: spi-max-frequency ${d.frequency} Hz is above the controller's clock-frequency ${bus.speed.value} Hz`);
    }
  }
  const byAddress = /* @__PURE__ */ new Map();
  for (const d of enabled) if (d.address !== void 0) byAddress.set(d.address, [...byAddress.get(d.address) ?? [], d]);
  for (const [address, ds] of byAddress) {
    if (ds.length < 2) continue;
    const who = ds.map((d) => name(d.path)).join(", ");
    if (bus.type === "spi") add("error", ds[1].path, `chip select ${address} is used by ${who}`);
    else if (bus.type === "i2c") add("warning", ds[1].path, `address ${hexAddr(address)} is used by ${who}`);
  }
}

// src/ui/clocks.ts
var M = 1e6;
function limits(family, part) {
  const p = part.replace(/^st,stm32/, "");
  switch (family) {
    case "f4":
      if (/^f401/.test(p)) return { sysclk: 84 * M, apb1: 42 * M, apb2: 84 * M, vin: [1 * M, 2 * M], vco: [192 * M, 432 * M], hse: [4 * M, 26 * M] };
      if (/^f41[0-3]/.test(p)) return { sysclk: 100 * M, apb1: 50 * M, apb2: 100 * M, vin: [1 * M, 2 * M], vco: [100 * M, 432 * M], hse: [4 * M, 26 * M] };
      if (/^f4(2|3|46|69|79)/.test(p)) return { sysclk: 180 * M, apb1: 45 * M, apb2: 90 * M, vin: [1 * M, 2 * M], vco: [100 * M, 432 * M], hse: [4 * M, 26 * M] };
      return { sysclk: 168 * M, apb1: 42 * M, apb2: 84 * M, vin: [1 * M, 2 * M], vco: [100 * M, 432 * M], hse: [4 * M, 26 * M] };
    case "l4": {
      const plus = /^l4[pqrs]/.test(p);
      const max = plus ? 120 * M : 80 * M;
      return { sysclk: max, apb1: max, apb2: max, vin: [plus ? 2.66 * M : 4 * M, 16 * M], vco: [64 * M, 344 * M], hse: [4 * M, 48 * M] };
    }
    case "f1":
      return { sysclk: 72 * M, apb1: 36 * M, apb2: 72 * M, pllOut: [16 * M, 72 * M], hse: [4 * M, /^f10[57]/.test(p) ? 25 * M : 16 * M] };
    case "f0":
      return { sysclk: 48 * M, apb1: 48 * M, pllOut: [16 * M, 48 * M], hse: [4 * M, 32 * M] };
    default:
      return void 0;
  }
}
var MSI = [1e5, 2e5, 4e5, 8e5, 1e6, 2e6, 4e6, 8e6, 16e6, 24e6, 32e6, 48e6];
var num = (n, prop3) => {
  const p = n?.props.find((x) => x.name === prop3);
  if (!p) return void 0;
  if (p.value === "") return 1;
  const c = cells(p.value)[0];
  return c === void 0 ? void 0 : cellNumber(c);
};
var ref = (n, prop3 = "clocks") => /&([A-Za-z_]\w*)/.exec(n?.props.find((x) => x.name === prop3)?.value ?? "")?.[1];
function clockBus(value) {
  return /STM32_CLOCK\(\s*(\w+)\s*,/.exec(value)?.[1] ?? /STM32_CLOCK_BUS_(\w+)/.exec(value)?.[1];
}
function buildClocks(nodes) {
  const all = Object.values(nodes);
  if (all.some((n) => n.compatible.includes("espressif,esp32-clock"))) return esp32Clocks(all);
  if (all.some((n) => n.compatible.includes("wch,rcc"))) return wchClocks(all);
  const part = all.flatMap((n) => n.compatible).find((c) => /^st,stm32[a-z]\d/.test(c) && !/-/.test(c.slice(9)));
  const rcc = all.find((n) => n.compatible.some((c) => /^st,stm32\w*-rcc$/.test(c)));
  if (!part || !rcc) return void 0;
  const fam = /^st,stm32(f4|l4|f1|f0)/.exec(part)?.[1];
  const family = fam ?? "stm32";
  const lim = limits(family, part);
  const byLabel = new Map(all.flatMap((n) => n.labels.map((l) => [l, n])));
  const out = { family, part, calculated: !!lim, nodes: [], edges: [], issues: [] };
  const err = (message, node) => out.issues.push({ severity: "error", message, node });
  const warn = (message, node) => out.issues.push({ severity: "warning", message, node });
  const inRange = (v, r, what, node) => {
    if (v === void 0 || !r) return;
    if (v < r[0] || v > r[1]) err(`${what} ${mhz(v)} is outside ${mhz(r[0])}\u2013${mhz(r[1])}`, node);
  };
  const sources = ["clk_hse", "clk_hsi", "clk_msi", "clk_lse", "clk_lsi", "clk_hsi48", "clk_hsi14"].filter((l) => byLabel.has(l));
  const hz = /* @__PURE__ */ new Map();
  for (const l of sources) {
    const n = byLabel.get(l);
    const f = l === "clk_msi" ? MSI[num(n, "msi-range") ?? -1] : num(n, "clock-frequency");
    hz.set(l, n.disabled ? void 0 : f);
    const params = [];
    if (l === "clk_msi") params.push({ node: n.path, property: "msi-range", value: num(n, "msi-range"), kind: "int", options: MSI.map((_, i) => i) });
    if (l === "clk_hse") params.push({ node: n.path, property: "clock-frequency", value: num(n, "clock-frequency"), kind: "int", min: lim?.hse[0], max: lim?.hse[1] });
    out.nodes.push({ id: l, column: 0, label: l.replace(/^clk_/, "").toUpperCase(), path: n.path, hz: f, disabled: n.disabled, params });
    if (l === "clk_hse" && !n.disabled) inRange(f, lim?.hse, "HSE", l);
  }
  const pll = byLabel.get("pll");
  let pllOut;
  if (pll) {
    const src = ref(pll);
    const srcHz = src ? hz.get(src) : void 0;
    const p = (prop3, extra = {}) => ({ node: pll.path, property: prop3, value: num(pll, prop3), kind: "int", ...extra });
    const params = [{ node: pll.path, property: "clocks", kind: "source", options: sources.filter((s) => /hse|hsi$|msi/.test(s)) }];
    const node = { id: "pll", column: 1, label: "PLL", path: pll.path, disabled: pll.disabled, params };
    out.nodes.push(node);
    if (src) out.edges.push({ from: src, to: "pll" });
    if (family === "f4" || family === "l4") {
      const m = num(pll, "div-m");
      const n = num(pll, "mul-n");
      const vin = srcHz && m ? srcHz / m : void 0;
      const vco = vin && n ? vin * n : void 0;
      params.push(p("div-m", { min: family === "f4" ? 2 : 1, max: family === "f4" ? 63 : 8 }), p("mul-n", { min: family === "f4" ? 50 : 8, max: family === "f4" ? 432 : 86 }));
      const outputs = family === "f4" ? ["div-p", "div-q", "div-r"] : ["div-r", "div-q", "div-p"];
      for (const d of outputs) {
        const v = num(pll, d);
        params.push(p(d, { options: d === "div-p" && family === "f4" ? [2, 4, 6, 8] : d === "div-p" ? void 0 : family === "l4" ? [2, 4, 6, 8] : void 0, min: 2, max: d === "div-p" && family === "l4" ? 31 : 15 }));
        const f = vco && v ? vco / v : void 0;
        const id = `pll_${d.slice(-1)}`;
        if (v !== void 0) {
          out.nodes.push({ id, column: 2, label: `PLL${d.slice(-1).toUpperCase()}`, hz: f, disabled: pll.disabled });
          out.edges.push({ from: "pll", to: id, label: `/${d.slice(-1).toUpperCase()} ${v}` });
        }
      }
      node.hz = vco;
      node.label = `PLL VCO`;
      if (src) out.edges[out.edges.findIndex((e) => e.to === "pll")].label = m && n ? `/M ${m} \xD7N ${n}` : void 0;
      if (!pll.disabled) {
        inRange(vin, lim?.vin, "PLL input", "pll");
        inRange(vco, lim?.vco, "VCO", "pll");
      }
      pllOut = vco && num(pll, family === "f4" ? "div-p" : "div-r") ? vco / num(pll, family === "f4" ? "div-p" : "div-r") : void 0;
      const usb = all.some((x) => !x.disabled && x.compatible.some((c) => /stm32-otgfs|stm32-usb/.test(c)));
      const q = num(pll, "div-q");
      if (usb && vco && q && Math.abs(vco / q - 48 * M) > 25e-4 * 48 * M && !byLabel.get("clk_hsi48")) err(`USB needs 48 MHz on PLLQ, got ${mhz(vco / q)}`, "pll_q");
    } else if (family === "f1" || family === "f0") {
      const mul = num(pll, "mul");
      const prediv = num(pll, "prediv");
      const xtpre = num(pll, "xtpre");
      params.push(p("mul", { min: 2, max: 16 }));
      if (family === "f0" || prediv !== void 0) params.push(p("prediv", { min: 1, max: 16 }));
      if (family === "f1") params.push({ node: pll.path, property: "xtpre", value: xtpre ?? 0, kind: "bool" });
      const hsiPrediv = /^st,stm32f0(4|7|9)|^st,stm32f030xc/.test(part);
      const div = src === "clk_hsi" ? family === "f0" && hsiPrediv ? prediv ?? 1 : 2 : family === "f1" ? (xtpre ? 2 : 1) * (prediv ?? 1) : prediv ?? 1;
      pllOut = srcHz && mul ? srcHz / div * mul : void 0;
      node.hz = pllOut;
      if (src) out.edges[out.edges.findIndex((e) => e.to === "pll")].label = `/${div} \xD7${mul ?? "?"}`;
      if (!pll.disabled) inRange(pllOut, lim?.pllOut, "PLL output", "pll");
    }
  }
  const sysSrc = ref(rcc);
  const sysFrom = sysSrc === "pll" ? family === "f4" ? "pll_p" : family === "l4" ? "pll_r" : "pll" : sysSrc;
  const sysclk = sysSrc === "pll" ? pllOut : sysSrc ? hz.get(sysSrc) : void 0;
  const ahbDiv = num(rcc, "ahb-prescaler");
  const apb1Div = num(rcc, "apb1-prescaler");
  const apb2Div = num(rcc, "apb2-prescaler");
  const prescalers = (prop3, opts) => ({ node: rcc.path, property: prop3, value: num(rcc, prop3), kind: "int", options: opts });
  out.nodes.push({
    id: "sysclk",
    column: 3,
    label: "SYSCLK",
    path: rcc.path,
    hz: sysclk,
    params: [{ node: rcc.path, property: "clocks", kind: "source", options: ["pll", ...sources.filter((s) => /hse|hsi$|msi/.test(s))] }]
  });
  if (sysFrom) out.edges.push({ from: sysFrom, to: "sysclk" });
  const ahb = sysclk && ahbDiv ? sysclk / ahbDiv : void 0;
  const apb1 = ahb && apb1Div ? ahb / apb1Div : void 0;
  const apb2 = ahb && apb2Div ? ahb / apb2Div : void 0;
  out.nodes.push({ id: "ahb", column: 4, label: "HCLK", path: rcc.path, hz: ahb, params: [prescalers("ahb-prescaler", [1, 2, 4, 8, 16, 64, 128, 256, 512])] });
  out.edges.push({ from: "sysclk", to: "ahb", label: `/${ahbDiv ?? "?"}` });
  out.nodes.push({ id: "ahb_bus", column: 5, label: "AHB", path: rcc.path, hz: ahb });
  out.edges.push({ from: "ahb", to: "ahb_bus" });
  out.nodes.push({ id: "apb1", column: 5, label: "APB1", path: rcc.path, hz: apb1, params: [prescalers("apb1-prescaler", [1, 2, 4, 8, 16])] });
  out.edges.push({ from: "ahb", to: "apb1", label: `/${apb1Div ?? "?"}` });
  if (apb2Div !== void 0) {
    out.nodes.push({ id: "apb2", column: 5, label: "APB2", path: rcc.path, hz: apb2, params: [prescalers("apb2-prescaler", [1, 2, 4, 8, 16])] });
    out.edges.push({ from: "ahb", to: "apb2", label: `/${apb2Div}` });
  }
  if (lim) {
    if (sysclk !== void 0 && sysclk > lim.sysclk) err(`SYSCLK ${mhz(sysclk)} is above the ${mhz(lim.sysclk)} maximum`, "sysclk");
    if (apb1 !== void 0 && apb1 > lim.apb1) err(`APB1 ${mhz(apb1)} is above the ${mhz(lim.apb1)} maximum`, "apb1");
    if (apb2 !== void 0 && lim.apb2 && apb2 > lim.apb2) err(`APB2 ${mhz(apb2)} is above the ${mhz(lim.apb2)} maximum`, "apb2");
  }
  if (sysSrc && byLabel.get(sysSrc)?.disabled) err(`SYSCLK source ${sysSrc} is disabled`, "sysclk");
  if (sysSrc === "pll" && pll?.disabled) err("SYSCLK comes from the PLL, but the PLL is disabled", "sysclk");
  out.hclk = ahb;
  out.declared = num(rcc, "clock-frequency");
  out.declaredNode = rcc.path;
  if (lim && ahb !== void 0 && out.declared !== void 0 && Math.round(ahb) !== out.declared) {
    err(`rcc clock-frequency ${mhz(out.declared)} does not match the computed HCLK ${mhz(ahb)}`, "ahb");
  }
  for (const n of all) {
    if (n.disabled) continue;
    const v = n.props.find((p) => p.name === "clocks")?.value;
    if (!v || ref(n) !== rcc.labels[0]) continue;
    const bus = clockBus(v);
    if (!bus) continue;
    const parent = /^APB1/.test(bus) ? "apb1" : /^APB2/.test(bus) ? "apb2" : /^AHB/.test(bus) ? "ahb_bus" : void 0;
    if (!parent) continue;
    const timer = n.compatible.some((c) => /timers|stm32-timer/.test(c));
    const base = parent === "apb1" ? apb1 : parent === "apb2" ? apb2 : ahb;
    const div = parent === "apb1" ? apb1Div : parent === "apb2" ? apb2Div : 1;
    const f = base !== void 0 && timer && div !== void 0 && div > 1 ? base * 2 : base;
    out.nodes.push({ id: n.path, column: 6, label: `${n.labels[0] ?? n.name}${timer && div && div > 1 ? " \xD72" : ""}`, sub: bus, path: n.path, hz: f });
    out.edges.push({ from: parent, to: n.path });
  }
  const busOrder = ["ahb_bus", "apb1", "apb2"];
  const parentOf = new Map(out.edges.map((e) => [e.to, e.from]));
  const rank = (n) => n.column === 6 ? busOrder.indexOf(parentOf.get(n.id) ?? "") : -1;
  out.nodes.sort((a, b) => a.column - b.column || rank(a) - rank(b) || (a.column === 6 ? a.label.localeCompare(b.label) : 0));
  const flagged = new Set(out.issues.map((i) => i.node));
  for (const node of out.nodes) if (flagged.has(node.id)) node.error = out.issues.find((i) => i.node === node.id).message;
  if (!lim) warn(`no clock model for ${part}: frequencies are shown where they follow directly from the devicetree`);
  return out;
}
var mhz = (v) => v >= M ? `${Number((v / M).toFixed(3))} MHz` : v >= 1e3 ? `${Number((v / 1e3).toFixed(3))} kHz` : `${v} Hz`;
var APB80 = /^espressif,esp32(s2|s3|c3)?$/;
function esp32Clocks(all) {
  const out = { family: "esp32", part: all.flatMap((n) => n.compatible).find((c) => /^espressif,esp32\w*$/.test(c)), calculated: false, nodes: [], edges: [], issues: [] };
  const cpus = all.filter((n) => /^\/cpus\/cpu@/.test(n.path));
  const xtal = num(cpus[0], "xtal-freq");
  const src = cpus[0]?.props.find((p) => p.name === "clock-source")?.value.replace(/[<>]/g, "").replace(/^ESP32_CPU_CLK_SRC_/, "");
  out.nodes.push({ id: "xtal", column: 0, label: "XTAL", hz: xtal });
  const clk = all.find((n) => n.compatible.includes("espressif,esp32-clock"));
  for (const [prop3, label] of [["fast-clk-src", "RTC fast"], ["slow-clk-src", "RTC slow"]]) {
    const v = clk?.props.find((p) => p.name === prop3)?.value.replace(/[<>]/g, "").replace(/^ESP32_RTC_(FAST|SLOW)_CLK_SRC_/, "");
    if (v) out.nodes.push({ id: prop3, column: 0, label: `${label}: ${v}`, path: clk.path });
  }
  out.nodes.push({ id: "cpu_src", column: 1, label: `CPU source: ${src ?? "?"}` });
  out.edges.push({ from: "xtal", to: "cpu_src" });
  let cpuHz;
  for (const c of cpus) {
    cpuHz ??= num(c, "clock-frequency");
    out.nodes.push({ id: c.path, column: 3, label: c.name, path: c.path, hz: num(c, "clock-frequency") });
    out.edges.push({ from: "cpu_src", to: c.path });
  }
  const apb = out.part && APB80.test(out.part) && cpuHz ? Math.min(cpuHz, 80 * M) : void 0;
  out.nodes.push({ id: "apb", column: 4, label: "APB", hz: apb });
  if (cpus[0]) out.edges.push({ from: cpus[0].path, to: "apb" });
  for (const n of all) {
    if (n.disabled) continue;
    const mod = /&clock\s+ESP32_(\w+)_MODULE/.exec(n.props.find((p) => p.name === "clocks")?.value ?? "")?.[1];
    if (!mod) continue;
    out.nodes.push({ id: n.path, column: 6, label: n.labels[0] ?? n.name, sub: mod, path: n.path });
    out.edges.push({ from: "apb", to: n.path });
  }
  return out;
}
function wchLimit(part) {
  if (/^wch,ch32v00/.test(part)) return 48 * M;
  if (/^wch,ch32v10/.test(part)) return 80 * M;
  if (/^wch,ch32v[23]0/.test(part)) return 144 * M;
  return void 0;
}
function wchBus(clock) {
  if (/_(DMA\d*|SRAM|FLITF|CRC|FSMC|RNG|SDIO|USBHS|OTG\w*|DVP|ETH\w*|BLE\w*|USBFS)$/.test(clock)) return "ahb_bus";
  if (/_(AFIO|IOP[A-Z]|ADC\d*|TIM(1|8|9|10)|SPI1|USART1)$/.test(clock)) return "apb2";
  return "apb1";
}
function wchClocks(all) {
  const part = all.flatMap((n) => n.compatible).find((c) => /^wch,ch32[a-z]\d+\w*$/.test(c)) ?? "wch";
  const max = wchLimit(part);
  const out = { family: "wch", part, calculated: max !== void 0, nodes: [], edges: [], issues: [] };
  const byLabel = new Map(all.flatMap((n) => n.labels.map((l) => [l, n])));
  const rcc = all.find((n) => n.compatible.includes("wch,rcc"));
  const hz = /* @__PURE__ */ new Map();
  const sources = ["clk_hse", "clk_hsi", "clk_lse", "clk_lsi"].filter((l) => byLabel.has(l));
  for (const l of sources) {
    const n = byLabel.get(l);
    const f = num(n, "clock-frequency");
    hz.set(l, n.disabled ? void 0 : f);
    const params = l === "clk_hse" ? [{ node: n.path, property: "clock-frequency", value: f, kind: "int" }] : [];
    out.nodes.push({ id: l, column: 0, label: l.replace(/^clk_/, "").toUpperCase(), path: n.path, hz: f, disabled: n.disabled, params });
  }
  const pll = byLabel.get("pll");
  let pllOut;
  if (pll) {
    const src = ref(pll);
    const fixed = pll.compatible.some((c) => /ch32v00x-pll/.test(c));
    const mul = fixed ? 2 : num(pll, "mul");
    pllOut = src && hz.get(src) && mul ? hz.get(src) * mul : void 0;
    const params = [{ node: pll.path, property: "clocks", kind: "source", options: sources.filter((s) => /hse|hsi/.test(s)) }];
    if (!fixed) params.push({ node: pll.path, property: "mul", value: mul, kind: "int", options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18] });
    out.nodes.push({ id: "pll", column: 1, label: "PLL", path: pll.path, hz: pllOut, disabled: pll.disabled, params });
    if (src) out.edges.push({ from: src, to: "pll", label: `\xD7${mul ?? "?"}` });
    if (src === "clk_hsi" && !fixed && !pll.disabled) {
      out.issues.push({ severity: "warning", message: "PLL from HSI: the chip may halve HSI first (EXTEN_CTR.HSIPRE), which the devicetree does not show", node: "pll" });
    }
  }
  const sysSrc = ref(rcc);
  const sysclk = sysSrc === "pll" ? pllOut : sysSrc ? hz.get(sysSrc) : void 0;
  out.nodes.push({ id: "sysclk", column: 3, label: "SYSCLK", path: rcc.path, hz: sysclk, params: [{ node: rcc.path, property: "clocks", kind: "source", options: ["pll", ...sources.filter((s) => /hse|hsi/.test(s))] }] });
  if (sysSrc) out.edges.push({ from: sysSrc, to: "sysclk" });
  out.nodes.push({ id: "ahb", column: 4, label: "HCLK", path: rcc.path, hz: sysclk });
  out.edges.push({ from: "sysclk", to: "ahb", label: "/1" });
  for (const [id, label] of [["ahb_bus", "AHB"], ["apb1", "APB1"], ["apb2", "APB2"]]) {
    out.nodes.push({ id, column: 5, label, hz: sysclk });
    out.edges.push({ from: "ahb", to: id });
  }
  const cpu = all.find((n) => /^\/cpus\/cpu@/.test(n.path));
  out.hclk = sysclk;
  out.declared = num(cpu, "clock-frequency");
  out.declaredNode = cpu?.path;
  if (max && sysclk !== void 0 && sysclk > max) out.issues.push({ severity: "error", message: `SYSCLK ${mhz(sysclk)} is above the ${mhz(max)} maximum`, node: "sysclk" });
  if (sysSrc && byLabel.get(sysSrc)?.disabled) out.issues.push({ severity: "error", message: `SYSCLK source ${sysSrc} is disabled`, node: "sysclk" });
  if (sysclk !== void 0 && out.declared !== void 0 && Math.round(sysclk) !== out.declared) {
    out.issues.push({ severity: "error", message: `cpu clock-frequency ${mhz(out.declared)} does not match the computed SYSCLK ${mhz(sysclk)}`, node: "sysclk" });
  }
  for (const n of all) {
    if (n.disabled || n === rcc) continue;
    const v = n.props.find((p) => p.name === "clocks")?.value ?? "";
    const clock = /&rcc\s+(CH32\w+_CLOCK_\w+)/.exec(v)?.[1];
    if (!clock) continue;
    const bus = wchBus(clock);
    out.nodes.push({ id: n.path, column: 6, label: n.labels[0] ?? n.name, sub: clock.replace(/^CH32\w+_CLOCK_/, ""), path: n.path, hz: sysclk });
    out.edges.push({ from: bus, to: n.path });
  }
  const busOrder = ["ahb_bus", "apb1", "apb2"];
  const parentOf = new Map(out.edges.map((e) => [e.to, e.from]));
  const rank = (n) => n.column === 6 ? busOrder.indexOf(parentOf.get(n.id) ?? "") : -1;
  out.nodes.sort((a, b) => a.column - b.column || rank(a) - rank(b) || (a.column === 6 ? a.label.localeCompare(b.label) : 0));
  for (const node of out.nodes) node.error = out.issues.find((i) => i.node === node.id && i.severity === "error")?.message;
  return out;
}

// src/ui/memmap.ts
var num2 = (v, i = 0) => {
  const c = cells(v ?? "")[i];
  return c === void 0 ? void 0 : cellNumber(c);
};
var prop2 = (n, name) => n.props.find((p) => p.name === name)?.value;
var nameOf = (n) => n.labels[0] ?? /"([^"]*)"/.exec(prop2(n, "label") ?? "")?.[1] ?? n.name;
var regOf = (n) => {
  const start = num2(prop2(n, "reg"), 0);
  const size = num2(prop2(n, "reg"), 1);
  return start !== void 0 && size !== void 0 ? [start, size] : n.reg[0] ? [n.reg[0].start, n.reg[0].size] : void 0;
};
var RAM = /^(mmio-sram|zephyr,memory-region)$/;
function buildMemoryMap(nodes) {
  const all = Object.values(nodes);
  const byLabel = new Map(all.flatMap((n) => n.labels.map((l) => [l, n.path])));
  const chosen = /* @__PURE__ */ new Map();
  for (const p of nodes["/chosen"]?.props ?? []) {
    const target = byLabel.get(/&([A-Za-z_]\w*)/.exec(p.value)?.[1] ?? "");
    if (target) chosen.set(target, [...chosen.get(target) ?? [], p.name.replace(/^zephyr,/, "")]);
  }
  const out = [];
  const isPartitions = (n) => n.compatible.includes("fixed-partitions") || /fixed-partitions/.test(n.binding ?? "") || n.name === "partitions";
  for (const parts of all.filter(isPartitions)) {
    const dev = nodes[parts.path.slice(0, parts.path.lastIndexOf("/"))];
    if (!dev) continue;
    const reg = regOf(dev);
    const bits = num2(prop2(dev, "size"));
    const onChip = dev.compatible.includes("soc-nv-flash");
    const size = onChip ? reg?.[1] ?? 0 : bits ? bits / 8 : reg?.[1] ?? 0;
    const segs = parts.children.map((c) => nodes[c]).filter((c) => !!c).flatMap((c) => {
      const r = regOf(c);
      return r ? [{ path: c.path, name: nameOf(c), offset: r[0], size: r[1], readOnly: c.props.some((p) => p.name === "read-only"), disabled: c.disabled, chosen: chosen.get(c.path) ?? [], lane: 0, overlap: false }] : [];
    });
    if (!segs.length) continue;
    out.push(finish({ path: dev.path, name: nameOf(dev), kind: "flash", base: onChip ? reg?.[0] : void 0, size, chosen: chosen.get(dev.path) ?? [], disabled: dev.disabled, partitions: parts.path, segments: segs, gaps: [], issues: [] }));
  }
  const rams = all.filter((n) => n.compatible.some((c) => RAM.test(c)) || /^(memory|sram)@/.test(n.name) && !n.compatible.length).flatMap((n) => {
    const r = regOf(n);
    return r && r[1] > 0 ? [{ n, start: r[0], size: r[1] }] : [];
  });
  const inside = (a, b) => a !== b && a.start >= b.start && a.start + a.size <= b.start + b.size && a.size < b.size;
  for (const top of rams.filter((r) => !rams.some((o) => inside(r, o)))) {
    const direct = rams.filter((r) => inside(r, top) && !rams.some((o) => inside(r, o) && inside(o, top)));
    out.push(
      finish({
        path: top.n.path,
        name: nameOf(top.n),
        kind: "ram",
        base: top.start,
        size: top.size,
        chosen: chosen.get(top.n.path) ?? [],
        disabled: top.n.disabled,
        segments: direct.map((r) => ({ path: r.n.path, name: nameOf(r.n), offset: r.start - top.start, size: r.size, readOnly: false, disabled: r.n.disabled, chosen: chosen.get(r.n.path) ?? [], lane: 0, overlap: false })),
        gaps: [],
        issues: []
      })
    );
  }
  const rank = (m) => m.kind === "flash" ? m.chosen.includes("flash") ? 0 : 1 : m.chosen.includes("sram") ? 2 : 3;
  return out.sort((a, b) => rank(a) - rank(b) || (a.base ?? 0) - (b.base ?? 0) || a.path.localeCompare(b.path));
}
function finish(m) {
  m.segments.sort((a, b) => a.offset - b.offset || b.size - a.size);
  const laneEnds = [];
  for (const s of m.segments) {
    let lane = laneEnds.findIndex((end) => end <= s.offset);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = s.offset + s.size;
    s.lane = lane;
  }
  for (const a of m.segments) {
    for (const b of m.segments) {
      if (a !== b && a.offset < b.offset + b.size && b.offset < a.offset + a.size) {
        a.overlap = true;
        if (a.offset < b.offset || a.offset === b.offset && a.path < b.path) m.issues.push(`${a.name} overlaps ${b.name}`);
      }
    }
    if (m.size && a.offset + a.size > m.size) m.issues.push(`${a.name} ends past the end of ${m.name}`);
  }
  let cursor = 0;
  for (const s of m.segments) {
    if (s.offset > cursor) m.gaps.push({ offset: cursor, size: s.offset - cursor });
    cursor = Math.max(cursor, s.offset + s.size);
  }
  if (m.size > cursor) m.gaps.push({ offset: cursor, size: m.size - cursor });
  return m;
}

// src/ui/overview.ts
var GROUPS = [
  ["Communication", ["serial", "i2c", "spi", "i2s", "i3c", "can", "usb", "ethernet", "wifi", "bluetooth", "ieee802154", "mipi-dbi", "mipi-dsi", "sdhc", "mmc", "modem", "smbus", "phy", "mdio", "ipm", "mbox", "espi", "w1"]],
  ["Timers", ["timer", "counter", "rtc", "watchdog", "pwm", "pulse-io"]],
  ["Analog & sensors", ["adc", "dac", "comparator", "sensor", "iio", "audio"]],
  ["Storage", ["flash_controller", "mtd", "otp", "nvmem", "bbram", "eeprom", "memory-controllers", "retained_mem", "retention", "fs"]],
  ["GPIO & input", ["gpio", "pinctrl", "input", "led", "led_strip", "kscan"]],
  ["System", ["clock", "reset", "power", "power-domain", "regulator", "interrupt-controller", "dma", "rng", "crypto", "misc", "arm", "riscv", "xtensa"]]
];
var GROUP_OF = new Map(GROUPS.flatMap(([g, classes]) => classes.map((c) => [c, g])));
var OTHER = "Other";
var MEMORY = /* @__PURE__ */ new Set(["base", "sram"]);
var bindingClass = (file) => /[\\/]dts[\\/]bindings[\\/]([^\\/]+)[\\/]/.exec(file ?? "")?.[1] ?? "";
var shortCompat = (c) => c.split(",").pop() ?? c;
function buildOverview(nodes, bindings, pins, buses, catalog) {
  const external = /* @__PURE__ */ new Map();
  for (const port of catalog?.ports ?? []) if (port.external) for (const p of port.pins) external.set(p, port.name);
  const parent = /* @__PURE__ */ new Map();
  for (const n of Object.values(nodes)) for (const c of n.children) parent.set(c, n.path);
  const candidate = (n) => {
    const file = n.binding ? bindings[n.binding]?.file : void 0;
    return file && n.compatible.length && n.path !== "/" && !n.path.startsWith("/cpus") ? bindingClass(file) : void 0;
  };
  const nested = (path) => {
    for (let p = parent.get(path); p; p = parent.get(p)) {
      const cls = nodes[p] && candidate(nodes[p]);
      if (cls !== void 0 && !MEMORY.has(cls)) return true;
    }
    return false;
  };
  const blocks = /* @__PURE__ */ new Map();
  const memory = [];
  for (const n of Object.values(nodes)) {
    const cls = candidate(n);
    if (cls === void 0 || nested(n.path)) continue;
    if (MEMORY.has(cls)) {
      if (n.reg[0]?.size) memory.push({ path: n.path, size: n.reg[0].size });
      continue;
    }
    blocks.set(n.path, { path: n.path, class: cls, disabled: n.disabled, pins: [], devices: buses.find((b) => b.path === n.path)?.devices.length ?? 0 });
  }
  const conflicts = new Set(pins.conflicts);
  for (const u of pins.usages) {
    if (u.state !== void 0 && u.state !== "default") continue;
    let p = u.owner;
    while (p && !blocks.has(p)) p = parent.get(p);
    const block = p && blocks.get(p);
    if (!block || block.pins.some((x) => x.pin === u.pin && x.owner === u.owner)) continue;
    block.pins.push({ pin: u.pin, function: u.function, owner: u.owner, property: u.property, conflict: conflicts.has(u.pin), via: external.get(u.pin) });
  }
  const groups = /* @__PURE__ */ new Map();
  for (const b of blocks.values()) {
    const g = GROUP_OF.get(b.class) ?? OTHER;
    groups.set(g, [...groups.get(g) ?? [], b]);
  }
  const order = [...GROUPS.map(([g]) => g), OTHER];
  const byName = (a, b) => a.class.localeCompare(b.class) || a.path.localeCompare(b.path);
  const root = nodes["/"];
  const cpus = (nodes["/cpus"]?.children ?? []).map((c) => nodes[c]).filter((c) => !!c?.compatible.length).map((c) => {
    const f = c.props.find((p) => p.name === "clock-frequency")?.value;
    const hz = f ? cellNumber(f.replace(/^<|>$/g, "")) : void 0;
    return `${shortCompat(c.compatible[0])}${hz ? ` @ ${hz / 1e6} MHz` : ""}`;
  });
  return {
    soc: {
      model: root?.props.find((p) => p.name === "model")?.value.replace(/^"|"$/g, ""),
      compatible: root?.compatible ?? [],
      cpus,
      memory: memory.sort((a, b) => b.size - a.size)
    },
    groups: order.filter((g) => groups.has(g)).map((name) => ({ name, blocks: groups.get(name).sort(byName) }))
  };
}

// src/ui/pinfunctions.ts
function parseEsp32Header(text) {
  const out = /* @__PURE__ */ new Map();
  for (const m of text.matchAll(/^\s*#define\s+(\w+?)_GPIO(\d+)\s+ESP32_PINMUX\b/gm)) {
    const list = out.get(m[1]) ?? [];
    list.push(Number(m[2]));
    out.set(m[1], list);
  }
  return out;
}
function parseWchHeader(text) {
  const out = /* @__PURE__ */ new Map();
  for (const m of text.matchAll(/^\s*#define\s+(([A-Z][A-Z0-9_]*?)_P([A-K])(\d+)_(?:AF)?\d+)\s+CH32\w*PINMUX/gm)) {
    const list = out.get(m[2]) ?? [];
    list.push({ pin: `P${m[3]}${m[4]}`, macro: m[1] });
    out.set(m[2], list);
  }
  return out;
}
function pinctrlInclude(lines) {
  for (const l of lines) {
    const m = /^\s*#include\s+[<"]([^>"]*dt-bindings\/pinctrl\/(?:esp32|ch32)\w*-pinctrl\.h)[>"]/.exec(l);
    if (m) return m[1];
  }
  return void 0;
}
var has = (n, re) => n.compatible.some((c) => re.test(c));
function busAncestor(nodes, bindings, path) {
  const parent = /* @__PURE__ */ new Map();
  for (const n of Object.values(nodes)) for (const c of n.children) parent.set(c, n.path);
  for (let p = parent.get(path); p; p = parent.get(p)) {
    const n = nodes[p];
    if (n?.binding && bindings[n.binding]?.bus?.length) return n;
  }
  return void 0;
}
function ngpios(n, bindings) {
  const written = Number(cells(n.props.find((p) => p.name === "ngpios")?.value ?? "")[0]);
  if (written || !bindings) return written || void 0;
  const bp = n.binding ? bindings[n.binding]?.props.find((p) => p.name === "ngpios") : void 0;
  const v = Number(bp?.const ?? bp?.default);
  return v || void 0;
}
function buildPinCatalog(nodes, header, used = [], bindings = {}) {
  const all = Object.values(nodes);
  const vendor = all.some((n) => has(n, /^st,stm32.*gpio/)) ? "stm32" : all.some((n) => has(n, /^espressif,esp32.*gpio/)) ? "esp32" : all.some((n) => has(n, /^nordic,nrf-gpio/)) ? "nrf" : all.some((n) => has(n, /^wch,gpio/)) ? "wch" : "other";
  const wch = vendor === "wch" && header ? parseWchHeader(header.text) : void 0;
  const ports = [];
  for (const n of all) {
    if (n.disabled || !n.props.some((p) => p.name === "gpio-controller") || !n.labels[0]) continue;
    const bus = busAncestor(nodes, bindings, n.path);
    if (bus) {
      const count2 = ngpios(n, bindings) ?? 32;
      ports.push({
        name: n.labels[0],
        pins: Array.from({ length: count2 }, (_, i) => gpioPin(n, n.labels[0], String(i))),
        external: { path: n.path, compatible: n.compatible[0], bus: bus.path, address: /@(.+)$/.exec(n.name)?.[1] }
      });
      continue;
    }
    let count = ngpios(n) ?? (vendor === "stm32" || vendor === "wch" ? 16 : 32);
    const name0 = gpioPin(n, n.labels[0], "0");
    if (name0.endsWith("0") && /^P[A-K]0$/.test(name0)) {
      const port = name0.slice(0, 2);
      const pinsOf = [...used, ...[...wch?.values() ?? []].flatMap((l) => l.map((x) => x.pin))];
      const need = Math.max(0, ...pinsOf.filter((p) => p.startsWith(port) && /^\d+$/.test(p.slice(2))).map((p) => Number(p.slice(2)) + 1));
      if (need > count) count = Math.max(need, 16);
    }
    ports.push({ name: n.labels[0], pins: Array.from({ length: count }, (_, i) => gpioPin(n, n.labels[0], String(i))) });
  }
  const order = (p) => p.replace(/\d+/g, (d) => d.padStart(4, "0"));
  ports.sort((a, b) => Number(!!a.external) - Number(!!b.external) || order(a.pins[0] ?? a.name).localeCompare(order(b.pins[0] ?? b.name)));
  const known = new Set(ports.filter((p) => !p.external).flatMap((p) => p.pins));
  const functions = {};
  const labels = {};
  const add = (fn, pin) => {
    if (!known.has(pin)) return;
    const list = functions[fn] ??= [];
    if (!list.includes(pin)) list.push(pin);
  };
  if (vendor === "stm32") {
    for (const n of all) {
      const label = n.labels[0];
      const cell = cells(n.props.find((p) => p.name === "pinmux")?.value ?? "")[0];
      const pin = cell && decodePinmux(cell)?.pin;
      if (!label || !pin) continue;
      const fn = labelFunction(label);
      add(fn, pin);
      labels[`${fn}@${pin}`] = label;
    }
  } else if (vendor === "esp32" && header) {
    for (const [fn, pins] of parseEsp32Header(header.text)) for (const n of pins) add(fn, `GPIO${n}`);
  } else if (wch) {
    for (const [fn, list] of wch) {
      for (const { pin, macro } of list) {
        add(fn, pin);
        labels[`${fn}@${pin}`] ??= macro;
      }
    }
  }
  for (const list of Object.values(functions)) list.sort((a, b) => order(a).localeCompare(order(b)));
  return { vendor, ports, functions, anyPin: vendor === "nrf", labels, source: vendor === "esp32" || vendor === "wch" ? header?.file : void 0 };
}

// src/ui/model.ts
var isFileUrl = (url) => typeof url === "string" && url.startsWith("file:") && !/(#|%23)virtual|%3Floc=/i.test(url);
function toLoc(url, pos) {
  return { file: (0, import_node_url3.fileURLToPath)(url), line: pos.line, character: pos.character };
}
var SourceCache = class {
  constructor(read = (f) => (0, import_node_fs3.readFileSync)(f, "utf8")) {
    this.read = read;
  }
  files = /* @__PURE__ */ new Map();
  lines(file) {
    let lines = this.files.get(file);
    if (!lines) {
      try {
        lines = this.read(file).split(/\r?\n/);
      } catch {
        lines = [];
      }
      this.files.set(file, lines);
    }
    return lines;
  }
  slice(file, range) {
    const lines = this.lines(file);
    const { start, end } = range;
    if (start.line === end.line) return (lines[start.line] ?? "").slice(start.character, end.character);
    return [
      (lines[start.line] ?? "").slice(start.character),
      ...lines.slice(start.line + 1, end.line),
      (lines[end.line] ?? "").slice(0, end.character)
    ].join("\n");
  }
};
function valueText(propertySource) {
  const eq = propertySource.indexOf("=");
  if (eq < 0) return "";
  return propertySource.slice(eq + 1).replace(/;\s*$/, "").trim();
}
var words = (w) => Array.isArray(w) ? w.reduce((acc, x) => acc * 2 ** 32 + x, 0) : 0;
function bindingProp(p, yaml) {
  const y = yaml?.[p.name];
  return {
    name: p.name,
    type: p.type?.[0]?.types?.[0] ?? "UNKNOWN",
    required: !!p.required,
    enum: p.allowedValues?.length ? p.allowedValues : void 0,
    const: y?.const,
    default: y?.default,
    description: p.description
  };
}
function memoryTree(t) {
  return {
    name: t.name,
    path: t.path,
    start: words(t.start),
    size: words(t.size),
    disabled: !!t.disabled,
    labels: t.labels ?? [],
    children: (t.children ?? []).map(memoryTree)
  };
}
function pinctrlHeader(nodes, src, includePaths) {
  const all = Object.values(nodes);
  if (!all.some((n) => n.compatible.some((c) => /^espressif,esp32.*gpio|^wch,gpio/.test(c)))) return void 0;
  const pinctrl = all.filter((n) => n.path.startsWith("/pin-controller") || n.compatible.some((c) => c.endsWith("-pinctrl")));
  const files = [...new Set([...pinctrl, ...all].flatMap((n) => n.definitions.map((d) => d.file)))];
  for (const f of files) {
    const name = pinctrlInclude(src.lines(f));
    if (!name) continue;
    for (const dir of includePaths) {
      const file = (0, import_node_path2.join)(dir, name);
      if ((0, import_node_fs3.existsSync)(file)) return { file, text: src.lines(file).join("\n") };
    }
  }
  return void 0;
}
function buildModel(context, serialized, memory, src = new SourceCache(), includePaths = []) {
  const nodes = {};
  const bindings = {};
  for (const [path, n] of Object.entries(serialized)) {
    const t = n.nodeType;
    const key = t ? t.bindingsPath ?? t.compatible ?? `generic:${(t.extends ?? []).join(",")}` : void 0;
    if (t && key && !bindings[key]) {
      bindings[key] = {
        file: t.bindingsPath,
        description: t.description,
        bus: t.bus?.length ? t.bus : void 0,
        props: (t.properties ?? []).filter((p) => !p.nameIsRegex).map((p) => bindingProp(p, t.zephyrBinding?.properties))
      };
    }
    const props = (n.properties ?? []).filter((p) => isFileUrl(p.url)).map((p) => {
      const file = (0, import_node_url3.fileURLToPath)(p.url);
      return {
        name: p.name.value,
        value: valueText(src.slice(file, p.range)),
        origin: toLoc(p.url, p.range.start),
        overridden: (p.replaces ?? []).filter((r) => isFileUrl(r.url)).map((r) => toLoc(r.url, r.range.start))
      };
    });
    const compatible = props.find((p) => p.name === "compatible")?.value ?? "";
    nodes[path] = {
      path,
      name: n.fullName ?? n.name,
      labels: n.labels ?? [],
      disabled: !!n.disabled,
      compatible: [...compatible.matchAll(/"([^"]*)"/g)].map((m) => m[1]),
      binding: key,
      props,
      children: n.childNodes ?? [],
      definitions: (n.nodes ?? []).filter((d) => isFileUrl(d.url)).map((d) => toLoc(d.url, d.range.start)),
      reg: (n.reg ?? []).map((r) => ({ start: words(r.mappedStartAddress ?? r.startAddress), size: words(r.size) })),
      issues: (n.issues ?? []).length
    };
  }
  for (const node of Object.values(nodes)) {
    node.children = node.children.map((c) => c.startsWith("/") ? c : `${node.path === "/" ? "" : node.path}/${c}`).filter((c) => nodes[c]);
  }
  const pins = buildPinMap(nodes);
  const buses = buildBuses(nodes, bindings, pins);
  const pinCatalog = buildPinCatalog(nodes, pinctrlHeader(nodes, src, includePaths), pins.usages.map((u) => u.pin), bindings);
  return {
    context,
    root: "/",
    nodes,
    bindings,
    pins,
    pinCatalog,
    buses,
    overview: buildOverview(nodes, bindings, pins, buses, pinCatalog),
    clocks: buildClocks(nodes),
    memoryMap: buildMemoryMap(nodes),
    memory: Object.values(memory?.trees ?? {}).map(memoryTree)
  };
}

// src/ui/pinedits.ts
var escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function replaceCell(value, cell, next) {
  const re = new RegExp(`(?<![\\w&])${escape(cell)}(?![\\w])`);
  return re.test(value) ? value.replace(re, next) : void 0;
}
function gpioOf(catalog, pin) {
  for (const p of catalog.ports) {
    const n = p.pins.indexOf(pin);
    if (n >= 0) return { label: p.name, n };
  }
  return void 0;
}
var wchRemap = (macro) => {
  const m = /^([A-Z0-9]+)_\w*?_P[A-K]\d+_((?:AF)?\d+)$/.exec(macro);
  return m ? [m[1], m[2]] : void 0;
};
function wchRemapClash(model, owner, macro, except) {
  const mine = wchRemap(macro);
  if (!mine || mine[1].startsWith("AF")) return void 0;
  for (const u of model.pins.usages) {
    if (u.owner !== owner || !u.cell || u.cell === except) continue;
    const other = wchRemap(u.cell);
    if (other && other[0] === mine[0] && other[1] !== mine[1]) {
      return `${macro} needs ${mine[0]} remap ${mine[1]}, but ${u.cell} on ${u.pin} uses remap ${other[1]}: a remap moves all ${mine[0]} signals, move them together`;
    }
  }
  return void 0;
}
function allowedPins(catalog, fn) {
  if (fn === "GPIO") return catalog.ports.flatMap((p) => p.pins);
  if (catalog.anyPin) return catalog.ports.filter((p) => !p.external).flatMap((p) => p.pins);
  return catalog.functions[fn] ?? [];
}
function planPinMove(model, req) {
  const { catalog, usages } = { catalog: model.pinCatalog, usages: model.pins.usages };
  const moving = usages.filter((u) => u.owner === req.owner && u.function === req.function && u.pin === req.from);
  if (!moving.length) return { error: `${req.owner} does not use ${req.function} on ${req.from}` };
  if (req.from === req.to) return { error: "the function is already on this pin" };
  if (!allowedPins(catalog, req.function).includes(req.to)) return { error: `${req.function} cannot be routed to ${req.to}` };
  const busy = usages.filter((u) => u.pin === req.to && u.owner !== req.owner && !u.disabled && (u.state ?? "default") === "default");
  if (busy.length && !req.force) return { conflict: [...new Set(busy.map((u) => u.owner))] };
  const values = /* @__PURE__ */ new Map();
  const current = (node, property) => {
    const key = `${node}\0${property}`;
    let c = values.get(key);
    if (!c) {
      const value = model.nodes[node]?.props.find((p) => p.name === property)?.value;
      if (value === void 0) return void 0;
      c = { node, property, value };
      values.set(key, c);
    }
    return c;
  };
  for (const u of moving) {
    const err = applyOne(u);
    if (err) return { error: err };
  }
  return { changes: [...values.values()].map((c) => ({ ...c, value: c.value.replace(/\s*\n\s*/g, " ") })) };
  function applyOne(u) {
    if (u.index !== void 0) {
      const target = gpioOf(catalog, req.to);
      const c = current(u.owner, u.property);
      if (!target || !c) return `cannot locate ${req.to} on a GPIO controller`;
      let k = -1;
      c.value = c.value.replace(/&([\w]+)(\s+)([^\s>]+)/g, (all, _label, space) => ++k === u.index ? `&${target.label}${space}${target.n}` : all);
      return k >= u.index ? void 0 : `entry ${u.index} of ${u.property} not found`;
    }
    if (catalog.vendor === "stm32" && u.ref) {
      const next = catalog.labels[`${req.function}@${req.to}`];
      const c = current(u.owner, u.property);
      const value = next && c && replaceCell(c.value, `&${u.ref}`, `&${next}`);
      if (!value) return `no pinctrl node for ${req.function} on ${req.to}`;
      c.value = value;
      return void 0;
    }
    if (u.source && u.cell) {
      const wch = catalog.vendor === "wch" && /_P[A-K]\d+_(?:AF)?\d+$/.test(u.cell);
      const esp = !wch && /^(\w+?)_GPIO(\d+)$/.exec(u.cell);
      const nrf = /^NRF_PSEL(?:_DISCONNECTED)?\(\s*(\w+)\s*,/.exec(u.cell);
      let next;
      if (wch) {
        next = catalog.labels[`${req.function}@${req.to}`];
        const clash = next && wchRemapClash(model, req.owner, next, u.cell);
        if (clash) return clash;
      } else if (esp) next = `${esp[1]}_GPIO${/^GPIO(\d+)$/.exec(req.to)?.[1]}`;
      else if (nrf) {
        const m = /^P(\d+)\.(\d+)$/.exec(req.to);
        if (m) next = `NRF_PSEL(${nrf[1]}, ${Number(m[1])}, ${Number(m[2])})`;
      }
      const property = esp || wch ? "pinmux" : "psels";
      const c = current(u.source, property);
      const value = next && c && replaceCell(c.value, u.cell, next);
      if (!value) return `cannot rewrite ${u.cell} for ${req.to}`;
      c.value = value;
      return void 0;
    }
    return `${u.property} of ${u.owner} cannot be edited here`;
  }
}
var strings3 = (v) => [...v.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
function planPinAssign(model, req) {
  const { pinCatalog: catalog, pins, nodes } = model;
  const owner = nodes[req.owner];
  if (!owner) return { error: `node ${req.owner} not found` };
  if (!allowedPins(catalog, req.function).includes(req.pin)) return { error: `${req.function} cannot be routed to ${req.pin}` };
  const busy = pins.usages.filter((u) => u.pin === req.pin && u.owner !== req.owner && !u.disabled && (u.state ?? "default") === "default");
  if (busy.length && !req.force) return { conflict: [...new Set(busy.map((u) => u.owner))] };
  const prop3 = (n, name) => n.props.find((p) => p.name === name)?.value;
  const names = strings3(prop3(owner, "pinctrl-names") ?? "");
  const index = names.indexOf("default");
  const stateProp = `pinctrl-${index < 0 ? 0 : index}`;
  const current = prop3(owner, stateProp);
  if (catalog.vendor === "stm32") {
    const label2 = catalog.labels[`${req.function}@${req.pin}`];
    if (!label2) return { error: `no pinctrl node for ${req.function} on ${req.pin}` };
    if (current) {
      if (new RegExp(`&${label2}(?![\\w])`).test(current)) return { error: `${label2} is already in ${stateProp}` };
      return { changes: [{ node: owner.path, property: stateProp, value: current.replace(/\s*>(?![\s\S]*>)/, ` &${label2}>`) }] };
    }
    return { changes: newStateProps(owner, `<&${label2}>`) };
  }
  let cell;
  if (catalog.vendor === "esp32") cell = `${req.function}_GPIO${/^GPIO(\d+)$/.exec(req.pin)?.[1]}`;
  else if (catalog.vendor === "wch") {
    const macro = catalog.labels[`${req.function}@${req.pin}`];
    if (!macro) return { error: `no pinmux macro for ${req.function} on ${req.pin}` };
    const clash = wchRemapClash(model, req.owner, macro);
    if (clash) return { error: clash };
    cell = macro;
  } else if (catalog.vendor === "nrf") {
    const m = /^P(\d+)\.(\d+)$/.exec(req.pin);
    if (!m) return { error: `${req.pin} is not an nRF pin` };
    cell = `NRF_PSEL(${req.function}, ${Number(m[1])}, ${Number(m[2])})`;
  } else return { error: "pin assignment is supported for STM32, ESP32, WCH and nRF" };
  const property = catalog.vendor === "nrf" ? "psels" : "pinmux";
  const ref2 = current && /&([A-Za-z_]\w*)/.exec(current)?.[1];
  if (current) {
    const state = ref2 && Object.values(nodes).find((n) => n.labels.includes(ref2));
    if (!state) return { error: `cannot find the pinctrl state ${ref2 ?? current} of ${owner.name}` };
    const taken = new Set(state.children.map((c) => nodes[c]?.name));
    let i = 1;
    while (taken.has(`group${i}`)) i++;
    return { changes: [], nodes: [{ parent: state.path, name: `group${i}`, props: [{ name: property, value: `<${cell}>` }] }] };
  }
  const controller = Object.values(nodes).find((n) => n.compatible.some((c) => /-pinctrl$/.test(c)));
  if (!controller) return { error: "no pin controller node found" };
  const base = `${owner.labels[0] ?? owner.name.replace(/@.*/, "").replace(/[^\w]/g, "_")}_default`;
  let label = base;
  for (let i = 2; Object.values(nodes).some((n) => n.labels.includes(label) || n.path === `${controller.path}/${label}`); i++) label = `${base}_${i}`;
  return {
    changes: newStateProps(owner, `<&${label}>`),
    nodes: [{ parent: controller.path, name: label, label, props: [], children: [{ name: "group1", props: [{ name: property, value: `<${cell}>` }] }] }]
  };
}
function newStateProps(owner, value) {
  return [
    { node: owner.path, property: "pinctrl-0", value },
    { node: owner.path, property: "pinctrl-names", value: '"default"' }
  ];
}

// src/ui/backend.ts
var log = (...args) => console.error("[companion]", ...args);
var EditorBackend = class {
  constructor(h) {
    this.h = h;
  }
  /** Serialized nodes of the last model, for edit planning. */
  serialized;
  /**
   * serializedContext costs seconds on large SoCs (STM32 HAL pinctrl), so the
   * model is cached until invalidate() and concurrent requests share one fetch.
   */
  generation = 0;
  cached;
  inflight;
  /** zephyrTypeBindings takes ~15 s and tens of MB on a full Zephyr tree: once per context. */
  /** Include paths by context id, for headers the model reads (ESP32 pinctrl). */
  includePaths = /* @__PURE__ */ new Map();
  catalogs = /* @__PURE__ */ new Map();
  async contexts() {
    const list = await this.h.server.request("devicetree/getContexts") ?? [];
    const external = this.h.external();
    for (const c of list) this.includePaths.set(c.id, (c.settings?.includePaths ?? []).map((p) => (0, import_node_path3.resolve)(c.settings?.cwd ?? "", p)));
    return list.map((c) => ({
      id: c.id,
      names: c.ctxNames,
      active: c.active,
      overlays: (c.settings?.overlays ?? []).map((o) => (0, import_node_path3.resolve)(c.settings?.cwd ?? "", o)).filter((o) => !isUnder(o, external))
    }));
  }
  /** Something the model depends on changed (buffer, save, active context). */
  invalidate() {
    this.generation++;
  }
  async model() {
    const generation = this.generation;
    if (this.cached?.generation === generation) {
      const active = (await this.contexts()).find((c) => c.active);
      if (active?.id === this.cached.id) return { ...this.cached.model, context: active };
    }
    if (this.inflight?.generation !== generation) {
      const promise = this.fetchModel(generation);
      this.inflight = { generation, promise };
      promise.finally(() => {
        if (this.inflight?.promise === promise) this.inflight = void 0;
      });
    }
    return this.inflight.promise;
  }
  async fetchModel(generation) {
    const t = Date.now();
    const active = (await this.contexts()).find((c) => c.active);
    if (!active) return void 0;
    const [nodes, memory] = await Promise.all([
      this.h.server.request("devicetree/serializedContext", active.id),
      this.h.server.request("devicetree/memoryViews", { ctxId: active.id }).catch(() => void 0)
    ]);
    if (!nodes) return void 0;
    this.serialized = { id: active.id, nodes };
    const model = buildModel(active, nodes, memory, new SourceCache(this.h.docs.read), this.includePaths.get(active.id));
    this.cached = { generation, id: active.id, model };
    log(`model ${active.names[0] ?? active.id}: ${Object.keys(model.nodes).length} nodes in ${Date.now() - t} ms`);
    return model;
  }
  async setActive(id) {
    await this.h.server.request("devicetree/setActive", { id });
  }
  async open(loc) {
    if (this.h.canShowDocument()) {
      const pos = { line: loc.line, character: loc.character };
      const res = await this.h.zed.request("window/showDocument", { uri: (0, import_node_url4.pathToFileURL)(loc.file).href, takeFocus: true, selection: { start: pos, end: pos } }).catch(() => void 0);
      if (res?.success) return;
    }
    const cli = zedCli();
    if (!cli) throw new Error("cannot open files in Zed: no showDocument support and no zed CLI on PATH");
    (0, import_node_child_process.spawn)(cli, [`${loc.file}:${loc.line + 1}:${loc.character + 1}`], { detached: true, stdio: "ignore" }).unref();
  }
  async catalog(bus) {
    const active = (await this.contexts()).find((c) => c.active);
    if (!active) return [];
    let all = this.catalogs.get(active.id);
    if (!all) {
      const t = Date.now();
      all = this.h.server.request("devicetree/zephyrTypeBindings", active.id).then((raw) => {
        const catalog = buildCatalog(raw ?? []);
        log(`bindings catalog ${active.names[0] ?? active.id}: ${raw?.length ?? 0} bindings in ${Date.now() - t} ms`);
        return catalog;
      });
      all.catch(() => this.catalogs.delete(active.id));
      this.catalogs.set(active.id, all);
    }
    return (await all)[bus] ?? [];
  }
  edit(req) {
    return this.apply(req.overlay, req.nodePath, (node, src) => planEdit(node, req, src));
  }
  /** Several property edits in one overlay change (clock tree forms). */
  editMany(overlay, edits) {
    return this.applyWith(overlay, (nodes, src) => {
      const uri = (0, import_node_url4.pathToFileURL)(overlay).href;
      const byNode = /* @__PURE__ */ new Map();
      for (const e of edits) byNode.set(e.nodePath, [...byNode.get(e.nodePath) ?? [], { property: e.property, value: e.value }]);
      const out = [];
      for (const [path, props] of byNode) {
        if (!nodes[path]) return `node ${path} not found`;
        out.push(...planEdits(nodes[path], path, overlay, props, src));
      }
      return { changes: { [uri]: out } };
    });
  }
  addNode(req) {
    if (!/^[A-Za-z0-9,._+-]+(@[0-9A-Za-z,._+-]+)?$/.test(req.name)) return Promise.resolve({ applied: false, error: `invalid node name "${req.name}"` });
    return this.apply(req.overlay, req.parentPath, (node, src) => {
      const path = `${req.parentPath === "/" ? "" : req.parentPath}/${req.name}`;
      return this.serialized?.nodes[path] ? `node ${path} already exists` : planChild(node, req, src);
    });
  }
  setAddress(req) {
    return this.apply(req.overlay, req.nodePath, (node, src) => planAddress(node, req, src));
  }
  movePin(req) {
    return this.applyPinPlan(req.overlay, req.to, (model) => planPinMove(model, req));
  }
  assignPin(req) {
    return this.applyPinPlan(req.overlay, req.pin, (model) => planPinAssign(model, req));
  }
  /** Writes a pin plan: changed properties via planEdit, new pinctrl nodes via planChild. */
  async applyPinPlan(overlay, pin, make) {
    let conflict;
    const res = await this.applyWith(overlay, (nodes, src) => {
      const plan = make(this.cached.model);
      if ("error" in plan) return plan.error;
      if ("conflict" in plan) {
        conflict = plan.conflict;
        return `${pin} is used by ${plan.conflict.join(", ")}`;
      }
      const uri = (0, import_node_url4.pathToFileURL)(overlay).href;
      const edits = [];
      for (const n of plan.nodes ?? []) {
        const parent = nodes[n.parent];
        if (!parent) return `node ${n.parent} not found`;
        edits.push(...planChild(parent, { parentPath: n.parent, overlay, name: n.name, label: n.label, props: n.props, children: n.children }, src).changes[uri] ?? []);
      }
      for (const c of plan.changes) {
        const node = nodes[c.node];
        if (!node) return `node ${c.node} not found`;
        edits.push(...planEdit(node, { nodePath: c.node, overlay, property: c.property, value: c.value }, src).changes[uri] ?? []);
      }
      return { changes: { [uri]: edits } };
    });
    return conflict ? { ...res, conflict } : res;
  }
  apply(overlay, nodePath, plan) {
    return this.applyWith(overlay, (nodes, src) => nodes[nodePath] ? plan(nodes[nodePath], src) : `node ${nodePath} not found`);
  }
  async applyWith(overlay, plan) {
    const active = (await this.contexts()).find((c) => c.active);
    if (!active || !active.overlays.includes((0, import_node_path3.resolve)(overlay))) {
      return { applied: false, error: "target is not a user overlay of the active context" };
    }
    if (this.cached?.generation !== this.generation || this.serialized?.id !== active.id) await this.model();
    if (!this.serialized || !this.cached) return { applied: false, error: "no devicetree model" };
    const edit = plan(this.serialized.nodes, new SourceCache(this.h.docs.read));
    if (typeof edit === "string") return { applied: false, error: edit };
    const res = await this.h.zed.request("workspace/applyEdit", { label: "Devicetree visual editor", edit });
    if (!res?.applied) log("applyEdit rejected", res?.failureReason ?? "");
    return { applied: !!res?.applied, error: res?.applied ? void 0 : res?.failureReason ?? "Zed rejected the edit" };
  }
};
function openExternal(url) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  (0, import_node_child_process.spawn)(cmd, args, { detached: true, stdio: "ignore" }).unref();
}
function zedCli() {
  const names = process.platform === "win32" ? ["zed.exe", "zed.cmd"] : ["zed", "zeditor", "zedit"];
  for (const dir of (process.env.PATH ?? "").split(import_node_path3.delimiter)) {
    for (const n of names) if (dir && (0, import_node_fs4.existsSync)((0, import_node_path3.join)(dir, n))) return (0, import_node_path3.join)(dir, n);
  }
  const mac = "/Applications/Zed.app/Contents/MacOS/cli";
  return process.platform === "darwin" && (0, import_node_fs4.existsSync)(mac) ? mac : void 0;
}

// src/ui/server.ts
var import_node_crypto = require("node:crypto");
var import_node_http = require("node:http");

// dist/ui.html
var ui_default = '<!doctype html>\n<!-- SPDX-License-Identifier: Apache-2.0 -->\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <meta name="color-scheme" content="light dark" />\n    <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'self\'; img-src data:" />\n    <title>Devicetree</title>\n    <style>:root{color-scheme:light dark;--bg: #ffffff;--bg2: #f5f6f8;--fg: #1d2129;--muted: #6b7280;--border: #dfe2e7;--hover: #eef1f5;--sel: #dbe8ff;--sel-fg: #0b3d91;--accent: #2563eb;--label: #7c3aed;--ok: #15803d;--warn: #b45309;--warn-bg: #fff4e0;--danger: #c62828;--danger-bg: #fdecec;--code: #f1f3f6;--seg0: #60a5fa;--seg1: #34d399;--seg2: #fbbf24;--seg3: #f472b6;--seg4: #a78bfa;--seg5: #22d3ee;--mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace}@media (prefers-color-scheme: dark){:root{--bg: #1b1d22;--bg2: #22252b;--fg: #d8dbe0;--muted: #8b919c;--border: #353941;--hover: #2a2e35;--sel: #23395f;--sel-fg: #cfe0ff;--accent: #6ea2ff;--label: #c4a3ff;--ok: #4ade80;--warn: #fbbf24;--warn-bg: #3a2f17;--danger: #f87171;--danger-bg: #3d1f22;--code: #262a31}}*{box-sizing:border-box}html,body{margin:0;height:100%}body{background:var(--bg);color:var(--fg);font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif}#app{display:flex;flex-direction:column;height:100vh}.mono,code,input.mono,textarea{font-family:var(--mono);font-size:12px}.muted{color:var(--muted)}button,select,input,textarea{font:inherit;color:inherit;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:2px 6px}button{cursor:pointer;background:var(--bg2)}button:hover:not(:disabled){border-color:var(--accent)}button:disabled,select:disabled,input:disabled{opacity:.5;cursor:default}button.primary{background:var(--accent);border-color:var(--accent);color:#fff}button.icon{border-color:transparent;background:none;padding:0 4px;color:var(--muted)}button.icon:hover:not(:disabled){color:var(--fg)}button.icon.danger:hover:not(:disabled){color:var(--danger)}button.link{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;text-align:left}button.link:hover{text-decoration:underline}:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:6px 10px;border-bottom:1px solid var(--border);background:var(--bg2)}header .brand{font-weight:600}header label{display:flex;align-items:center;gap:4px;color:var(--muted)}header select{color:var(--fg);max-width:40vw}.spacer{flex:1}.note{color:var(--warn)}.dot{width:8px;height:8px;border-radius:50%}.dot.up{background:var(--ok)}.dot.down{background:var(--danger)}.tabs{display:flex;gap:2px;padding:0 10px;border-bottom:1px solid var(--border);background:var(--bg2)}.tab{border:0;border-bottom:2px solid transparent;border-radius:0;background:none;padding:5px 10px;color:var(--muted)}.tab.active{color:var(--fg);border-bottom-color:var(--accent)}.message{display:flex;align-items:flex-start;gap:8px;padding:5px 10px;border-bottom:1px solid var(--border);white-space:pre-wrap}.message span{flex:1}.message.error{background:var(--danger-bg);color:var(--danger)}.message.info{background:var(--bg2)}main{flex:1;min-height:0}main.center{display:flex;align-items:center;justify-content:center}main.split{display:grid;grid-template-columns:minmax(260px,38%) 1fr}main.single{display:flex;flex-direction:column}.empty{padding:16px;color:var(--muted)}.tree-pane{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--border)}.search{display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--border)}.search input{flex:1;min-width:0}.count{white-space:nowrap;font-size:12px}.tree{flex:1;overflow:auto;padding:2px 0;outline:none}.row{display:flex;align-items:center;gap:4px;white-space:nowrap;padding:1px 6px 1px 4px;cursor:default}.row:hover{background:var(--hover)}.row.selected{background:var(--sel);color:var(--sel-fg)}.tree:focus .row.selected{box-shadow:inset 2px 0 0 var(--accent)}.row.disabled .name,.row.disabled .compat,.row.disabled .label{opacity:.5}.row.context{opacity:.6}.twisty{width:12px;flex:none;color:var(--muted);text-align:center;cursor:pointer}.label{color:var(--label);font-family:var(--mono);font-size:12px}.compat{color:var(--muted);overflow:hidden;text-overflow:ellipsis;font-size:12px}.badge{font-size:11px;padding:0 5px;border-radius:8px;border:1px solid var(--border);white-space:nowrap;font-weight:400}.badge.muted{color:var(--muted)}.badge.ok{color:var(--ok);border-color:currentColor}.badge.warn{color:var(--warn);border-color:currentColor;background:var(--warn-bg)}.details{overflow:auto;padding:8px 14px 24px;min-width:0}.d-head{display:flex;align-items:center;gap:10px}.d-head h2{flex:1;margin:0;font-size:15px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.d-path{color:var(--muted);margin:2px 0 8px;display:flex;gap:6px;word-break:break-all}.kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;margin:0 0 8px}.kv dt{color:var(--muted)}.kv dd{margin:0;min-width:0}.desc{white-space:pre-wrap;color:var(--muted);max-height:7.5em;overflow:auto;margin-top:2px}section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:14px 0 4px;font-weight:600}.defs{margin:0;padding-left:18px}.defs .link{word-break:break-all}table{border-collapse:collapse;width:100%}th{text-align:left;font-weight:600;color:var(--muted);font-size:12px;border-bottom:1px solid var(--border);padding:3px 6px}td{border-bottom:1px solid var(--border);padding:3px 6px;vertical-align:top}.props .pname{white-space:nowrap}.props .pvalue{width:55%;word-break:break-word}.props .pvalue code{white-space:pre-wrap;background:var(--code);padding:0 3px;border-radius:3px}.props .porigin{white-space:nowrap}.props .pactions{white-space:nowrap;text-align:right}.type{margin-left:6px;font-size:11px;color:var(--muted)}.type.required{color:var(--warn)}tr.missing{background:var(--warn-bg)}.warn-text{color:var(--warn)}.overrides summary{cursor:pointer;color:var(--muted);font-size:12px}.overrides ol{margin:2px 0;padding-left:20px}.editor{display:flex;gap:4px;align-items:flex-start}.editor input,.editor textarea{flex:1;min-width:0}.add{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;padding:6px;background:var(--bg2);border:1px solid var(--border);border-radius:4px}.add input[type=text]{flex:1;min-width:160px}.add .preview{flex-basis:100%}.add .hint{flex-basis:100%;font-size:12px}.check{display:flex;align-items:center;gap:4px}option.required{font-weight:600}.memory{overflow:auto;flex:1;padding:0 0 24px}.mem tbody tr:not(.bar-row){cursor:pointer}.mem tbody tr:not(.bar-row):hover{background:var(--hover)}.mem tr.root td{font-weight:600;background:var(--bg2)}.mem tr.disabled td{opacity:.55}.mem tr.selected td{background:var(--sel);color:var(--sel-fg)}.mem td{vertical-align:middle}.mem td.num{text-align:right;white-space:nowrap}.mem td.mono{white-space:nowrap}.mem tr.bar-row td{border-bottom:0;padding-top:0;padding-bottom:4px}.bar{position:relative;height:12px;background:var(--code);border:1px solid var(--border);border-radius:3px;overflow:hidden}.seg{position:absolute;top:0;bottom:0;min-width:2px;cursor:pointer;border-right:1px solid var(--bg)}.seg:hover{filter:brightness(1.15)}.seg.disabled{opacity:.35}.seg.selected{outline:2px solid var(--fg);outline-offset:-2px}.seg.c0{background:var(--seg0)}.seg.c1{background:var(--seg1)}.seg.c2{background:var(--seg2)}.seg.c3{background:var(--seg3)}.seg.c4{background:var(--seg4)}.seg.c5{background:var(--seg5)}.badge.error{color:var(--danger);border-color:currentColor;background:var(--danger-bg);margin-left:6px}.error-text{color:var(--danger)}.pins{overflow:auto;flex:1;padding:0 0 24px}.pin-bar{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:12px;padding:6px;background:var(--bg);border-bottom:1px solid var(--border)}.pin-bar input[type=search]{width:280px}.pin-table td{vertical-align:middle}.pin-table tr.cont td{border-top:0}.pin-table tr.first:not(:first-child) td{border-top:1px solid var(--border)}.pin-table td.pin{font-weight:600;white-space:nowrap;vertical-align:top}.pin-table tr.conflict td{background:var(--danger-bg)}.pin-table tr.conflict td.pin{color:var(--danger)}.pin-table tr.focus td{box-shadow:inset 0 0 0 9999px color-mix(in srgb,var(--sel) 70%,transparent)}.pin-table tr.disabled td:not(.pin){opacity:.55}.pin-table tr.nondefault td:not(.pin){color:var(--muted)}.pin-table .owner{color:inherit}.pin-table .owner:hover{color:var(--accent)}.unknown{margin:12px 6px}.unknown summary{cursor:pointer;color:var(--warn)}.unknown code{white-space:pre-wrap;word-break:break-word}.node-pins{margin:0;padding-left:18px}.node-pins li.nondefault{opacity:.7}main.buses-split{grid-template-columns:minmax(420px,58%) 1fr}.buses{overflow:auto;border-right:1px solid var(--border)}.bus-card{margin:10px;border:1px solid var(--border);border-radius:6px;background:var(--bg2)}.bus-card.off{opacity:.75}.bus-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--border)}.bus-title{font-weight:600}.pins-inline{display:inline-flex;flex-wrap:wrap;gap:3px}.chip{font-size:11px;padding:0 5px;border-radius:8px;background:var(--code)}.bus-diagram{overflow-x:auto;padding:4px}.bus-svg{display:block;font:12px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif}.bus-svg rect{fill:var(--bg);stroke:var(--border);stroke-width:1.5}.bus-svg g{cursor:pointer}.bus-svg g:hover rect{fill:var(--hover)}.bus-svg g.selected rect{fill:var(--sel);stroke:var(--accent)}.bus-svg .ctrl rect{stroke:var(--accent)}.bus-svg .off rect{stroke-dasharray:4 3}.bus-svg .off text{fill:var(--muted)}.bus-svg .warning rect{stroke:var(--warn)}.bus-svg .error rect{stroke:var(--danger);stroke-width:2}.bus-svg .t1{fill:var(--fg);font-weight:600}.bus-svg .t2{fill:var(--muted);font-family:var(--mono);font-size:11px}.bus-svg .wire{stroke:var(--accent);stroke-width:2}.bus-svg .wire.off{stroke:var(--muted);stroke-dasharray:4 3}.bus-svg .wire.ref{stroke-dasharray:2 3}.bus-svg .wire.warning{stroke:var(--warn)}.bus-svg .wire.error{stroke:var(--danger)}.bus-svg .joint{fill:var(--accent)}.bus-svg .joint.off{fill:var(--muted)}.bus-svg .edge{fill:var(--fg);font-family:var(--mono);font-size:11px}.bus-svg .edge.sub{fill:var(--muted)}.bus-svg .edge.warning{fill:var(--warn)}.bus-svg .edge.error{fill:var(--danger)}.bus-issues{margin:0;padding:4px 8px 8px 24px}.bus-issues .link{color:inherit;text-align:left}.add-device{display:flex;flex-direction:column;gap:6px;padding:8px;border-bottom:1px solid var(--border);background:var(--bg)}.add-device .row{display:flex;align-items:center;gap:8px}.add-device input[type=search]{width:300px}.add-device .catalog{width:100%}.dev-fields{display:flex;flex-direction:column;gap:4px}.dev-fields .desc{margin-bottom:2px}.field{display:grid;grid-template-columns:220px 1fr;align-items:center;gap:8px}.field .type{margin-left:6px}.editor.inline{display:inline-flex;align-items:center}.editor.inline input{width:90px;flex:none}main.overview-split{grid-template-columns:minmax(480px,66%) 1fr}.overview{overflow:auto;border-right:1px solid var(--border)}.overview-diagram{padding:8px}.ov-svg{display:block;font:12px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif}.ov-svg rect{fill:var(--bg2);stroke:var(--border);stroke-width:1.5}.ov-svg g.blk,.ov-svg g.soc,.ov-svg .pin,.ov-svg .switch{cursor:pointer}.ov-svg g.blk:hover rect,.ov-svg g.soc:hover rect{fill:var(--hover)}.ov-svg g.selected rect{fill:var(--sel);stroke:var(--accent)}.ov-svg .soc rect{stroke:var(--accent);stroke-width:2}.ov-svg .blk.off rect{stroke-dasharray:4 3;fill:var(--bg)}.ov-svg .blk.off text{fill:var(--muted)}.ov-svg .blk.error rect{stroke:var(--danger);stroke-width:2}.ov-svg .group{fill:var(--muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}.ov-svg .t1{fill:var(--fg);font-weight:600}.ov-svg .t2{fill:var(--muted);font-family:var(--mono);font-size:11px}.ov-svg .t3{fill:var(--fg);font-family:var(--mono);font-size:11px}.ov-svg .wire{stroke:var(--accent);stroke-width:1.5;opacity:.6}.ov-svg .wire.off{stroke:var(--muted);stroke-dasharray:4 3}.ov-svg .lead{stroke:var(--fg);stroke-width:1.2;opacity:.7}.ov-svg .lead.off{stroke:var(--muted)}.ov-svg .lead.error{stroke:var(--danger);opacity:1}.ov-svg .pin{fill:var(--fg);font-family:var(--mono);font-size:11px}.ov-svg .pin:hover{fill:var(--accent);text-decoration:underline}.ov-svg .lead.ext{stroke-dasharray:3 2}.ov-svg .pin.ext{fill:var(--muted);font-style:italic}.ov-svg .pin.off{fill:var(--muted)}.ov-svg .pin.error{fill:var(--danger);font-weight:600}.ov-svg .switch circle{fill:var(--ok);stroke:var(--bg);stroke-width:1.5}.ov-svg .switch.off circle{fill:var(--bg);stroke:var(--muted)}.ov-svg .switch.locked{cursor:default;opacity:.5}.vswitch{display:inline-flex}.vswitch button{border-radius:0}.vswitch button:first-child{border-radius:4px 0 0 4px}.vswitch button:last-child{border-radius:0 4px 4px 0;border-left:none}.pins.grid-mode{display:flex;flex-direction:column;height:100%;min-height:0}.pin-grid-wrap{flex:1;min-height:0;display:grid;grid-template-columns:minmax(560px,62%) 1fr}.pin-grid{overflow:auto;padding:10px;border-right:1px solid var(--border)}.prow{display:flex;gap:3px;margin-bottom:3px;align-items:stretch}.plabel{width:64px;flex:none;align-self:center;color:var(--muted)}.pcell{width:52px;height:40px;flex:none;padding:2px 3px;display:flex;flex-direction:column;align-items:flex-start;border:1px solid var(--border);border-top:4px solid var(--border);border-radius:4px;background:var(--bg2);cursor:pointer;overflow:hidden}.pcell:hover{background:var(--hover)}.pcell .pnum{font-family:var(--mono);font-size:11px;color:var(--muted)}.pcell .pfn{font-family:var(--mono);font-size:9.5px;white-space:nowrap}.pcell.idle{opacity:.55}.pcell.na{opacity:.25;cursor:default}.pcell.focus{outline:2px solid var(--accent);outline-offset:1px}.pcell.conflict{border-color:var(--danger);background:var(--danger-bg)}.pcell[draggable=true]{cursor:grab}.pcell.dragging{opacity:.4}.pcell.drop-ok{box-shadow:0 0 0 2px var(--ok) inset}.pcell.drop-busy{box-shadow:0 0 0 2px var(--warn) inset}.pcell.drop-no{opacity:.2}.c-gpio{--fc: #9ca3af}.c-uart{--fc: #60a5fa}.c-i2c{--fc: #34d399}.c-spi{--fc: #f472b6}.c-can{--fc: #fbbf24}.c-analog{--fc: #a78bfa}.c-timer{--fc: #22d3ee}.c-fast{--fc: #fb923c}.c-other{--fc: #94a3b8}.pcell[class*=c-]{border-top-color:var(--fc)}.swatch{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px;background:var(--fc, var(--border))}.swatch.conflict-sw{background:var(--danger)}.legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;font-size:12px}.outside{margin-top:8px}.ext-head{margin:14px 0 4px;font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:.04em}.ext-port{margin:6px 0 3px;font-size:12px}.pcell.ext{border-style:dashed;border-top-style:solid}.pin-panel{overflow:auto;padding:10px 14px}.pin-panel h2{margin:0 0 6px;font-size:16px;font-family:var(--mono)}.pin-panel h3{margin:12px 0 4px;font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:.04em}.pin-panel ul{list-style:none;margin:0;padding:0}.pin-panel li{padding:3px 0;border-bottom:1px solid var(--border)}.pin-panel li select{margin-left:6px}.pin-panel input[type=search]{width:100%;margin-bottom:4px}.pin-panel .fn-owner button{margin-left:4px;font-size:11px;padding:0 6px}.pin-panel .source{margin-top:10px}.pin-panel button.small{font-size:11px;padding:0 6px}.pin-panel .assign{display:flex;gap:4px;margin:4px 0 2px 14px}.pin-panel .assign select{flex:1;min-width:0}.clk-wrap{flex:1;min-height:0;display:grid;grid-template-columns:minmax(600px,1fr) 380px;height:100%}.clk-graph{overflow:auto;padding:10px;border-right:1px solid var(--border)}.clk-svg{display:block;font:12px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif}.clk-svg rect{fill:var(--bg2);stroke:var(--border);stroke-width:1.5}.clk-svg g.cbox{cursor:pointer}.clk-svg g.cbox:hover rect{fill:var(--hover)}.clk-svg g.selected rect{fill:var(--sel);stroke:var(--accent)}.clk-svg .off rect{stroke-dasharray:4 3;fill:var(--bg)}.clk-svg .off text{fill:var(--muted)}.clk-svg .error rect{stroke:var(--danger);stroke-width:2}.clk-svg .error .t2{fill:var(--danger)}.clk-svg .t1{fill:var(--fg);font-weight:600}.clk-svg .t2{fill:var(--accent);font-family:var(--mono);font-size:11px}.clk-svg .edge{fill:none;stroke:var(--muted);stroke-width:1.3;opacity:.8}.clk-svg .edge.error{stroke:var(--danger)}.clk-svg .elabel{fill:var(--muted);font-family:var(--mono);font-size:10px}.clk-panel{overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:6px}.clk-panel h2{margin:0;font-size:15px;font-family:var(--mono);display:flex;gap:8px;align-items:center}.clk-panel h3{margin:10px 0 0;font-size:13px}.clk-issues{margin:0;padding-left:4px;list-style:none}.ok-text{color:var(--ok)}.clk-params td{padding:3px 6px 3px 0}.clk-params tr.changed td:first-child{color:var(--warn);font-weight:600}.clk-params input[type=number]{width:110px}.clk-actions{display:flex;gap:6px;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)}main.memory-split{grid-template-columns:minmax(480px,64%) 1fr}.memory{border-right:1px solid var(--border)}.mem-cols{display:flex;flex-wrap:wrap;gap:16px;padding:12px;align-items:flex-start}.mem-col{border:1px solid var(--border);border-radius:6px;padding:8px;background:var(--bg2)}.mem-col.off{opacity:.6}.mem-head{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.mem-name{font-weight:600}.mem-hint{padding:0 12px}.mem-more{margin:8px 12px}.mem-more summary{cursor:pointer;color:var(--muted)}.mem-svg{display:block;margin-top:6px;font:12px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif}.mem-svg .addr{fill:var(--muted);font-family:var(--mono);font-size:10.5px}.mem-svg .tick{stroke:var(--muted)}.mem-svg .t1{fill:#10131a;font-weight:600}.mem-svg .t2{fill:#10131a;font-family:var(--mono);font-size:10.5px;opacity:.85}.mem-svg g.mseg{cursor:pointer}.mem-svg g.mseg rect{stroke:var(--bg);stroke-width:1}.mem-svg g.mseg.c0 rect{fill:var(--seg0)}.mem-svg g.mseg.c1 rect{fill:var(--seg1)}.mem-svg g.mseg.c2 rect{fill:var(--seg2)}.mem-svg g.mseg.c3 rect{fill:var(--seg3)}.mem-svg g.mseg.c4 rect{fill:var(--seg4)}.mem-svg g.mseg.c5 rect{fill:var(--seg5)}.mem-svg g.mseg:hover rect{filter:brightness(1.12)}.mem-svg g.mseg.off rect{opacity:.4}.mem-svg g.mseg.selected rect{stroke:var(--fg);stroke-width:2.5}.mem-svg g.mseg.overlap rect{stroke:var(--danger);stroke-width:2.5;stroke-dasharray:5 3}.mem-svg g.gap rect{fill:var(--bg);stroke:var(--border);stroke-dasharray:3 3}.mem-svg g.gap .t2{fill:var(--muted);opacity:1}.mem-svg g.gap.can-add{cursor:copy}.mem-svg g.gap.can-add:hover rect{fill:var(--hover);stroke:var(--accent)}.mem-svg g.gap.ram{cursor:pointer}.mem-svg g.gap.ram rect{fill:var(--code);stroke-dasharray:none}\n</style>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script>"use strict";(()=>{var hn=new URLSearchParams(location.search).get("t")??"";async function q(e,n,s){let o={"X-Token":hn};s!==void 0&&(o["Content-Type"]="application/json");let i=await fetch(n,{method:e,headers:o,body:s===void 0?void 0:JSON.stringify(s)});if(!i.ok){let l=await i.text().catch(()=>"");throw new Error(`${e} ${n}: HTTP ${i.status}${l?` - ${l.slice(0,300)}`:""}`)}return i}async function bn(){let e=await q("GET","/api/model");return e.status===204?null:await e.json()}var yn=async()=>(await q("GET","/api/contexts")).json(),vn=async e=>void await q("POST","/api/active",{id:e}),$n=async e=>void await q("POST","/api/open",{file:e.file,line:e.line,character:e.character});async function kn(e){return(await q("POST","/api/edit",e)).json()}var wn=async e=>(await q("GET",`/api/catalog?bus=${encodeURIComponent(e)}`)).json(),Le=async e=>(await q("POST","/api/add-node",e)).json(),xn=async e=>(await q("POST","/api/address",e)).json(),Un=async e=>(await q("POST","/api/move-pin",e)).json(),Mn=async e=>(await q("POST","/api/assign-pin",e)).json(),Pn=async(e,n)=>(await q("POST","/api/edits",{overlay:e,edits:n})).json();function En(e,n){let s=new EventSource(`/api/events?t=${encodeURIComponent(hn)}`);return s.addEventListener("changed",o=>{let i="";try{i=JSON.parse(o.data).reason??""}catch{}e(i)}),s.onopen=()=>n(!0),s.onerror=()=>n(s.readyState===EventSource.OPEN),s}var kt=new Set(["value","checked","disabled","selected","open","indeterminate"]);function t(e,n=null,...s){let o=document.createElement(e),i=[];for(let[l,a]of Object.entries(n??{}))if(a!=null)if(kt.has(l))i.push([l,a]);else if(l.startsWith("on")&&typeof a=="function")o.addEventListener(l.slice(2),a);else{if(a===!1)continue;l==="class"?o.className=String(a):o.setAttribute(l,a===!0?"":String(a))}Fe(o,s);for(let[l,a]of i)o[l]=a;return o}function Fe(e,n){if(!(n==null||n===!1))if(Array.isArray(n))for(let s of n)Fe(e,s);else e.appendChild(typeof n=="object"?n:document.createTextNode(String(n)))}function Cn(e,n){let s=document.activeElement,o=s&&e.contains(s)?s.dataset.key:void 0,i=o&&"selectionStart"in s?[s.selectionStart,s.selectionEnd]:null,l=[...e.querySelectorAll("[data-scroll]")].map(a=>[a.dataset.scroll,a.scrollTop]);e.replaceChildren(),Fe(e,n);for(let[a,c]of l){let u=e.querySelector(`[data-scroll="${a}"]`);u&&(u.scrollTop=c)}if(o){let a=e.querySelector(`[data-key="${CSS.escape(o)}"]`);if(a&&(a.focus({preventScroll:!0}),i&&i[0]!=null&&i[1]!=null&&typeof a.setSelectionRange=="function"))try{a.setSelectionRange(i[0],i[1])}catch{}}}var I=e=>e.split(/[\\\\/]/).pop()??e,Sn=(e,n=3)=>{let s=e.split(/[\\\\/]/).filter(Boolean);return(s.length>n?"\\u2026/":"")+s.slice(-n).join("/")},ue=e=>`${I(e.file)}:${e.line+1}`,pe=e=>`${e.file}:${e.line+1}:${e.character+1}`,W=e=>"0x"+e.toString(16).padStart(8,"0");function j(e){let n=["B","KiB","MiB","GiB","TiB"],s=0,o=e;for(;o>=1024&&s<n.length-1;)o/=1024,s++;return`${s===0?o:Number(o.toFixed(2))} ${n[s]}`}function oe(e){return/^".*"$/s.test(e)?e:`"${e.replace(/\\\\/g,"\\\\\\\\").replace(/"/g,\'\\\\"\')}"`}var Te=e=>e.trim().startsWith("<")?e.trim():`<${e.trim()}>`;function Ln(e,n){return e==="STRING"||e==="STRINGLIST"?oe(String(n)):e==="U32"||e==="U64"?`<${n}>`:String(n)}var $e="\\0custom",fe=()=>({name:"",custom:"",text:"",checked:!0}),r={loaded:!1,model:null,contexts:[],parents:new Map,selected:"/",expanded:new Set(["/"]),tab:"tree",search:"",overlay:"",overlayContext:"",editing:null,add:fe(),openOverrides:new Set,message:null,busy:!1,connected:!0,scrollToSelected:!1,pinFilter:"",pinOnlyConflicts:!1,pinFocus:"",pinScroll:!1,unknownOpen:!1,pinView:"grid",fnFilter:"",assign:null,clockDraft:new Map,clockFocus:"",memRestOpen:!1,memTableOpen:!1,busShowAll:!1,overviewDisabled:!1,device:null,catalogs:new Map,address:null},_n=()=>{},On=e=>void(_n=e),k=()=>_n(),Tn;function ee(e,n){r.message={kind:e,text:n},window.clearTimeout(Tn),e==="info"&&(Tn=window.setTimeout(()=>(r.message=null,k()),3e3)),k()}var me=e=>e instanceof Error?e.message:String(e),U=()=>!!r.model&&r.model.context.overlays.includes(r.overlay)&&!r.busy;function wt(e){if(r.model=e,r.parents.clear(),!e)return;for(let s of Object.values(e.nodes))for(let o of s.children)r.parents.set(o,s.path);if(!e.nodes[r.selected]){let s=r.selected;for(;s!=="/"&&!e.nodes[s];)s=s.slice(0,s.lastIndexOf("/"))||"/";Nn(e.nodes[s]?s:e.root)}let n=e.context.overlays;r.overlayContext!==e.context.id&&(r.catalogs.clear(),r.device=null),(r.overlayContext!==e.context.id||!n.includes(r.overlay))&&(r.overlay=n[n.length-1]??"",r.overlayContext=e.context.id),r.editing&&!e.nodes[r.selected]?.props.some(s=>s.name===r.editing.prop)&&(r.editing=null)}var Ge=!1,je=!1;async function ge(){if(Ge){je=!0;return}Ge=!0;try{do{je=!1;let[e,n]=await Promise.all([bn(),yn().catch(()=>null)]);wt(e),r.contexts=n??(e?[e.context]:[]),r.loaded=!0}while(je)}catch(e){ee("error",me(e))}finally{Ge=!1,k()}}function qe(e){let n=[];for(let s=r.parents.get(e);s!==void 0;s=r.parents.get(s))n.push(s);return n}function Nn(e){e!==r.selected&&(r.editing=null,r.add=fe(),r.address=null,r.openOverrides.clear()),r.selected=e}function C(e,n={}){if(Nn(e),n.tab&&(r.tab=n.tab),n.reveal){for(let s of qe(e))r.expanded.add(s);r.scrollToSelected=!0}k()}function he(e){r.tab="pins",r.pinFocus=e,r.pinScroll=!0;let n=e.toLowerCase();r.pinFilter&&!n.includes(r.pinFilter.trim().toLowerCase())&&(r.pinFilter=""),r.pinOnlyConflicts&&!r.model?.pins.conflicts.includes(e)&&(r.pinOnlyConflicts=!1),k()}async function ie(e){try{await $n(e)}catch(n){ee("error",me(n))}}async function Z(e,n,s){return K(()=>kn({nodePath:e,overlay:r.overlay,property:n,value:s}),s===null?`Removed ${n}`:`Wrote ${n}`,`Edit of ${n}`)}async function K(e,n,s){if(!U())return!1;r.busy=!0,k();try{let o=await e();return o.applied?(ee("info",n),!0):(ee("error",`${s} not applied${o.error?`: ${o.error}`:""}`),!1)}catch(o){return ee("error",me(o)),!1}finally{r.busy=!1,k(),ge()}}function An(e){let n=r.catalogs.get(e);return n||(r.catalogs.set(e,"loading"),wn(e).then(s=>r.catalogs.set(e,s)).catch(s=>{r.catalogs.delete(e),ee("error",me(s))}).finally(k),"loading")}var xt="http://www.w3.org/2000/svg";function b(e,n={},...s){let o=document.createElementNS(xt,e);for(let[i,l]of Object.entries(n))l==null||l===!1||(i.startsWith("on")&&typeof l=="function"?o.addEventListener(i.slice(2),l):o.setAttribute(i,String(l)));for(let i of s)i!==null&&o.append(typeof i=="string"?document.createTextNode(i):i);return o}var R=(e,n)=>e.length>n?`${e.slice(0,n-1)}\\u2026`:e;function Ze(e){return e===void 0?"":e>=1e6?`${Number((e/1e6).toFixed(3))} MHz`:e>=1e3?`${Number((e/1e3).toFixed(3))} kHz`:`${e} Hz`}var Ye=e=>e.speed?e.speed.value===void 0?e.speed.text:e.speed.property==="current-speed"?`${e.speed.value} baud`:Ze(e.speed.value):"",Oe=(e,n)=>e?`${e.labels[0]?`${e.labels[0]}: `:""}${e.name}`:n;function Ut(e,n){return n.link!=="child"?[n.property??"",n.link==="chosen"?"chosen":"phandle"]:[n.reg===void 0?e.type==="spi"||e.type==="i2c"?"no reg":"":e.type==="spi"?`CS ${n.reg}`:e.type==="i2c"&&n.address!==void 0?`0x${n.address.toString(16)}`:n.reg,[n.cs,Ze(n.frequency)].filter(Boolean).join(" \\xB7 ")]}function Ke(e,n){let s=e.filter(o=>o.node===n);return s.some(o=>o.severity==="error")?"error":s.length?"warning":""}var ke=46,We=36,Hn=190,ne=220,be=370,Ve=300,In=12;function Mt(e,n){let s=Math.max(1,n.devices.length),o=e.nodes[n.path],i=Math.max(We+22,s*ke-10),l=Math.max(s*ke,i),a=l+2*In,c=(a-i)/2,u=In+(l-s*ke)/2,p=f=>u+f*ke+ke/2,d=f=>r.selected===f?" selected":"",m=b("svg",{class:"bus-svg",width:be+Ve+8,height:a,viewBox:`0 0 ${be+Ve+8} ${a}`,role:"img","aria-label":`${n.type} bus ${o?.name??n.path}`});return m.append(b("g",{class:`ctrl${n.disabled?" off":""}${Ke(n.issues,n.path)?` ${Ke(n.issues,n.path)}`:""}${d(n.path)}`,onclick:()=>C(n.path)},b("title",{},`${n.path}\nclick to select`),b("rect",{x:4,y:c,width:Hn,height:i,rx:6}),b("text",{x:16,y:c+20,class:"t1"},R(Oe(o,n.path),24)),b("text",{x:16,y:c+38,class:"t2"},R([n.type.toUpperCase(),Ye(n)].filter(Boolean).join(" \\xB7 "),28)))),n.devices.length?(m.append(b("line",{class:`wire${n.disabled?" off":""}`,x1:4+Hn,y1:a/2,x2:ne,y2:a/2}),b("line",{class:`wire${n.disabled?" off":""}`,x1:ne,y1:Math.min(p(0),a/2),x2:ne,y2:Math.max(p(s-1),a/2)})),n.devices.forEach((f,w)=>{let v=e.nodes[f.path],x=p(w),g=f.disabled||n.disabled,P=Ke(n.issues,f.path),[S,E]=Ut(n,f),$=f.link==="child"?v?.compatible[0]??"":`${f.property} = ${v?.props.find(L=>L.name===f.property)?.value??""}`;m.append(b("line",{class:`wire${g?" off":""}${f.link!=="child"?" ref":""}${P?` ${P}`:""}`,x1:ne,y1:x,x2:be,y2:x}),b("circle",{class:`joint${g?" off":""}`,cx:ne,cy:x,r:3}),...S?[b("text",{x:ne+12,y:x-6,class:`edge${P?` ${P}`:""}`},R(S,22))]:[],...E?[b("text",{x:ne+12,y:x+14,class:"edge sub"},R(E,24))]:[],b("g",{class:`dev${g?" off":""}${P?` ${P}`:""}${d(f.path)}`,onclick:()=>C(f.path)},b("title",{},`${f.path}${f.disabled?`\ndisabled`:n.disabled?`\nbus disabled`:""}\nclick to select`),b("rect",{x:be,y:x-We/2,width:Ve,height:We,rx:5}),b("text",{x:be+10,y:x-3,class:"t1"},R(Oe(v,f.path),40)),b("text",{x:be+10,y:x+12,class:"t2"},R($,44))))}),m):(m.append(b("text",{x:ne,y:a/2+4,class:"t2"},"no devices")),m)}function Pt(e,n){return n.issues.length?t("ul",{class:"bus-issues"},n.issues.map(s=>t("li",{class:s.severity==="error"?"error-text":"warn-text"},t("button",{class:"link",title:`Select ${s.node}`,onclick:()=>C(s.node)},s.severity==="error"?"\\u2716 ":"\\u26A0 ",s.message)))):null}var Et=e=>(e.split(",").pop()??e).replace(/[^A-Za-z0-9,._+-]/g,"-").toLowerCase();function Ct(e){let n=new Set(e.devices.filter(o=>o.link==="child"&&!o.disabled).map(o=>o.address)),s=0;for(;n.has(s);)s++;return s}function Rn(e){let n=e.trim();if(/^0x[0-9a-f]+$/i.test(n))return parseInt(n,16);if(/^\\d+$/.test(n))return Number(n)}var _e=(e,n)=>e==="spi"?String(n):`0x${n.toString(16)}`;function St(e,n){let s=n.trim();switch(e.type){case"string":return oe(s);case"string-array":return s.includes(\'"\')?s:oe(s);case"uint8-array":return s.startsWith("[")?s:`[${s}]`;case"int":case"array":case"phandle":case"phandles":case"phandle-array":return Te(s);default:return s}}function Lt(e,n){let s=r.device,o=An(n.type),i=n.type==="i2c"||n.type==="spi",l=()=>{r.device=null,k()};if(o==="loading")return t("div",{class:"add-device"},t("span",{class:"muted"},`Loading ${n.type} bindings from the language server\\u2026 (the first time takes a while)`),t("button",{onclick:l},"Cancel"));let a=s.query.trim().toLowerCase(),c=o.filter($=>!a||$.compatible.toLowerCase().includes(a)||($.description??"").toLowerCase().includes(a)),u=$=>{if(s.entry=$,s.values={},$){for(let L of $.required)L.default!==void 0&&(s.values[L.name]=Array.isArray(L.default)?L.default.join(" "):String(L.default));n.type==="spi"&&!s.address&&(s.address=String(Ct(n))),s.name=Et($.compatible)}k()},p=Rn(s.address),d=s.name.trim(),m=p!==void 0?`@${p.toString(16)}`:"",f=`${d}${m}`,w=(s.entry?.required??[]).filter($=>$.type!=="boolean"&&!(s.values[$.name]??"").trim()),v=/^[A-Za-z0-9,._+-]+$/.test(d),x=!!e.nodes[`${n.path}/${f}`],g=!!s.entry&&v&&!x&&(!i||p!==void 0)&&!w.length,P=s.entry?v?x?`${f} already exists`:i&&p===void 0?`Enter the ${n.type==="spi"?"chip select":"address"}`:w.length?`Fill in ${w.map($=>$.name).join(", ")}`:"":"Node name may contain letters, digits and , . _ + -":"Choose a binding",S=async()=>{if(!g||!s.entry)return;let $=[{name:"compatible",value:oe(s.entry.compatible)}];p!==void 0&&$.push({name:"reg",value:`<${_e(n.type,p)}>`});for(let O of s.entry.required){let _=s.values[O.name]??"";O.type==="boolean"?_==="true"&&$.push({name:O.name,value:!0}):$.push({name:O.name,value:St(O,_)})}let L=`${n.path}/${f}`;await K(()=>Le({parentPath:n.path,overlay:r.overlay,name:f,props:$}),`Added ${f}`,`Adding ${f}`)&&(r.device=null,r.selected=L)},E=$=>{let L=`dev:${$.name}`,F=_=>void(s.values[$.name]=_),O=$.enum?t("select",{"data-key":L,value:s.values[$.name]??"",onchange:_=>(F(_.target.value),k())},t("option",{value:""},"\\u2014"),$.enum.map(_=>t("option",{value:String(_)},String(_)))):$.type==="boolean"?t("input",{type:"checkbox","data-key":L,checked:s.values[$.name]==="true",onchange:_=>(F(String(_.target.checked)),k())}):t("input",{type:"text",class:"mono","data-key":L,spellcheck:"false",placeholder:$.type,value:s.values[$.name]??"",oninput:_=>(F(_.target.value),k())});return t("label",{class:"field",title:$.description},t("span",{class:"mono"},$.name,t("span",{class:"type required"},$.type)),O)};return t("div",{class:"add-device"},t("div",{class:"row"},t("input",{type:"search",placeholder:`Search ${o.length} ${n.type} bindings`,"data-key":"dev:query",value:s.query,oninput:$=>{s.query=$.target.value,k()}}),t("span",{class:"muted"},`${c.length} found`),t("span",{class:"spacer"}),t("button",{onclick:l},"Cancel")),t("select",{class:"catalog mono",size:7,"data-key":"dev:entry",value:s.entry?`${s.entry.compatible}\\0${s.entry.file}`:"",onchange:$=>{let L=$.target.value;u(o.find(F=>`${F.compatible}\\0${F.file}`===L)??null)}},c.slice(0,300).map($=>t("option",{value:`${$.compatible}\\0${$.file}`,title:`${$.file}\n${$.description??""}`},`${$.compatible}  \\u2014  ${($.description??"").split(`\n`)[0]}`))),s.entry?t("div",{class:"dev-fields"},t("div",{class:"muted desc"},I(s.entry.file),s.entry.description?` \\u2014 ${s.entry.description.split(`\n`)[0]}`:""),t("label",{class:"field"},t("span",null,"Node name"),t("input",{type:"text",class:"mono","data-key":"dev:name",value:s.name,oninput:$=>(s.name=$.target.value,k())})),i?t("label",{class:"field"},t("span",null,n.type==="spi"?"Chip select (reg)":"Address (reg)"),t("input",{type:"text",class:"mono","data-key":"dev:address",placeholder:n.type==="spi"?"0":"0x19",value:s.address,oninput:$=>(s.address=$.target.value,k())})):null,s.entry.required.map(E),t("div",{class:"row"},t("button",{class:"primary",disabled:!g||!U(),title:P||`Write ${f} to ${I(r.overlay)}`,onclick:()=>void S()},`Add ${f||"device"}`),P?t("span",{class:"warn-text"},P):t("span",{class:"muted"},`into ${I(r.overlay)}`))):null)}function Tt(e,n){let s=e.nodes[n.path],o=r.device?.bus===n.path,i=n.issues.filter(l=>l.severity==="error").length;return t("section",{class:`bus-card${n.disabled?" off":""}`,"data-bus":n.path},t("div",{class:"bus-head"},t("button",{class:"link bus-title",title:`Select ${n.path}`,onclick:()=>C(n.path)},Oe(s,n.path)),t("span",{class:"badge"},n.type),Ye(n)?t("span",{class:"mono muted"},Ye(n)):null,n.disabled?t("span",{class:"badge muted"},"disabled"):null,i?t("span",{class:"badge error"},`${i} error${i===1?"":"s"}`):null,t("span",{class:"pins-inline"},n.pins.map(l=>t("button",{class:"chip mono",title:`${l.function??""} \\u2014 show in Pins tab`,onclick:()=>he(l.pin)},l.pin))),t("span",{class:"spacer"}),t("button",{disabled:!U(),title:U()?`Write status to ${I(r.overlay)}`:"Editing is disabled",onclick:()=>void Z(n.path,"status",n.disabled?\'"okay"\':\'"disabled"\')},n.disabled?"Enable":"Disable"),t("button",{disabled:!U()||o,title:U()?"Add a device node to this bus":"Editing is disabled",onclick:()=>{r.device={bus:n.path,query:"",entry:null,name:"",address:"",values:{}},k()}},"+ Device")),o?Lt(e,n):null,t("div",{class:"bus-diagram"},Mt(e,n)),Pt(e,n))}function zn(e){let n=e.buses.filter(i=>r.busShowAll||!i.disabled||i.devices.length),s=e.buses.length-n.length,o=e.buses.reduce((i,l)=>i+l.issues.filter(a=>a.severity==="error").length,0);return t("div",{class:"buses","data-scroll":"buses"},t("div",{class:"pin-bar"},t("label",{class:"check"},t("input",{type:"checkbox","data-key":"bus-all",checked:r.busShowAll,onchange:i=>{r.busShowAll=i.target.checked,k()}}),"show disabled buses without devices"),t("span",{class:o?"summary error-text":"summary muted"},`${e.buses.length} buses, ${o} error${o===1?"":"s"}`,s?` (${s} hidden)`:"")),n.length?n.map(i=>Tt(e,i)):t("div",{class:"empty"},"No bus controllers in this context"))}function Bn(e,n){let s=e.buses.find(f=>f.path===n.path),o=e.buses.find(f=>f.devices.some(w=>w.path===n.path&&w.link==="child"));if(!s&&!o)return null;let i=f=>t("button",{class:"link",title:"Show in Buses tab",onclick:()=>C(f,{tab:"buses"})},"show bus");if(s)return t("dl",{class:"kv"},t("dt",null,"Bus"),t("dd",null,`${s.type}, ${s.devices.length} device${s.devices.length===1?"":"s"} `,i(s.path)));let l=o,a=l.devices.find(f=>f.path===n.path),c=e.nodes[l.path],u=r.address?.path===n.path,p=l.type==="spi"?"Chip select":"Address",d=u?Rn(r.address.text):void 0,m=async()=>{if(d===void 0)return;await K(()=>xn({nodePath:n.path,overlay:r.overlay,reg:`<${_e(l.type,d)}>`,unit:d.toString(16)}),`${p} set to ${_e(l.type,d)}`,`${p} change`)&&(r.address=null)};return t("dl",{class:"kv"},t("dt",null,"On bus"),t("dd",null,t("button",{class:"link",onclick:()=>C(l.path,{reveal:!0})},Oe(c,l.path)),` (${l.type}) `,i(l.path)),l.type==="i2c"||l.type==="spi"?[t("dt",null,p),t("dd",null,u?t("span",{class:"editor inline"},t("input",{type:"text",class:"mono","data-key":"bus-address",value:r.address.text,oninput:f=>(r.address.text=f.target.value,k()),onkeydown:f=>{f.key==="Enter"&&m(),f.key==="Escape"&&(r.address=null,k())}}),t("button",{class:"primary",disabled:d===void 0||!U(),title:"Writes reg; the node is renamed too when the overlay defines it",onclick:()=>void m()},"Apply"),t("button",{onclick:()=>(r.address=null,k())},"Cancel")):[t("span",{class:"mono"},a.reg??"not set"),a.cs?t("span",{class:"muted"},` \\u2192 ${a.cs}`):null,t("button",{class:"icon",title:`Change ${p.toLowerCase()}`,disabled:!U(),onclick:()=>{r.address={path:n.path,text:a.address!==void 0?_e(l.type,a.address):a.reg??""},k(),requestAnimationFrame(()=>document.querySelector(\'[data-key="bus-address"]\')?.focus())}},"\\u270E")])]:null,a.frequency!==void 0?[t("dt",null,"Max frequency"),t("dd",{class:"mono"},Ze(a.frequency))]:null)}function Ne(e,n){return n==="GPIO"?e.ports.flatMap(s=>s.pins):e.anyPin?e.ports.filter(s=>!s.external).flatMap(s=>s.pins):e.functions[n]??[]}function Xe(e){return Object.values(e.nodes).filter(n=>n.props.some(s=>s.name==="pinctrl-0")||n.binding&&e.bindings[n.binding]?.props.some(s=>s.name==="pinctrl-0")).map(n=>n.path).sort()}var _t=[[/^spim(\\d)/,"spi$1"],[/^tim(\\d+)/,"timers$1"],[/^usb_otg_(fs|hs)/,"usbotg_$1"],[/^sdio/,"sdmmc1"]];function Qe(e,n){let s=new Set(Xe(e)),o=n.toLowerCase();for(let[a,c]of _t)o=o.replace(a,c);let i,l=0;for(let a of Object.values(e.nodes))for(let c of a.labels)c.length>l&&(o===c||o.startsWith(`${c}_`))&&(i=a,l=c.length);if(i)return s.has(i.path)?i.path:i.children.find(a=>s.has(a))}var Dn=e=>(e.state??"default")==="default",X=e=>!e.disabled&&Dn(e),Je=null;function Fn(e,n){if(Je?.model!==e){let s=new Map;for(let[o,i]of Object.entries(e.pinCatalog.functions))for(let l of i)s.set(l,[...s.get(l)??[],o]);Je={model:e,map:s}}return Je.map.get(n)??[]}var en=null;function Gn(e,n){if(en?.model!==e){let s=new Map;for(let o of e.pinCatalog.ports)if(o.external)for(let i of o.pins)s.set(i,o);en={model:e,map:s}}return en.map.get(n)}function sn(e,n){let s=n.external,o=e.nodes[s.bus];return`${s.compatible?.split(",").pop()??"GPIO controller"} on ${o?.labels[0]??o?.name??s.bus}${s.address?` @0x${s.address}`:""}`}function nn(e){let n=(e??"").toLowerCase();return n==="gpio"?"c-gpio":/u(s)?art|serial|^u\\d|lpuart/.test(n)?"c-uart":/i2c|twi/.test(n)?"c-i2c":/spi|qspi|octospi/.test(n)?"c-spi":/can|twai/.test(n)?"c-can":/adc|dac|analog|comp|opamp/.test(n)?"c-analog":/tim|pwm|ledc|rmt|mcpwm|pcnt/.test(n)?"c-timer":/usb|eth|sdmmc|sdio|i2s|sai/.test(n)?"c-fast":"c-other"}var Ot=e=>e.length>9?`${e.slice(0,8)}\\u2026`:e,Nt=e=>/(\\d+)$/.exec(e)?.[1]??e;async function tn(e,n,s){if(!U()||!n.function)return;let o=[...new Set(e.pins.usages.filter(c=>c.pin===s&&c.owner!==n.owner&&X(c)).map(c=>e.nodes[c.owner]?.name??c.owner))],i=e.nodes[n.owner]?.name??n.owner,l=`Move ${n.function} of ${i} from ${n.pin} to ${s}?\nThe change is written to ${I(r.overlay)}.${o.length?`\n\n${s} is already used by ${o.join(", ")}: this creates a conflict.`:""}`;if(!confirm(l))return;await K(()=>Un({owner:n.owner,function:n.function,from:n.pin,to:s,overlay:r.overlay,force:o.length>0}),`${n.function} moved to ${s}`,`Moving ${n.function}`)&&(r.pinFocus=s)}async function At(e,n,s,o){if(!U())return;let i=[...new Set(e.pins.usages.filter(u=>u.pin===s&&u.owner!==o&&X(u)).map(u=>e.nodes[u.owner]?.name??u.owner))],l=e.nodes[o]?.name??o,a=`Route ${n} of ${l} to ${s}?\nThe change is written to ${I(r.overlay)}.${i.length?`\n\n${s} is already used by ${i.join(", ")}: this creates a conflict.`:""}`;if(!confirm(a))return;await K(()=>Mn({function:n,pin:s,owner:o,overlay:r.overlay,force:i.length>0}),`${n} routed to ${s}`,`Routing ${n}`)&&(r.assign=null)}function Ht(e,n,s){let o=r.assign,i=Qe(e,n),l=Xe(e),a=c=>{let u=e.nodes[c];return`${u?.labels[0]?`${u.labels[0]}: `:""}${u?.name??c}${u?.disabled?" (disabled)":""}`};return t("div",{class:"assign"},t("select",{"data-key":"assign-owner",value:o.owner,onchange:c=>(o.owner=c.target.value,k())},t("option",{value:""},"Peripheral\\u2026"),i?t("option",{value:i},`${a(i)} (suggested)`):null,l.filter(c=>c!==i).map(c=>t("option",{value:c},a(c)))),t("button",{class:"primary",disabled:!o.owner||!U(),onclick:()=>void At(e,n,s,o.owner)},"Assign"),t("button",{onclick:()=>(r.assign=null,k())},"Cancel"))}var Ae=e=>!!e.function&&(e.index!==void 0||!!e.ref||!!e.cell),re=null;function It(e,n,s,o){let i=o.get(n)??[],l=i.find(X)??i.find(Dn)??i[0],a=Gn(e,n),c=!!a||e.pinCatalog.anyPin||e.pinCatalog.vendor==="other"||i.length>0||Fn(e,n).length>0,u=i.find(m=>X(m)&&Ae(m))??i.find(Ae),p=["pcell",l?nn(l.function):"",l&&!i.some(X)?"idle":"",s.has(n)?"conflict":"",c?"":"na",a?"ext":"",r.pinFocus===n?"focus":""].filter(Boolean).join(" "),d=[n,...i.map(m=>`${m.function??"?"} \\u2014 ${e.nodes[m.owner]?.name??m.owner} (${ye(m)})${m.disabled?", disabled":""}`),c?"":"no function can use this pin",a?`GPIO only: ${sn(e,a)}`:""].filter(Boolean).join(`\n`);return t("button",{class:p,title:d,"data-pin":n,draggable:u&&U()?"true":void 0,onclick:()=>{r.pinFocus=n,r.fnFilter="",r.assign=null,k()},ondragstart:m=>{if(!u)return;re=u,m.dataTransfer?.setData("text/plain",n);let f=new Set(Ne(e.pinCatalog,u.function));for(let w of document.querySelectorAll(".pcell")){let v=w.dataset.pin;w.classList.add(v===n?"dragging":f.has(v)?o.get(v)?.some(X)?"drop-busy":"drop-ok":"drop-no")}},ondragend:()=>{re=null;for(let m of document.querySelectorAll(".pcell"))m.classList.remove("dragging","drop-ok","drop-busy","drop-no")},ondragover:m=>{re&&re.pin!==n&&Ne(e.pinCatalog,re.function).includes(n)&&m.preventDefault()},ondrop:m=>{m.preventDefault();let f=re;re=null,f&&tn(e,f,n)}},t("span",{class:"pnum"},Nt(n)),t("span",{class:"pfn"},l?.function?l.function.slice(0,9):""))}function Rt(e){let n=r.pinFocus;if(!n)return t("div",{class:"empty"},"Click a pin to see who uses it and which functions it can take. Drag a used pin onto another one to move its function.");let s=e.pins.usages.filter(p=>p.pin===n),o=Gn(e,n),i=o?[]:Fn(e,n),l=r.fnFilter.trim().toLowerCase(),a=p=>e.pins.usages.filter(d=>d.function===p&&X(d)&&Ae(d)),c=i.filter(p=>!l||p.toLowerCase().includes(l)).map(p=>[p,a(p).length>0]).sort((p,d)=>Number(d[1])-Number(p[1])||p[0].localeCompare(d[0])).map(([p])=>p),u=p=>{let d=p.function?Ne(e.pinCatalog,p.function).filter(m=>m!==p.pin):[];return t("li",{class:p.disabled?"muted":""},t("span",{class:`swatch ${nn(p.function)}`}),t("span",{class:"mono"},p.function??"?")," ",t("button",{class:"link",onclick:()=>C(p.owner)},e.nodes[p.owner]?.name??p.owner),t("span",{class:"muted"},` ${ye(p)}${p.disabled?", disabled":""} `),t("button",{class:"link mono",title:`Open ${pe(p.origin)}`,onclick:()=>void ie(p.origin)},ue(p.origin)),Ae(p)&&d.length?t("select",{class:"mono",disabled:!U(),title:U()?"Move this function to another pin":"Editing is disabled",onchange:m=>{let f=m.target.value;m.target.value="",f&&tn(e,p,f)}},t("option",{value:""},"Move to\\u2026"),d.map(m=>{let f=e.pins.usages.some(w=>w.pin===m&&w.owner!==p.owner&&X(w));return t("option",{value:m},`${m}${f?" (used)":""}`)})):null)};return t("div",{class:"pin-panel","data-scroll":"pin-panel"},t("h2",null,n,e.pins.conflicts.includes(n)?t("span",{class:"badge error"},"conflict"):null),t("h3",null,`Used by (${s.length})`),s.length?t("ul",{class:"usages"},s.map(u)):t("div",{class:"muted"},"Free"),t("h3",null,e.pinCatalog.anyPin||o?"Functions":`Functions this pin can take (${i.length})`),o?t("div",{class:"muted"},"GPIO only: this pin belongs to the external GPIO controller ",t("button",{class:"link mono",onclick:()=>C(o.external.path)},o.name),` (${sn(e,o)}). Peripheral functions cannot be routed here; drag a GPIO here to move it.`):e.pinCatalog.anyPin?t("div",{class:"muted"},"Any peripheral function can be routed to any pin on this SoC: drag a used pin here or use \\u201CMove to\\u201D."):i.length?[t("input",{type:"search",placeholder:"Filter functions","data-key":"fn-filter",value:r.fnFilter,oninput:p=>{r.fnFilter=p.target.value,k()}}),t("ul",{class:"fns"},c.slice(0,200).map(p=>{let d=a(p);return t("li",null,t("span",{class:`swatch ${nn(p)}`}),t("span",{class:"mono"},p),d.length?d.map(m=>t("span",{class:"fn-owner"},t("span",{class:"muted"},` on ${m.pin} (${e.nodes[m.owner]?.name??m.owner}) `),m.pin===n?null:t("button",{disabled:!U(),title:U()?`Move ${p} from ${m.pin} to ${n}`:"Editing is disabled",onclick:()=>void tn(e,m,n)},"Move here"))):[t("span",{class:"muted"}," unused "),r.assign?.fn===p?Ht(e,p,n):t("button",{class:"small",disabled:!U(),title:U()?`Route ${p} to ${n}`:"Editing is disabled",onclick:()=>{r.assign={fn:p,owner:Qe(e,p)??""},k()}},"Assign\\u2026")])}),c.length>200?t("li",{class:"muted"},`\\u2026 ${c.length-200} more, use the filter`):null)]:t("div",{class:"muted"},e.pinCatalog.vendor==="esp32"&&!e.pinCatalog.source?"The SoC pinctrl header was not found, functions are unknown.":"No pinctrl function can use this pin."),e.pinCatalog.source?t("div",{class:"muted source"},"Functions from ",t("button",{class:"link mono",onclick:()=>void ie({file:e.pinCatalog.source,line:0,character:0})},I(e.pinCatalog.source))):null)}function jn(e){let n=new Set(e.pins.conflicts),s=new Map;for(let c of e.pins.usages)s.set(c.pin,[...s.get(c.pin)??[],c]);let o=new Set(e.pinCatalog.ports.flatMap(c=>c.pins)),i=[...s.keys()].filter(c=>!o.has(c)),l=[],a=!1;for(let c of e.pinCatalog.ports){if(c.external){a||l.push(t("h3",{class:"ext-head"},"External GPIO controllers")),a=!0;let u=new Set(c.pins.filter(p=>s.get(p)?.some(X))).size;l.push(t("div",{class:"ext-port"},t("button",{class:"link mono",title:`Select ${c.external.path}`,onclick:()=>C(c.external.path)},c.name),t("span",{class:"muted"},` \\xB7 ${sn(e,c)} \\xB7 ${c.pins.length} lines, ${u} used`)))}for(let u=0;u<c.pins.length;u+=16){let p=c.pins.slice(u,u+16),d=c.external?u?"":c.name:e.pinCatalog.vendor==="stm32"?p[0].replace(/\\d+$/,""):`${p[0]}`;l.push(t("div",{class:"prow"},t("span",{class:"plabel mono",title:c.name},Ot(d)),p.map(m=>It(e,m,n,s))))}}return t("div",{class:"pin-grid-wrap"},t("div",{class:"pin-grid","data-scroll":"pin-grid"},l.length?l:t("div",{class:"empty"},"No GPIO controllers in this context"),i.length?t("div",{class:"muted outside"},`Used pins outside the GPIO controllers: ${i.join(", ")}`):null,t("div",{class:"legend"},[["c-gpio","GPIO"],["c-uart","UART"],["c-i2c","I2C"],["c-spi","SPI"],["c-can","CAN"],["c-analog","analog"],["c-timer","timer/PWM"],["c-fast","USB/SD/I2S"],["c-other","other"]].map(([c,u])=>t("span",null,t("span",{class:`swatch ${c}`}),u)),t("span",null,t("span",{class:"swatch conflict-sw"}),"conflict"),t("span",{class:"muted"},U()?"drag a used pin to move its function":"editing is disabled"))),Rt(e))}var ye=e=>e.state?`${e.property} \\xB7 ${e.state}`:e.property,zt=e=>!!e.state&&e.state!=="default";function Bt(e){let n=[];for(let s of e){let o=n[n.length-1];o&&o[0]===s.pin?o[1].push(s):n.push([s.pin,[s]])}return n}function qn(e,n){let s=e.nodes[n];return t("button",{class:"link owner",title:`Select ${n}`,onclick:()=>C(n,{reveal:!0,tab:"tree"})},s?.labels.map(o=>t("span",{class:"label"},`${o}: `)),s?.name??n)}function Kn(){let e=(n,s)=>t("button",{class:r.pinView===n?"primary":"","aria-pressed":String(r.pinView===n),onclick:()=>(r.pinView=n,k())},s);return t("span",{class:"vswitch"},e("grid","Grid"),e("table","Table"))}function Wn(e){if(r.pinView==="grid")return t("div",{class:"pins grid-mode"},t("div",{class:"pin-bar"},Kn(),t("span",{class:e.pins.conflicts.length?"summary error-text":"summary muted"},`${new Set(e.pins.usages.map(d=>d.pin)).size} pins used, ${e.pins.conflicts.length} conflict${e.pins.conflicts.length===1?"":"s"}`)),jn(e));let{usages:n,conflicts:s,unknown:o}=e.pins,i=new Set(s),l=r.pinFilter.trim().toLowerCase(),a=Bt(n),c=a.filter(([d,m])=>(!r.pinOnlyConflicts||i.has(d))&&(!l||d.toLowerCase().includes(l)||m.some(f=>{let w=e.nodes[f.owner];return(f.function??"").toLowerCase().includes(l)||f.owner.toLowerCase().includes(l)||!!w?.labels.some(v=>v.toLowerCase().includes(l))}))),u=[];for(let[d,m]of c){let f=`${i.has(d)?" conflict":""}${d===r.pinFocus?" focus":""}`;m.forEach((w,v)=>u.push(t("tr",{class:`${v===0?"first":"cont"}${f}${w.disabled?" disabled":""}${zt(w)?" nondefault":""}`,"data-pin":d},v===0?t("td",{class:"pin mono",rowspan:m.length},d,i.has(d)?t("span",{class:"badge error",title:"Used by more than one enabled owner"},"conflict"):null):null,t("td",{class:"mono"},w.function??""),t("td",null,qn(e,w.owner),w.disabled?t("span",{class:"badge muted"},"disabled"):null),t("td",{class:"mono usage"},ye(w)),t("td",null,t("button",{class:"link mono",title:`Open ${pe(w.origin)}`,onclick:()=>void ie(w.origin)},ue(w.origin))))))}let p=t("div",{class:"pins","data-scroll":"pins"},t("div",{class:"pin-bar"},Kn(),t("input",{type:"search",placeholder:"Filter pin, function, owner","data-key":"pin-filter",value:r.pinFilter,oninput:d=>{r.pinFilter=d.target.value,k()},onkeydown:d=>{d.key==="Escape"&&(r.pinFilter="",k())}}),t("label",{class:"check"},t("input",{type:"checkbox","data-key":"pin-only-conflicts",checked:r.pinOnlyConflicts,disabled:!s.length&&!r.pinOnlyConflicts,onchange:d=>{r.pinOnlyConflicts=d.target.checked,k()}}),"only conflicts"),t("span",{class:s.length?"summary error-text":"summary muted"},`${a.length} pins, ${s.length} conflict${s.length===1?"":"s"}`,c.length!==a.length?` (${c.length} shown)`:"")),n.length?t("table",{class:"pin-table"},t("thead",null,t("tr",null,t("th",null,"Pin"),t("th",null,"Function"),t("th",null,"Owner"),t("th",null,"Property"),t("th",null,"Source"))),t("tbody",null,u.length?u:t("tr",null,t("td",{colspan:5,class:"muted"},"No matching pins")))):t("div",{class:"empty"},"No pin assignments found in this context"),o.length?t("details",{class:"unknown",open:r.unknownOpen,ontoggle:d=>void(r.unknownOpen=d.target.open)},t("summary",null,`Not decoded (${o.length})`),t("table",null,t("thead",null,t("tr",null,t("th",null,"Owner"),t("th",null,"Property"),t("th",null,"Value"))),t("tbody",null,o.map(d=>t("tr",null,t("td",null,qn(e,d.owner)),t("td",{class:"mono"},d.property),t("td",null,t("code",null,d.value))))))):null);return r.pinScroll&&(r.pinScroll=!1,requestAnimationFrame(()=>p.querySelector(`tr[data-pin="${CSS.escape(r.pinFocus)}"]`)?.scrollIntoView({block:"center"}))),p}var He=(e,n=ue(e))=>t("button",{class:"link mono",title:`Open ${pe(e)}`,onclick:()=>void ie(e)},n),Vn=e=>(e??"").trim().split(/\\n/)[0]??"";function rn(e){if(!e)return;let n=[`${e.type}${e.required?", required":""}`];return e.enum&&n.push(`one of: ${e.enum.join(", ")}`),e.description&&n.push(e.description.trim()),n.join(`\n`)}function Yn(e){return e?t("span",{class:`type${e.required?" required":""}`,title:rn(e)},e.type.toLowerCase(),e.required?"*":""):null}function Dt(e){let n=e.disabled;return t("button",{class:n?"primary":"",disabled:!U(),title:U()?`Write status = ${n?\'"okay"\':\'"disabled"\'} to the target overlay`:"Editing is disabled",onclick:()=>void Z(e.path,"status",n?\'"okay"\':\'"disabled"\')},n?"Enable (okay)":"Disable")}function Ft(e,n){let s=r.editing,o=s.text.includes(`\n`),i=async()=>{await Z(e.path,n.name,s.text.trim()===""?!0:s.text.trim())&&(r.editing=null,k())},l=()=>{r.editing=null,k()},a={class:"mono","data-key":`edit:${n.name}`,value:s.text,spellcheck:"false",oninput:c=>void(s.text=c.target.value),onkeydown:c=>{c.key==="Escape"?l():c.key==="Enter"&&(!o||c.ctrlKey||c.metaKey)&&(c.preventDefault(),i())}};return t("div",{class:"editor"},o?t("textarea",{...a,rows:Math.min(8,s.text.split(`\n`).length)}):t("input",{...a,type:"text"}),t("button",{class:"primary",disabled:!U(),onclick:()=>void i()},"Apply"),t("button",{onclick:l},"Cancel"))}function Gt(e,n,s){let o=r.editing?.prop===n.name,i=n.overridden.length,l=i?t("details",{class:"overrides",open:r.openOverrides.has(n.name),ontoggle:a=>{a.target.open?r.openOverrides.add(n.name):r.openOverrides.delete(n.name)}},t("summary",null,`overrides ${i}`),t("ol",null,n.overridden.map(a=>t("li",null,He(a))))):null;return[t("tr",null,t("td",{class:"pname",title:rn(s)},t("span",{class:"mono"},n.name),Yn(s)),t("td",{class:"pvalue"},o?Ft(e,n):n.value===""?t("span",{class:"muted"},"(true)"):t("code",null,n.value)),t("td",{class:"porigin"},He(n.origin),l),t("td",{class:"pactions"},o||n.value===""?null:t("button",{class:"icon",title:"Edit value",disabled:!U(),onclick:()=>{r.editing={prop:n.name,text:n.value},k(),requestAnimationFrame(()=>document.querySelector(`[data-key="edit:${CSS.escape(n.name)}"]`)?.focus())}},"\\u270E"),t("button",{class:"icon danger",title:"Remove property",disabled:!U(),onclick:()=>{confirm(`Remove ${n.name} from ${e.path}?\nThe change is written to ${I(r.overlay)}.`)&&Z(e.path,n.name,null)}},"\\u2715")))]}function jt(e){return t("tr",{class:"missing"},t("td",{class:"pname",title:rn(e)},t("span",{class:"mono"},e.name),Yn(e)),t("td",{class:"pvalue"},t("span",{class:"warn-text"},"required, not set")),t("td",null),t("td",{class:"pactions"},t("button",{disabled:!U(),onclick:()=>{r.add={...fe(),name:e.name},k(),requestAnimationFrame(()=>document.querySelector(\'[data-key="add-value"]\')?.focus())}},"Set")))}function qt(e){let n=r.add,s=n.text.trim();return e?e.type==="EMPTY"?n.checked?!0:null:e.enum?s||void 0:e.type==="STRING"?oe(n.text):e.type==="U32"||e.type==="U64"?s?Te(s):void 0:s||void 0:s===""?!0:s}function Kt(e,n){let s=r.add,o=a=>{s.text=a.target.value,k()},i=a=>{a.key==="Enter"&&(a.preventDefault(),n())},l={"data-key":"add-value",value:s.text,oninput:o,onkeydown:i,spellcheck:"false"};return e?.type==="EMPTY"?t("label",{class:"check"},t("input",{type:"checkbox","data-key":"add-value",checked:s.checked,onchange:a=>{s.checked=a.target.checked,k()}}),s.checked?"set (name;)":"unset (remove)"):e?.enum?t("select",{"data-key":"add-value",value:s.text,onchange:o},t("option",{value:""},"\\u2014 value \\u2014"),e.enum.map(a=>{let c=Ln(e.type,a);return t("option",{value:c},c)})):e?.type==="STRING"?t("input",{...l,type:"text",class:"mono",placeholder:"text (quoted automatically)"}):e?.type==="U32"||e?.type==="U64"?t("input",{...l,type:"text",inputmode:"numeric",class:"mono",placeholder:"number, e.g. 42 or 0x2a"}):t("input",{...l,type:"text",class:"mono",placeholder:e?`raw DTS value (${e.type.toLowerCase()})`:"raw DTS value, empty = boolean"})}function Wt(e,n,s){let o=r.add,i=(n?.props??[]).filter(d=>!s.has(d.name)).sort((d,m)=>Number(m.required)-Number(d.required)||d.name.localeCompare(m.name)),l=o.name&&o.name!==$e?i.find(d=>d.name===o.name):void 0,a=o.name===$e?o.custom.trim():l?.name??"",c=o.name?qt(l):void 0,u=U()&&!!a&&c!==void 0,p=async()=>{u&&await Z(e.path,a,c)&&(r.add=fe(),k())};return t("div",{class:"add"},t("select",{"data-key":"add-name",value:o.name,disabled:!U(),onchange:d=>{r.add={...fe(),name:d.target.value,custom:o.custom},k()}},t("option",{value:""},"Add property\\u2026"),i.map(d=>t("option",{value:d.name,class:d.required?"required":"",title:Vn(d.description)},`${d.required?"* ":""}${d.name} (${d.type.toLowerCase()})`)),t("option",{value:$e},"Other (free-form name)\\u2026")),o.name===$e?t("input",{type:"text",class:"mono",placeholder:"property name","data-key":"add-custom",value:o.custom,spellcheck:"false",oninput:d=>{o.custom=d.target.value,k()}}):null,o.name?Kt(l,()=>void p()):null,o.name?t("button",{class:"primary",disabled:!u,onclick:()=>void p()},"Add"):null,o.name&&c!==void 0&&a?t("code",{class:"preview muted",title:"Written to the overlay"},c===!0?`${a};`:c===null?`/delete-property/ ${a};`:`${a} = ${c};`):null,l?.description?t("div",{class:"hint muted"},Vn(l.description)):null)}function on(e,...n){return t("section",null,t("h3",null,e),...n)}function Vt(e,n){let s=e.pins.usages.filter(i=>i.owner===n.path);if(!s.length)return null;let o=new Set(e.pins.conflicts);return on(`Pins (${s.length})`,t("ul",{class:"node-pins"},s.map(i=>t("li",{class:i.state&&i.state!=="default"?"nondefault":""},t("button",{class:`link mono${o.has(i.pin)?" error-text":""}`,title:"Show in Pins tab",onclick:()=>he(i.pin)},i.pin),i.function?t("span",{class:"mono"},` ${i.function}`):null,t("span",{class:"muted"},` ${ye(i)}`),o.has(i.pin)?t("span",{class:"badge error"},"conflict"):null))))}function we(e){let n=e.nodes[r.selected];if(!n)return t("div",{class:"empty"},"Select a node");let s=n.binding?e.bindings[n.binding]:void 0,o=new Map((s?.props??[]).map(c=>[c.name,c])),i=new Set(n.props.map(c=>c.name)),l=(s?.props??[]).filter(c=>c.required&&!i.has(c.name)),a=r.parents.get(n.path);return t("div",{class:"details","data-scroll":"details"},t("div",{class:"d-head"},t("h2",null,n.labels.map(c=>t("span",{class:"label"},`${c}: `)),n.name,n.disabled?t("span",{class:"badge muted"},"disabled"):t("span",{class:"badge ok"},"okay"),n.issues>0?t("span",{class:"badge warn"},`${n.issues} issue${n.issues===1?"":"s"}`):null),n.path===e.root?null:Dt(n)),t("div",{class:"d-path mono"},a?t("button",{class:"link",title:"Select parent",onclick:()=>C(a,{reveal:!0})},"\\u2191"):null,n.path),t("dl",{class:"kv"},n.labels.length?[t("dt",null,"Labels"),t("dd",{class:"mono"},n.labels.join(", "))]:null,n.compatible.length?[t("dt",null,"Compatible"),t("dd",{class:"mono"},n.compatible.join(", "))]:null,s?.file||s?.description?[t("dt",null,"Binding"),t("dd",null,s.file?He({file:s.file,line:0,character:0},I(s.file)):null,s.description?t("div",{class:"desc"},s.description.trim()):null)]:null),Bn(e,n),Vt(e,n),n.definitions.length?on(`Definitions (${n.definitions.length})`,t("ul",{class:"defs"},n.definitions.map(c=>t("li",null,He(c,c.file+`:${c.line+1}`))))):null,on(`Properties (${n.props.length})`,t("table",{class:"props"},t("thead",null,t("tr",null,t("th",null,"Name"),t("th",null,"Value"),t("th",null,"Origin"),t("th",null))),t("tbody",null,l.map(jt),n.props.map(c=>Gt(n,c,o.get(c.name))))),Wt(n,s,i)))}function an(e){let n=[];for(let s of e.matchAll(/<([^>]*)>/g)){let o=0,i="";for(let l of s[1])l==="("&&o++,l===")"&&o--,/\\s/.test(l)&&o===0?(i&&n.push(i),i=""):i+=l;i&&n.push(i)}return n}var Yt={I2C_BITRATE_STANDARD:1e5,I2C_BITRATE_FAST:4e5,I2C_BITRATE_FAST_PLUS:1e6,I2C_BITRATE_HIGH:34e5,I2C_BITRATE_ULTRA:5e6};function Zn(e){let n=e.trim().replace(/^\\((.*)\\)$/s,"$1").trim();if(/^0x[0-9a-f]+$/i.test(n))return parseInt(n,16);if(/^\\d+$/.test(n))return Number(n);let s=/^DT_FREQ_([MK])\\(\\s*(\\d+)\\s*\\)$/.exec(n);if(s)return Number(s[2])*(s[1]==="M"?1e6:1e3);let o=/^DT_SIZE_([MK])\\(\\s*(\\d+)\\s*\\)$/.exec(n);return o?Number(o[2])*(o[1]==="M"?1024*1024:1024):Yt[n]}var y=1e6;function Zt(e,n){let s=n.replace(/^st,stm32/,"");switch(e){case"f4":return/^f401/.test(s)?{sysclk:84*y,apb1:42*y,apb2:84*y,vin:[1*y,2*y],vco:[192*y,432*y],hse:[4*y,26*y]}:/^f41[0-3]/.test(s)?{sysclk:100*y,apb1:50*y,apb2:100*y,vin:[1*y,2*y],vco:[100*y,432*y],hse:[4*y,26*y]}:/^f4(2|3|46|69|79)/.test(s)?{sysclk:180*y,apb1:45*y,apb2:90*y,vin:[1*y,2*y],vco:[100*y,432*y],hse:[4*y,26*y]}:{sysclk:168*y,apb1:42*y,apb2:84*y,vin:[1*y,2*y],vco:[100*y,432*y],hse:[4*y,26*y]};case"l4":{let o=/^l4[pqrs]/.test(s),i=o?120*y:80*y;return{sysclk:i,apb1:i,apb2:i,vin:[o?2.66*y:4*y,16*y],vco:[64*y,344*y],hse:[4*y,48*y]}}case"f1":return{sysclk:72*y,apb1:36*y,apb2:72*y,pllOut:[16*y,72*y],hse:[4*y,/^f10[57]/.test(s)?25*y:16*y]};case"f0":return{sysclk:48*y,apb1:48*y,pllOut:[16*y,48*y],hse:[4*y,32*y]};default:return}}var Xn=[1e5,2e5,4e5,8e5,1e6,2e6,4e6,8e6,16e6,24e6,32e6,48e6],T=(e,n)=>{let s=e?.props.find(i=>i.name===n);if(!s)return;if(s.value==="")return 1;let o=an(s.value)[0];return o===void 0?void 0:Zn(o)},xe=(e,n="clocks")=>/&([A-Za-z_]\\w*)/.exec(e?.props.find(s=>s.name===n)?.value??"")?.[1];function Xt(e){return/STM32_CLOCK\\(\\s*(\\w+)\\s*,/.exec(e)?.[1]??/STM32_CLOCK_BUS_(\\w+)/.exec(e)?.[1]}function Qn(e){let n=Object.values(e);if(n.some(h=>h.compatible.includes("espressif,esp32-clock")))return Jt(n);if(n.some(h=>h.compatible.includes("wch,rcc")))return ts(n);let s=n.flatMap(h=>h.compatible).find(h=>/^st,stm32[a-z]\\d/.test(h)&&!/-/.test(h.slice(9))),o=n.find(h=>h.compatible.some(M=>/^st,stm32\\w*-rcc$/.test(M)));if(!s||!o)return;let l=/^st,stm32(f4|l4|f1|f0)/.exec(s)?.[1]??"stm32",a=Zt(l,s),c=new Map(n.flatMap(h=>h.labels.map(M=>[M,h]))),u={family:l,part:s,calculated:!!a,nodes:[],edges:[],issues:[]},p=(h,M)=>u.issues.push({severity:"error",message:h,node:M}),d=(h,M)=>u.issues.push({severity:"warning",message:h,node:M}),m=(h,M,z,A)=>{h===void 0||!M||(h<M[0]||h>M[1])&&p(`${z} ${N(h)} is outside ${N(M[0])}\\u2013${N(M[1])}`,A)},f=["clk_hse","clk_hsi","clk_msi","clk_lse","clk_lsi","clk_hsi48","clk_hsi14"].filter(h=>c.has(h)),w=new Map;for(let h of f){let M=c.get(h),z=h==="clk_msi"?Xn[T(M,"msi-range")??-1]:T(M,"clock-frequency");w.set(h,M.disabled?void 0:z);let A=[];h==="clk_msi"&&A.push({node:M.path,property:"msi-range",value:T(M,"msi-range"),kind:"int",options:Xn.map((Q,H)=>H)}),h==="clk_hse"&&A.push({node:M.path,property:"clock-frequency",value:T(M,"clock-frequency"),kind:"int",min:a?.hse[0],max:a?.hse[1]}),u.nodes.push({id:h,column:0,label:h.replace(/^clk_/,"").toUpperCase(),path:M.path,hz:z,disabled:M.disabled,params:A}),h==="clk_hse"&&!M.disabled&&m(z,a?.hse,"HSE",h)}let v=c.get("pll"),x;if(v){let h=xe(v),M=h?w.get(h):void 0,z=(H,B={})=>({node:v.path,property:H,value:T(v,H),kind:"int",...B}),A=[{node:v.path,property:"clocks",kind:"source",options:f.filter(H=>/hse|hsi$|msi/.test(H))}],Q={id:"pll",column:1,label:"PLL",path:v.path,disabled:v.disabled,params:A};if(u.nodes.push(Q),h&&u.edges.push({from:h,to:"pll"}),l==="f4"||l==="l4"){let H=T(v,"div-m"),B=T(v,"mul-n"),J=M&&H?M/H:void 0,D=J&&B?J*B:void 0;A.push(z("div-m",{min:l==="f4"?2:1,max:l==="f4"?63:8}),z("mul-n",{min:l==="f4"?50:8,max:l==="f4"?432:86}));let Se=l==="f4"?["div-p","div-q","div-r"]:["div-r","div-q","div-p"];for(let G of Se){let ce=T(v,G);A.push(z(G,{options:G==="div-p"&&l==="f4"?[2,4,6,8]:G==="div-p"?void 0:l==="l4"?[2,4,6,8]:void 0,min:2,max:G==="div-p"&&l==="l4"?31:15}));let $t=D&&ce?D/ce:void 0,gn=`pll_${G.slice(-1)}`;ce!==void 0&&(u.nodes.push({id:gn,column:2,label:`PLL${G.slice(-1).toUpperCase()}`,hz:$t,disabled:v.disabled}),u.edges.push({from:"pll",to:gn,label:`/${G.slice(-1).toUpperCase()} ${ce}`}))}Q.hz=D,Q.label="PLL VCO",h&&(u.edges[u.edges.findIndex(G=>G.to==="pll")].label=H&&B?`/M ${H} \\xD7N ${B}`:void 0),v.disabled||(m(J,a?.vin,"PLL input","pll"),m(D,a?.vco,"VCO","pll")),x=D&&T(v,l==="f4"?"div-p":"div-r")?D/T(v,l==="f4"?"div-p":"div-r"):void 0;let Be=n.some(G=>!G.disabled&&G.compatible.some(ce=>/stm32-otgfs|stm32-usb/.test(ce))),De=T(v,"div-q");Be&&D&&De&&Math.abs(D/De-48*y)>.0025*48*y&&!c.get("clk_hsi48")&&p(`USB needs 48 MHz on PLLQ, got ${N(D/De)}`,"pll_q")}else if(l==="f1"||l==="f0"){let H=T(v,"mul"),B=T(v,"prediv"),J=T(v,"xtpre");A.push(z("mul",{min:2,max:16})),(l==="f0"||B!==void 0)&&A.push(z("prediv",{min:1,max:16})),l==="f1"&&A.push({node:v.path,property:"xtpre",value:J??0,kind:"bool"});let D=/^st,stm32f0(4|7|9)|^st,stm32f030xc/.test(s),Se=h==="clk_hsi"?l==="f0"&&D?B??1:2:l==="f1"?(J?2:1)*(B??1):B??1;x=M&&H?M/Se*H:void 0,Q.hz=x,h&&(u.edges[u.edges.findIndex(Be=>Be.to==="pll")].label=`/${Se} \\xD7${H??"?"}`),v.disabled||m(x,a?.pllOut,"PLL output","pll")}}let g=xe(o),P=g==="pll"?l==="f4"?"pll_p":l==="l4"?"pll_r":"pll":g,S=g==="pll"?x:g?w.get(g):void 0,E=T(o,"ahb-prescaler"),$=T(o,"apb1-prescaler"),L=T(o,"apb2-prescaler"),F=(h,M)=>({node:o.path,property:h,value:T(o,h),kind:"int",options:M});u.nodes.push({id:"sysclk",column:3,label:"SYSCLK",path:o.path,hz:S,params:[{node:o.path,property:"clocks",kind:"source",options:["pll",...f.filter(h=>/hse|hsi$|msi/.test(h))]}]}),P&&u.edges.push({from:P,to:"sysclk"});let O=S&&E?S/E:void 0,_=O&&$?O/$:void 0,se=O&&L?O/L:void 0;u.nodes.push({id:"ahb",column:4,label:"HCLK",path:o.path,hz:O,params:[F("ahb-prescaler",[1,2,4,8,16,64,128,256,512])]}),u.edges.push({from:"sysclk",to:"ahb",label:`/${E??"?"}`}),u.nodes.push({id:"ahb_bus",column:5,label:"AHB",path:o.path,hz:O}),u.edges.push({from:"ahb",to:"ahb_bus"}),u.nodes.push({id:"apb1",column:5,label:"APB1",path:o.path,hz:_,params:[F("apb1-prescaler",[1,2,4,8,16])]}),u.edges.push({from:"ahb",to:"apb1",label:`/${$??"?"}`}),L!==void 0&&(u.nodes.push({id:"apb2",column:5,label:"APB2",path:o.path,hz:se,params:[F("apb2-prescaler",[1,2,4,8,16])]}),u.edges.push({from:"ahb",to:"apb2",label:`/${L}`})),a&&(S!==void 0&&S>a.sysclk&&p(`SYSCLK ${N(S)} is above the ${N(a.sysclk)} maximum`,"sysclk"),_!==void 0&&_>a.apb1&&p(`APB1 ${N(_)} is above the ${N(a.apb1)} maximum`,"apb1"),se!==void 0&&a.apb2&&se>a.apb2&&p(`APB2 ${N(se)} is above the ${N(a.apb2)} maximum`,"apb2")),g&&c.get(g)?.disabled&&p(`SYSCLK source ${g} is disabled`,"sysclk"),g==="pll"&&v?.disabled&&p("SYSCLK comes from the PLL, but the PLL is disabled","sysclk"),u.hclk=O,u.declared=T(o,"clock-frequency"),u.declaredNode=o.path,a&&O!==void 0&&u.declared!==void 0&&Math.round(O)!==u.declared&&p(`rcc clock-frequency ${N(u.declared)} does not match the computed HCLK ${N(O)}`,"ahb");for(let h of n){if(h.disabled)continue;let M=h.props.find(D=>D.name==="clocks")?.value;if(!M||xe(h)!==o.labels[0])continue;let z=Xt(M);if(!z)continue;let A=/^APB1/.test(z)?"apb1":/^APB2/.test(z)?"apb2":/^AHB/.test(z)?"ahb_bus":void 0;if(!A)continue;let Q=h.compatible.some(D=>/timers|stm32-timer/.test(D)),H=A==="apb1"?_:A==="apb2"?se:O,B=A==="apb1"?$:A==="apb2"?L:1,J=H!==void 0&&Q&&B!==void 0&&B>1?H*2:H;u.nodes.push({id:h.path,column:6,label:`${h.labels[0]??h.name}${Q&&B&&B>1?" \\xD72":""}`,sub:z,path:h.path,hz:J}),u.edges.push({from:A,to:h.path})}let bt=["ahb_bus","apb1","apb2"],yt=new Map(u.edges.map(h=>[h.to,h.from])),mn=h=>h.column===6?bt.indexOf(yt.get(h.id)??""):-1;u.nodes.sort((h,M)=>h.column-M.column||mn(h)-mn(M)||(h.column===6?h.label.localeCompare(M.label):0));let vt=new Set(u.issues.map(h=>h.node));for(let h of u.nodes)vt.has(h.id)&&(h.error=u.issues.find(M=>M.node===h.id).message);return a||d(`no clock model for ${s}: frequencies are shown where they follow directly from the devicetree`),u}var N=e=>e>=y?`${Number((e/y).toFixed(3))} MHz`:e>=1e3?`${Number((e/1e3).toFixed(3))} kHz`:`${e} Hz`,Qt=/^espressif,esp32(s2|s3|c3)?$/;function Jt(e){let n={family:"esp32",part:e.flatMap(u=>u.compatible).find(u=>/^espressif,esp32\\w*$/.test(u)),calculated:!1,nodes:[],edges:[],issues:[]},s=e.filter(u=>/^\\/cpus\\/cpu@/.test(u.path)),o=T(s[0],"xtal-freq"),i=s[0]?.props.find(u=>u.name==="clock-source")?.value.replace(/[<>]/g,"").replace(/^ESP32_CPU_CLK_SRC_/,"");n.nodes.push({id:"xtal",column:0,label:"XTAL",hz:o});let l=e.find(u=>u.compatible.includes("espressif,esp32-clock"));for(let[u,p]of[["fast-clk-src","RTC fast"],["slow-clk-src","RTC slow"]]){let d=l?.props.find(m=>m.name===u)?.value.replace(/[<>]/g,"").replace(/^ESP32_RTC_(FAST|SLOW)_CLK_SRC_/,"");d&&n.nodes.push({id:u,column:0,label:`${p}: ${d}`,path:l.path})}n.nodes.push({id:"cpu_src",column:1,label:`CPU source: ${i??"?"}`}),n.edges.push({from:"xtal",to:"cpu_src"});let a;for(let u of s)a??(a=T(u,"clock-frequency")),n.nodes.push({id:u.path,column:3,label:u.name,path:u.path,hz:T(u,"clock-frequency")}),n.edges.push({from:"cpu_src",to:u.path});let c=n.part&&Qt.test(n.part)&&a?Math.min(a,80*y):void 0;n.nodes.push({id:"apb",column:4,label:"APB",hz:c}),s[0]&&n.edges.push({from:s[0].path,to:"apb"});for(let u of e){if(u.disabled)continue;let p=/&clock\\s+ESP32_(\\w+)_MODULE/.exec(u.props.find(d=>d.name==="clocks")?.value??"")?.[1];p&&(n.nodes.push({id:u.path,column:6,label:u.labels[0]??u.name,sub:p,path:u.path}),n.edges.push({from:"apb",to:u.path}))}return n}function es(e){if(/^wch,ch32v00/.test(e))return 48*y;if(/^wch,ch32v10/.test(e))return 80*y;if(/^wch,ch32v[23]0/.test(e))return 144*y}function ns(e){return/_(DMA\\d*|SRAM|FLITF|CRC|FSMC|RNG|SDIO|USBHS|OTG\\w*|DVP|ETH\\w*|BLE\\w*|USBFS)$/.test(e)?"ahb_bus":/_(AFIO|IOP[A-Z]|ADC\\d*|TIM(1|8|9|10)|SPI1|USART1)$/.test(e)?"apb2":"apb1"}function ts(e){let n=e.flatMap(g=>g.compatible).find(g=>/^wch,ch32[a-z]\\d+\\w*$/.test(g))??"wch",s=es(n),o={family:"wch",part:n,calculated:s!==void 0,nodes:[],edges:[],issues:[]},i=new Map(e.flatMap(g=>g.labels.map(P=>[P,g]))),l=e.find(g=>g.compatible.includes("wch,rcc")),a=new Map,c=["clk_hse","clk_hsi","clk_lse","clk_lsi"].filter(g=>i.has(g));for(let g of c){let P=i.get(g),S=T(P,"clock-frequency");a.set(g,P.disabled?void 0:S);let E=g==="clk_hse"?[{node:P.path,property:"clock-frequency",value:S,kind:"int"}]:[];o.nodes.push({id:g,column:0,label:g.replace(/^clk_/,"").toUpperCase(),path:P.path,hz:S,disabled:P.disabled,params:E})}let u=i.get("pll"),p;if(u){let g=xe(u),P=u.compatible.some($=>/ch32v00x-pll/.test($)),S=P?2:T(u,"mul");p=g&&a.get(g)&&S?a.get(g)*S:void 0;let E=[{node:u.path,property:"clocks",kind:"source",options:c.filter($=>/hse|hsi/.test($))}];P||E.push({node:u.path,property:"mul",value:S,kind:"int",options:[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,18]}),o.nodes.push({id:"pll",column:1,label:"PLL",path:u.path,hz:p,disabled:u.disabled,params:E}),g&&o.edges.push({from:g,to:"pll",label:`\\xD7${S??"?"}`}),g==="clk_hsi"&&!P&&!u.disabled&&o.issues.push({severity:"warning",message:"PLL from HSI: the chip may halve HSI first (EXTEN_CTR.HSIPRE), which the devicetree does not show",node:"pll"})}let d=xe(l),m=d==="pll"?p:d?a.get(d):void 0;o.nodes.push({id:"sysclk",column:3,label:"SYSCLK",path:l.path,hz:m,params:[{node:l.path,property:"clocks",kind:"source",options:["pll",...c.filter(g=>/hse|hsi/.test(g))]}]}),d&&o.edges.push({from:d,to:"sysclk"}),o.nodes.push({id:"ahb",column:4,label:"HCLK",path:l.path,hz:m}),o.edges.push({from:"sysclk",to:"ahb",label:"/1"});for(let[g,P]of[["ahb_bus","AHB"],["apb1","APB1"],["apb2","APB2"]])o.nodes.push({id:g,column:5,label:P,hz:m}),o.edges.push({from:"ahb",to:g});let f=e.find(g=>/^\\/cpus\\/cpu@/.test(g.path));o.hclk=m,o.declared=T(f,"clock-frequency"),o.declaredNode=f?.path,s&&m!==void 0&&m>s&&o.issues.push({severity:"error",message:`SYSCLK ${N(m)} is above the ${N(s)} maximum`,node:"sysclk"}),d&&i.get(d)?.disabled&&o.issues.push({severity:"error",message:`SYSCLK source ${d} is disabled`,node:"sysclk"}),m!==void 0&&o.declared!==void 0&&Math.round(m)!==o.declared&&o.issues.push({severity:"error",message:`cpu clock-frequency ${N(o.declared)} does not match the computed SYSCLK ${N(m)}`,node:"sysclk"});for(let g of e){if(g.disabled||g===l)continue;let P=g.props.find($=>$.name==="clocks")?.value??"",S=/&rcc\\s+(CH32\\w+_CLOCK_\\w+)/.exec(P)?.[1];if(!S)continue;let E=ns(S);o.nodes.push({id:g.path,column:6,label:g.labels[0]??g.name,sub:S.replace(/^CH32\\w+_CLOCK_/,""),path:g.path,hz:m}),o.edges.push({from:E,to:g.path})}let w=["ahb_bus","apb1","apb2"],v=new Map(o.edges.map(g=>[g.to,g.from])),x=g=>g.column===6?w.indexOf(v.get(g.id)??""):-1;o.nodes.sort((g,P)=>g.column-P.column||x(g)-x(P)||(g.column===6?g.label.localeCompare(P.label):0));for(let g of o.nodes)g.error=o.issues.find(P=>P.node===g.id&&P.severity==="error")?.message;return o}var Ue=140,Ie=[0,1,2,3,4,5,6].map(e=>8+e*(Ue+76)),ae=38,ln=8,ss=14,Jn=(e,n)=>`${e}\\0${n}`;function os(e){if(!r.clockDraft.size)return e.nodes;let n={...e.nodes};for(let[s,o]of r.clockDraft){let[i,l]=s.split("\\0"),a=n[i];if(!a)continue;let c=a.props.filter(u=>u.name!==l);o!==null&&c.push({name:l,value:o,origin:a.definitions[0]??{file:"",line:0,character:0},overridden:[]}),n[i]={...a,props:c}}return n}function is(e){return[e.hz===void 0?"":N(e.hz),e.sub??""].filter(Boolean).join(" \\xB7 ")}function rs(e){let n=Ie.map(()=>[]);for(let c of e.nodes)n[c.column].push(c);let s=n.map(c=>c.length*(ae+ln)-ln),o=Math.max(...s,ae)+2*ss,i=new Map;n.forEach((c,u)=>{let p=(o-s[u])/2;for(let d of c)i.set(d.id,{x:Ie[u],y:p}),p+=ae+ln});let l=[];for(let c of e.edges){let u=i.get(c.from),p=i.get(c.to);if(!u||!p)continue;let d=u.x+Ue,m=u.y+ae/2,f=p.x,w=p.y+ae/2,v=(d+f)/2,x=e.nodes.find(g=>g.id===c.to)?.error;l.push(b("path",{class:`edge${x?" error":""}`,d:`M${d},${m} C${v},${m} ${v},${w} ${f},${w}`})),c.label&&l.push(b("text",{class:"elabel",x:f-4,y:w-4,"text-anchor":"end"},R(c.label,14)))}for(let c of e.nodes){let u=i.get(c.id),p=`cbox${c.disabled?" off":""}${c.error?" error":""}${r.clockFocus===c.id?" selected":""}`;l.push(b("g",{class:p,onclick:()=>{r.clockFocus=c.id,k()},ondblclick:()=>c.path&&C(c.path,{reveal:!0,tab:"tree"})},b("title",{},`${c.path??c.label}${c.error?`\n${c.error}`:""}${c.disabled?`\ndisabled`:""}\nclick: details, double click: open in Tree`),b("rect",{x:u.x,y:u.y,width:Ue,height:ae,rx:5}),b("svg",{x:u.x+8,y:u.y,width:Ue-14,height:ae,overflow:"hidden"},b("text",{x:0,y:15,class:"t1"},R(c.label,26)),b("text",{x:0,y:30,class:"t2"},is(c)))))}let a=Ie[Ie.length-1]+Ue+8;return b("svg",{class:"clk-svg",width:a,height:o,viewBox:`0 0 ${a} ${o}`,role:"img","aria-label":"Clock tree"},...l)}function as(e,n){if(e.kind==="bool")return n==="true"?"":null;if(e.kind==="source")return`<&${n}>`;let s=Number(n);return e.property==="clock-frequency"&&s%1e6===0?`<DT_FREQ_M(${s/1e6})>`:`<${n}>`}function ls(e,n){let s=r.clockDraft.get(Jn(e.node,e.property)),o=s!==void 0?s:n.nodes[e.node]?.props.find(i=>i.name===e.property)?.value??null;return e.kind==="bool"?o===null?"false":"true":e.kind==="source"?/&(\\w+)/.exec(o??"")?.[1]??"":String(e.value??"")}function cs(e,n,s){let o=Jn(n.node,n.property),i=d=>{r.clockDraft.set(o,as(n,d)),k()},l=s.nodes.flatMap(d=>d.params??[]).find(d=>d.node===n.node&&d.property===n.property)??n,a=ls(l,e),c=r.clockDraft.has(o),u=n.kind==="bool"?t("input",{type:"checkbox","data-key":`clk:${o}`,checked:a==="true",disabled:!U(),onchange:d=>i(String(d.target.checked))}):n.options?t("select",{class:"mono","data-key":`clk:${o}`,value:a,disabled:!U(),onchange:d=>i(d.target.value)},a===""?t("option",{value:""},"\\u2014"):null,n.options.map(d=>t("option",{value:String(d)},String(d)))):t("input",{type:"number",class:"mono","data-key":`clk:${o}`,value:a,min:n.min,max:n.max,disabled:!U(),onchange:d=>i(d.target.value)}),p=n.min!==void 0&&n.max!==void 0?`${n.min}\\u2013${n.max}`:"";return t("tr",{class:c?"changed":""},t("td",{class:"mono"},n.property),t("td",null,u),t("td",{class:"muted"},p))}async function ds(e,n){let s=[...r.clockDraft].map(([a,c])=>{let[u,p]=a.split("\\0");return{nodePath:u,property:p,value:c===""?!0:c}}),o=n.declaredNode;if(n.calculated&&o&&n.hclk!==void 0&&Math.round(n.hclk)!==n.declared){let a=Math.round(n.hclk);s.push({nodePath:o,property:"clock-frequency",value:a%1e6===0?`<DT_FREQ_M(${a/1e6})>`:`<${a}>`})}let i=n.issues.filter(a=>a.severity==="error");if(i.length&&!confirm(`The new clock tree has ${i.length} error(s):\n${i.map(a=>`\\u2022 ${a.message}`).join(`\n`)}\n\nWrite it anyway?`))return;await K(()=>Pn(r.overlay,s),`Wrote ${s.length} clock setting${s.length===1?"":"s"}`,"Clock change")&&r.clockDraft.clear()}function us(e,n){let s=n.nodes.find(l=>l.id===r.clockFocus),o=s?.params??[],i=r.clockDraft.size;return t("div",{class:"clk-panel","data-scroll":"clk-panel"},t("h2",null,n.part??"Clocks",t("span",{class:"badge"},n.family==="esp32"?"view only":n.calculated?n.family?.toUpperCase():"no model")),n.hclk!==void 0?t("div",{class:n.declared!==void 0&&Math.round(n.hclk)!==n.declared?"error-text":"muted"},`HCLK ${N(n.hclk)}${n.declared!==void 0?`, ${n.family==="wch"?"cpu":"rcc"} clock-frequency ${N(n.declared)}`:""}`):null,n.issues.length?t("ul",{class:"clk-issues"},n.issues.map(l=>t("li",{class:l.severity==="error"?"error-text":"warn-text"},l.severity==="error"?"\\u2716 ":"\\u26A0 ",l.message))):t("div",{class:"ok-text"},"\\u2713 within the limits of the part"),s?[t("h3",null,s.label,s.hz!==void 0?t("span",{class:"muted"},` ${N(s.hz)}`):null),s.path?t("button",{class:"link mono",onclick:()=>C(s.path,{reveal:!0,tab:"tree"})},s.path):null,o.length?t("table",{class:"clk-params"},t("tbody",null,o.map(l=>cs(e,l,n)))):t("div",{class:"muted"},n.family==="esp32"?"ESP32 clocks are shown for reference only.":"Nothing to set here.")]:t("div",{class:"muted"},"Click a box to see and change its settings."),i?t("div",{class:"clk-actions"},t("span",null,`${i} pending change${i===1?"":"s"}`),t("button",{class:"primary",disabled:!U(),title:`Write to ${I(r.overlay)}`,onclick:()=>void ds(e,n)},"Apply"),t("button",{onclick:()=>(r.clockDraft.clear(),k())},"Discard")):null)}function et(e){let n=(r.clockDraft.size?Qn(os(e)):e.clocks)??e.clocks;return n?t("div",{class:"clk-wrap"},t("div",{class:"clk-graph","data-scroll":"clk-graph"},rs(n)),us(e,n)):t("div",{class:"empty"},"No clock tree for this SoC")}function tt(e){if(e.size>0)return[e.start,e.start+e.size];let n=1/0,s=-1/0;for(let o of e.children){let i=tt(o);i&&(n=Math.min(n,i[0]),s=Math.max(s,i[1]))}return n<s?[n,s]:null}var st=e=>e.size>0?`${W(e.start)} \\u2013 ${W(e.start+e.size-1)}`:"",ot=e=>C(e.path,{reveal:!0,tab:"tree"});function ps(e){let n=tt(e),s=e.children.filter(i=>i.size>0);if(!n||!s.length)return null;let o=n[1]-n[0];return t("div",{class:"bar",title:`${W(n[0])} \\u2013 ${W(n[1]-1)}`},s.map((i,l)=>t("div",{class:`seg c${l%6}${i.disabled?" disabled":""}${i.path===r.selected?" selected":""}`,style:`left:${(i.start-n[0])/o*100}%;width:${i.size/o*100}%`,title:`${i.name}\n${st(i)}\n${j(i.size)}`,onclick:()=>ot(i)})))}function it(e,n,s){s.push(t("tr",{class:`${n===0?"root":""}${e.disabled?" disabled":""}${e.path===r.selected?" selected":""}`,title:e.path,onclick:()=>ot(e)},t("td",{style:`padding-left:${n*16+6}px`},e.name),t("td",{class:"mono"},st(e)),t("td",{class:"num"},e.size>0?j(e.size):""),t("td",{class:"mono"},e.labels.join(", ")),t("td",null,e.disabled?t("span",{class:"badge muted"},"disabled"):null)));let o=e.children.length>1||n===0?ps(e):null;o&&s.push(t("tr",{class:"bar-row"},t("td",{colspan:5,style:`padding-left:${n*16+6}px`},o)));for(let i of e.children)it(i,n+1,s)}var fs=460,nt=26,te=92,le=190,Re=e=>e.segments.length?fs:90;function ms(e){let n=Re(e),s=[...e.segments.filter(c=>c.lane===0),...e.gaps].sort((c,u)=>c.offset-u.offset),o=s.reduce((c,u)=>c+u.size,0)||1,i=Math.max(0,n-s.length*nt),l=[[s[0]?.offset??0,0]],a=0;for(let c of s)a+=nt+i*c.size/o,l.push([c.offset+c.size,a]);return c=>{for(let u=1;u<l.length;u++){let[p,d]=l[u-1],[m,f]=l[u];if(c<=m)return m===p?f:d+(c-p)/(m-p)*(f-d)}return l[l.length-1][1]}}var Me=(e,n)=>e.base!==void 0?W(e.base+n):`+0x${n.toString(16)}`;async function gs(e,n){if(!e.partitions||!U())return;let s=prompt(`New partition in ${e.name} at 0x${n.offset.toString(16)}, ${j(n.size)} free.\nLabel:`,"storage_partition");if(!s)return;if(!/^[A-Za-z_]\\w*$/.test(s))return void alert("A label is letters, digits and _ and does not start with a digit.");let o=`partition@${n.offset.toString(16)}`;await K(()=>Le({parentPath:e.partitions,overlay:r.overlay,name:o,label:s,props:[{name:"label",value:`"${s.replace(/_partition$/,"")}"`},{name:"reg",value:`<0x${n.offset.toString(16)} 0x${n.size.toString(16)}>`}]}),`Added ${s}`,`Adding ${s}`)}function hs(e){let n=Math.max(1,...e.segments.map(d=>d.lane+1)),s=ms(e),o=d=>Re(e)-s(d),i=te+n*le+8,l=[],a=8,c=[...new Set([0,e.size,...e.segments.flatMap(d=>[d.offset,d.offset+d.size]),...e.gaps.flatMap(d=>[d.offset,d.offset+d.size])])].filter(d=>d<=Math.max(e.size,0)||e.size===0).sort((d,m)=>d-m),u=-100;c.reverse();for(let d of c){let m=a+o(d);l.push(b("line",{class:"tick",x1:te-6,y1:m,x2:te,y2:m})),m-u>=12&&(l.push(b("text",{class:"addr",x:te-9,y:m+4,"text-anchor":"end"},Me(e,d))),u=m)}e.gaps.forEach(d=>{let m=a+o(d.offset+d.size),f=o(d.offset)-o(d.offset+d.size),w=!!e.partitions&&U(),v=e.kind==="flash"?"free":e.segments.length?"rest of region":e.name;l.push(b("g",{class:`gap${w?" can-add":""}${e.kind==="ram"?" ram":""}`,onclick:()=>e.kind==="flash"?void gs(e,d):C(e.path)},b("title",{},`${v}: ${Me(e,d.offset)} \\u2013 ${Me(e,d.offset+d.size-1)}, ${j(d.size)}${w?`\nclick: add a partition here`:""}`),b("rect",{x:te,y:m,width:n*le,height:f}),f>=14?b("text",{class:"t2",x:te+10,y:m+Math.min(f/2+4,17)},`${v} ${j(d.size)}${w?"  \\uFF0B":""}`):null))}),e.segments.forEach((d,m)=>{let f=a+o(d.offset+d.size),w=Math.max(4,o(d.offset)-o(d.offset+d.size)),v=`mseg c${m%6}${d.disabled?" off":""}${d.overlap?" overlap":""}${r.selected===d.path?" selected":""}`,x=[j(d.size),d.readOnly?"read-only":"",...d.chosen].filter(Boolean).join(" \\xB7 ");l.push(b("g",{class:v,onclick:()=>C(d.path),ondblclick:()=>C(d.path,{reveal:!0,tab:"tree"})},b("title",{},`${d.path}\n${Me(e,d.offset)} \\u2013 ${Me(e,d.offset+d.size-1)}\n${j(d.size)}${d.overlap?`\noverlaps another partition`:""}\nclick: select, double click: open in Tree`),b("rect",{x:te+d.lane*le,y:f,width:le-2,height:w}),b("svg",{x:te+d.lane*le+8,y:f,width:le-14,height:w,overflow:"hidden"},b("text",{class:"t1",x:0,y:Math.min(15,w/2+4)},R(d.name,w>=32?28:20)),w>=32?b("text",{class:"t2",x:0,y:29},R(x,32)):b("text",{class:"t2",x:le-16,y:Math.min(15,w/2+4),"text-anchor":"end"},j(d.size)))))});let p=b("svg",{class:"mem-svg",width:i,height:Re(e)+2*a,viewBox:`0 0 ${i} ${Re(e)+2*a}`,role:"img","aria-label":`Memory map of ${e.name}`},...l);return t("section",{class:`mem-col${e.disabled?" off":""}`},t("div",{class:"mem-head"},t("button",{class:"link mem-name",onclick:()=>C(e.path)},e.name),t("span",{class:"badge"},e.kind),t("span",{class:"mono muted"},j(e.size)),e.chosen.map(d=>t("span",{class:"badge ok"},d))),e.base!==void 0?t("div",{class:"mono muted"},`${W(e.base)} \\u2013 ${W(e.base+e.size-1)}`):t("div",{class:"muted"},"not memory-mapped"),p,e.issues.map(d=>t("div",{class:"error-text"},"\\u2716 ",d)))}function rt(e){let n=e.memoryMap.filter(i=>i.segments.length||i.chosen.length),s=e.memoryMap.filter(i=>!n.includes(i)),o=[];for(let i of e.memory)it(i,0,o);return t("div",{class:"memory","data-scroll":"memory"},n.length?t("div",{class:"mem-cols"},n.map(hs)):t("div",{class:"empty"},"No flash partitions or memory regions in this context"),e.memoryMap.some(i=>i.partitions)&&U()?t("div",{class:"muted mem-hint"},`Click a free area to add a partition; it is written to ${I(r.overlay)}.`):null,s.length?t("details",{class:"mem-more",open:r.memRestOpen,ontoggle:i=>void(r.memRestOpen=i.target.open)},t("summary",null,`Other memory regions (${s.length})`),t("table",{class:"mem"},t("tbody",null,s.map(i=>t("tr",{onclick:()=>C(i.path)},t("td",null,i.name),t("td",{class:"mono"},i.base!==void 0?`${W(i.base)} \\u2013 ${W(i.base+i.size-1)}`:""),t("td",{class:"num"},j(i.size)),t("td",null,i.chosen.join(", "))))))):null,e.memory.length?t("details",{class:"mem-more",open:r.memTableOpen,ontoggle:i=>void(r.memTableOpen=i.target.open)},t("summary",null,"Full address map (table)"),t("table",{class:"mem"},t("thead",null,t("tr",null,t("th",null,"Region"),t("th",null,"Range"),t("th",null,"Size"),t("th",null,"Labels"),t("th",null))),t("tbody",null,o))):null)}var ct=64,ve=22,Y=190,V=34,pn=240,dn=15,ze=12,dt=22,ut=6,un=12,Pe=ct+ve,Ce=Pe+Y+V,Ee=Ce+pn+V,at=Ee+Y+ve+ct,pt=e=>Math.max(34,e.pins.length*dn+12),cn=e=>dt+e.blocks.reduce((n,s)=>n+pt(s)+ut,0);function bs(e){let n=e.reduce((i,l)=>i+cn(l)+un,0),s=[],o=0;for(let i of e){if(s.length&&o+cn(i)/2>n/2)break;s.push(i),o+=cn(i)+un}return[s,e.slice(s.length)]}function ys(e,n){let s=e.nodes[n.path],o=n.disabled?\'"okay"\':\'"disabled"\';confirm(`${n.disabled?"Enable":"Disable"} ${s?.name??n.path}?\nWrites status = ${o} to ${I(r.overlay)}.`)&&Z(n.path,"status",o)}function lt(e,n,s,o){let i=s==="left"?Pe:Ee,l=s==="left"?i+Y:i,a=s==="left"?i:i+Y,c=s==="left"?l+V/2:l-V/2,u=ze,p=1/0,d=-1/0;for(let m of n){o.push(b("text",{x:i,y:u+14,class:"group"},m.name)),u+=dt;for(let f of m.blocks){let w=e.nodes[f.path],v=pt(f),x=u+17;p=Math.min(p,x),d=Math.max(d,x);let g=`blk${f.disabled?" off":""}${r.selected===f.path?" selected":""}${f.pins.some(E=>E.conflict)?" error":""}`;o.push(b("line",{class:`wire${f.disabled?" off":""}`,x1:l,y1:x,x2:c,y2:x}));let P=`${w?.labels[0]?`${w.labels[0]}: `:""}${w?.name??f.path}`;o.push(b("g",{class:g,onclick:()=>C(f.path),ondblclick:()=>C(f.path,{reveal:!0,tab:"tree"})},b("title",{},`${f.path}\n${f.class}${f.devices?`, ${f.devices} device${f.devices===1?"":"s"}`:""}\nclick: select, double click: open in Tree`),b("rect",{x:i,y:u,width:Y,height:v,rx:5}),b("svg",{x:i+9,y:u,width:Y-30,height:v,overflow:"hidden"},b("text",{x:0,y:15,class:"t1"},R(P,24)),b("text",{x:0,y:28,class:"t2"},R(`${f.class}${f.devices?` \\xB7 ${f.devices} dev`:""}`,26)))));let S=i+Y-12;o.push(b("g",{class:`switch${f.disabled?" off":""}${U()?"":" locked"}`,onclick:E=>{E.stopPropagation(),U()&&ys(e,f)}},b("title",{},U()?f.disabled?"Enable (okay)":"Disable":"Editing is disabled"),b("circle",{cx:S,cy:u+11,r:5}))),f.pins.forEach((E,$)=>{let L=u+12+$*dn+dn/2-2,F=s==="left"?[a-ve,a]:[a,a+ve],O=E.owner===f.path?E.function:`${e.nodes[E.owner]?.name??E.owner}: ${E.function??""}`,_=E.via?" ext":"",se=E.via?`\nvia the external GPIO controller ${E.via}: not a SoC pin`:"";o.push(b("line",{class:`lead${_}${f.disabled?" off":""}${E.conflict?" error":""}`,x1:F[0],y1:L,x2:F[1],y2:L}),b("text",{x:s==="left"?a-ve-4:a+ve+4,y:L+4,"text-anchor":s==="left"?"end":"start",class:`pin${_}${f.disabled?" off":""}${E.conflict?" error":""}`,onclick:()=>he(E.pin)},b("title",{},`${E.pin} ${O??""}${se}${E.conflict?`\nconflict: used by more than one enabled owner`:""}\nclick: show in Pins tab`),E.via?`${R(E.via,6)}.${E.pin.slice(E.via.length+1)}`:E.pin))}),u+=v+ut}u+=un}return p<=d&&o.push(b("line",{class:"wire",x1:c,y1:p,x2:c,y2:d})),{first:p,last:d,height:u}}function vs(e,n,s,o){let i=e.overview.soc,l=[["t1",i.compatible[i.compatible.length-1]??"SoC"],["t2",i.model??""],...i.cpus.map(a=>["t3",a]),...i.memory.length?[["t2",`memory (${i.memory.length})`]]:[],...i.memory.slice(0,8).map(a=>["t3",`${a.path.split("/").pop()}  ${j(a.size)}`]),...i.memory.length>8?[["t3",`\\u2026 ${i.memory.length-8} more`]]:[]];o.push(b("g",{class:`soc${r.selected==="/"?" selected":""}`,onclick:()=>C("/")},b("title",{},"click: select the root node"),b("rect",{x:Ce,y:n,width:pn,height:s,rx:8}),...l.map(([a,c],u)=>b("text",{x:Ce+14,y:n+24+u*17+(u>1?6:0),class:a},R(c,34)))))}function ft(e){let n=e.overview.groups.map(x=>({...x,blocks:r.overviewDisabled?x.blocks:x.blocks.filter(g=>!g.disabled)})).filter(x=>x.blocks.length),s=e.overview.groups.flatMap(x=>x.blocks),o=s.filter(x=>x.disabled).length,i=e.pins.conflicts.length,[l,a]=bs(n),c=[],u=lt(e,l,"left",c),p=lt(e,a,"right",c),d=3+e.overview.soc.cpus.length+Math.min(e.overview.soc.memory.length,9)+1,m=Math.max(140,d*17+20),f=Math.max(u.height,p.height,m+2*ze)+ze,w=Math.max(ze,(f-m)/2);vs(e,w,m,c);let v=w+m/2;return u.first<=u.last&&c.push(b("line",{class:"wire",x1:Pe+Y+V/2,y1:Math.min(u.first,v),x2:Pe+Y+V/2,y2:Math.max(u.last,v)}),b("line",{class:"wire",x1:Pe+Y+V/2,y1:v,x2:Ce,y2:v})),p.first<=p.last&&c.push(b("line",{class:"wire",x1:Ee-V/2,y1:Math.min(p.first,v),x2:Ee-V/2,y2:Math.max(p.last,v)}),b("line",{class:"wire",x1:Ce+pn,y1:v,x2:Ee-V/2,y2:v})),t("div",{class:"overview","data-scroll":"overview"},t("div",{class:"pin-bar"},t("label",{class:"check"},t("input",{type:"checkbox","data-key":"overview-disabled",checked:r.overviewDisabled,onchange:x=>{r.overviewDisabled=x.target.checked,k()}}),`show disabled (${o})`),t("span",{class:i?"summary error-text":"summary muted"},`${s.length-o} enabled peripherals, ${e.pins.usages.length?new Set(s.flatMap(x=>x.pins.filter(g=>!g.via).map(g=>g.pin))).size:0} pins`,i?`, ${i} pin conflict${i===1?"":"s"}`:""),t("span",{class:"muted"},"click: select \\xB7 double click: open in Tree \\xB7 \\u25CF enable/disable")),t("div",{class:"overview-diagram"},b("svg",{class:"ov-svg",width:at,height:f,viewBox:`0 0 ${at} ${f}`,role:"img","aria-label":"SoC overview"},...c)))}function mt(e,n){return e.path.toLowerCase().includes(n)||e.name.toLowerCase().includes(n)||e.labels.some(s=>s.toLowerCase().includes(n))||e.compatible.some(s=>s.toLowerCase().includes(n))}function $s(e){let n=r.search.trim().toLowerCase();if(!n)return null;let s=new Set,o=new Set,i=0;for(let l of Object.values(e.nodes))if(mt(l,n)){i++,s.add(l.path);for(let a of qe(l.path))s.add(a),o.add(a)}return{visible:s,forced:o,hits:i}}function ks(e,n){let s=[],o=(i,l)=>{let a=e.nodes[i];if(!a||n&&!n.visible.has(i))return;let c=n?n.forced.has(i)||r.expanded.has(i):r.expanded.has(i);if(s.push({node:a,depth:l,open:c}),c)for(let u of a.children)o(u,l+1)};return o(e.root,0),s}function fn(e){r.expanded.has(e)?r.expanded.delete(e):r.expanded.add(e),k()}function ws(e,n,s){let o=n.findIndex(a=>a.node.path===r.selected),i=n[o],l=a=>{a&&(r.scrollToSelected=!0,C(a.node.path))};switch(e.key){case"ArrowDown":l(n[o+1]??n[0]);break;case"ArrowUp":l(n[Math.max(0,o-1)]);break;case"ArrowRight":if(!i||!i.node.children.length)return;i.open?l(n[o+1]):fn(i.node.path);break;case"ArrowLeft":if(!i)return;if(i.open&&i.node.path!==s.root&&r.expanded.has(i.node.path))fn(i.node.path);else{let a=r.parents.get(i.node.path);a&&l(n.find(c=>c.node.path===a))}break;case"Home":l(n[0]);break;case"End":l(n[n.length-1]);break;default:return}e.preventDefault()}function gt(e){let n=$s(e),s=ks(e,n),o=r.search.trim().toLowerCase(),i=s.map(({node:a,depth:c,open:u})=>t("div",{class:`row${a.path===r.selected?" selected":""}${a.disabled?" disabled":""}${n&&!mt(a,o)?" context":""}`,"data-path":a.path,style:`padding-left:${c*14+4}px`,title:a.path,onclick:()=>C(a.path)},t("span",{class:"twisty",onclick:p=>{p.stopPropagation(),a.children.length&&fn(a.path)}},a.children.length?u?"\\u25BE":"\\u25B8":""),a.labels.map(p=>t("span",{class:"label"},`${p}:`)),t("span",{class:"name"},a.name),a.compatible.length?t("span",{class:"compat"},a.compatible.join(", ")):null,a.disabled?t("span",{class:"badge muted"},"disabled"):null,a.issues>0?t("span",{class:"badge warn",title:`${a.issues} issue(s)`},String(a.issues)):null)),l=t("div",{class:"tree",tabindex:0,role:"tree","data-key":"tree","data-scroll":"tree",onkeydown:a=>ws(a,s,e)},i.length?i:t("div",{class:"empty"},"No matching nodes"));return r.scrollToSelected&&(r.scrollToSelected=!1,requestAnimationFrame(()=>l.querySelector(".row.selected")?.scrollIntoView({block:"nearest"}))),t("div",{class:"tree-pane"},t("div",{class:"search"},t("input",{type:"search",placeholder:"Search path, name, label, compatible","data-key":"search",value:r.search,oninput:a=>{r.search=a.target.value,k()},onkeydown:a=>{a.key==="Escape"?(r.search="",k()):a.key==="ArrowDown"&&(a.preventDefault(),l.focus())}}),t("span",{class:"muted count"},n?`${n.hits} match${n.hits===1?"":"es"}`:`${Object.keys(e.nodes).length} nodes`)),l)}var xs=document.getElementById("app");function Us(){let e=r.model,n=r.contexts.length?r.contexts:e?[e.context]:[],s=e?.context.overlays??[];return t("header",null,t("span",{class:"brand"},"Devicetree"),t("label",null,"Context ",t("select",{"data-key":"context",disabled:!n.length,value:n.find(o=>o.active)?.id??e?.context.id??"",onchange:async o=>{try{await vn(o.target.value)}catch(i){ee("error",me(i))}ge()}},n.length?n.map(o=>t("option",{value:o.id},o.names.join(", ")||o.id)):t("option",{value:""},"\\u2014"))),e?s.length?t("label",null,"Write to ",t("select",{"data-key":"overlay",value:r.overlay,title:r.overlay,onchange:o=>{r.overlay=o.target.value,k()}},s.map(o=>t("option",{value:o,title:o},Sn(o))))):t("span",{class:"note"},"This build has no user overlay: editing is disabled."):null,t("span",{class:"spacer"}),r.busy?t("span",{class:"muted"},"Applying\\u2026"):null,t("span",{class:`dot ${r.connected?"up":"down"}`,title:r.connected?"Connected to companion":"Disconnected from companion, reconnecting\\u2026"}))}function Ms(){let e=(n,s)=>t("button",{class:`tab${r.tab===n?" active":""}`,role:"tab","aria-selected":String(r.tab===n),onclick:()=>{r.tab=n,n==="tree"&&(r.scrollToSelected=!0),k()}},s);return t("nav",{class:"tabs",role:"tablist"},e("tree","Tree"),e("overview","Overview"),e("buses",`Buses${Ps(r.model)}`),e("memory",`Memory${r.model?.memoryMap.some(n=>n.issues.length)?" (!)":""}`),r.model?.clocks?e("clocks",`Clocks${r.model.clocks.issues.some(n=>n.severity==="error")?" (!)":""}`):null,e("pins",`Pins${r.model?.pins.conflicts.length?` (${r.model.pins.conflicts.length} conflict${r.model.pins.conflicts.length===1?"":"s"})`:""}`))}function Ps(e){let n=e?.buses.reduce((s,o)=>s+o.issues.filter(i=>i.severity==="error").length,0)??0;return n?` (${n} error${n===1?"":"s"})`:""}function Es(){let e=r.message;return e?t("div",{class:`message ${e.kind}`,role:e.kind==="error"?"alert":"status"},t("span",null,e.text),t("button",{class:"icon",title:"Dismiss",onclick:()=>(r.message=null,k())},"\\u2715")):null}function Cs(){let e=r.model;return r.loaded?e?r.tab==="memory"?t("main",{class:"split memory-split"},rt(e),we(e)):r.tab==="clocks"?t("main",{class:"single"},et(e)):r.tab==="overview"?t("main",{class:"split overview-split"},ft(e),we(e)):r.tab==="buses"?t("main",{class:"split buses-split"},zn(e),we(e)):r.tab==="pins"?t("main",{class:"single"},Wn(e)):t("main",{class:"split"},gt(e),we(e)):t("main",{class:"center muted"},"Waiting for devicetree context\\u2026 Open a .dts or .overlay file in Zed."):t("main",{class:"center muted"},"Loading\\u2026")}On(()=>{Cn(xs,[Us(),Ms(),Es(),Cs()]),document.title=r.model?`Devicetree \\u2013 ${r.model.context.names.join(", ")}`:"Devicetree"});var ht=!1;En(()=>void ge(),e=>{e&&ht&&ge(),ht=!e,r.connected!==e&&(r.connected=e,k())});k();ge();})();\n</script>\n  </body>\n</html>\n';

// src/ui/server.ts
var MAX_BODY = 1 << 20;
var UiServer = class {
  constructor(backend) {
    this.backend = backend;
  }
  token = (0, import_node_crypto.randomBytes)(16).toString("hex");
  clients = /* @__PURE__ */ new Set();
  port = 0;
  get url() {
    return `http://127.0.0.1:${this.port}/?t=${this.token}`;
  }
  async start() {
    if (this.port) return this.url;
    const server = (0, import_node_http.createServer)((req, res) => {
      this.handle(req, res).catch((e) => send(res, 500, { error: String(e?.message ?? e) }));
    });
    await new Promise((resolve4) => server.listen(0, "127.0.0.1", resolve4));
    this.port = server.address().port;
    server.unref();
    return this.url;
  }
  /** Tell every open page to refetch. */
  changed(reason) {
    const frame = `event: changed
data: ${JSON.stringify({ reason })}

`;
    for (const c of this.clients) c.write(frame);
  }
  authorized(req, url) {
    if (req.headers.host !== `127.0.0.1:${this.port}`) return false;
    const given = String(req.headers["x-token"] ?? url.searchParams.get("t") ?? "");
    const a = Buffer.from(given);
    const b = Buffer.from(this.token);
    return a.length === b.length && (0, import_node_crypto.timingSafeEqual)(a, b);
  }
  async handle(req, res) {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (!this.authorized(req, url)) return send(res, 403, { error: "forbidden" });
    const route = `${req.method} ${url.pathname}`;
    switch (route) {
      case "GET /":
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"
        });
        return void res.end(ui_default);
      case "GET /api/events":
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        res.write(": connected\n\n");
        this.clients.add(res);
        req.on("close", () => this.clients.delete(res));
        return;
      case "GET /api/contexts":
        return send(res, 200, await this.backend.contexts());
      case "GET /api/model": {
        const model = await this.backend.model();
        return model ? send(res, 200, model) : void res.writeHead(204).end();
      }
      case "POST /api/active":
        await this.backend.setActive(String((await body(req)).id));
        return send(res, 200, {});
      case "POST /api/open": {
        const b = await body(req);
        await this.backend.open({ file: String(b.file), line: Number(b.line) || 0, character: Number(b.character) || 0 });
        return send(res, 200, {});
      }
      case "POST /api/edit": {
        const b = await body(req);
        const value = b.value === true || b.value === null ? b.value : String(b.value);
        return send(
          res,
          200,
          await this.backend.edit({ nodePath: String(b.nodePath), overlay: String(b.overlay), property: String(b.property), value })
        );
      }
      case "GET /api/catalog":
        return send(res, 200, await this.backend.catalog(url.searchParams.get("bus") ?? ""));
      case "POST /api/add-node": {
        const b = await body(req);
        const props = Array.isArray(b.props) ? b.props.map((p) => ({ name: String(p?.name), value: p?.value === true ? true : String(p?.value) })) : [];
        return send(
          res,
          200,
          await this.backend.addNode({
            parentPath: String(b.parentPath),
            overlay: String(b.overlay),
            name: String(b.name),
            label: typeof b.label === "string" && /^[A-Za-z_]\w*$/.test(b.label) ? b.label : void 0,
            props
          })
        );
      }
      case "POST /api/address": {
        const b = await body(req);
        return send(
          res,
          200,
          await this.backend.setAddress({ nodePath: String(b.nodePath), overlay: String(b.overlay), reg: String(b.reg), unit: String(b.unit) })
        );
      }
      case "POST /api/move-pin": {
        const b = await body(req);
        return send(
          res,
          200,
          await this.backend.movePin({
            owner: String(b.owner),
            function: String(b.function),
            from: String(b.from),
            to: String(b.to),
            overlay: String(b.overlay),
            force: b.force === true
          })
        );
      }
      case "POST /api/edits": {
        const b = await body(req);
        const edits = (Array.isArray(b.edits) ? b.edits : []).map((e) => ({
          nodePath: String(e?.nodePath),
          property: String(e?.property),
          value: e?.value === true ? true : e?.value === null ? null : String(e?.value)
        }));
        return send(res, 200, await this.backend.editMany(String(b.overlay), edits));
      }
      case "POST /api/assign-pin": {
        const b = await body(req);
        return send(
          res,
          200,
          await this.backend.assignPin({ function: String(b.function), pin: String(b.pin), owner: String(b.owner), overlay: String(b.overlay), force: b.force === true })
        );
      }
      default:
        return send(res, 404, { error: "not found" });
    }
  }
};
function send(res, status, data) {
  if (res.headersSent) return void res.end();
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
}
async function body(req) {
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) throw new Error("expected JSON");
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

// src/west.ts
var import_node_child_process2 = require("node:child_process");
var import_node_fs5 = require("node:fs");
var import_node_path4 = require("node:path");
var import_node_util = require("node:util");
var import_yaml2 = __toESM(require_dist(), 1);
function findTopdir(start) {
  for (let dir = (0, import_node_path4.resolve)(start); ; dir = (0, import_node_path4.dirname)(dir)) {
    if ((0, import_node_fs5.existsSync)((0, import_node_path4.join)(dir, ".west", "config"))) return dir;
    if ((0, import_node_path4.dirname)(dir) === dir) return void 0;
  }
}
function parseIni(text) {
  const out = {};
  let section;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const header = /^\[(.+)\]$/.exec(line);
    if (header) {
      section = out[header[1].trim()] ??= {};
    } else if (section) {
      const eq = line.search(/[=:]/);
      if (eq > 0) section[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  return out;
}
async function loadWorkspace(start, env = process.env) {
  const topdir = findTopdir(start);
  if (!topdir) return void 0;
  const config = parseIni((0, import_node_fs5.readFileSync)((0, import_node_path4.join)(topdir, ".west", "config"), "utf8"));
  const manifestPath = (0, import_node_path4.resolve)(topdir, config.manifest?.path ?? ".");
  const manifestFile = config.manifest?.file ?? "west.yml";
  const base = config.zephyr?.base ?? env.ZEPHYR_BASE;
  const ws = {
    topdir,
    manifestPath,
    manifestFile,
    zephyrBase: base ? (0, import_node_path4.resolve)(topdir, base) : void 0,
    projects: []
  };
  ws.projects = await westList(topdir, env) ?? readManifestProjects(ws);
  if (!ws.zephyrBase) {
    const zephyr = ws.projects.find((p) => p.name === "zephyr");
    if (zephyr) ws.zephyrBase = zephyr.path;
  }
  return ws;
}
function westCandidates(topdir, env = process.env) {
  const exe = process.platform === "win32" ? ["Scripts", "west.exe"] : ["bin", "west"];
  const venvs = [env.VIRTUAL_ENV, (0, import_node_path4.join)(topdir, ".venv"), (0, import_node_path4.join)(topdir, "venv")].filter(Boolean);
  return [...venvs.map((v) => (0, import_node_path4.join)(v, ...exe)).filter(import_node_fs5.existsSync), "west"];
}
async function westList(topdir, env) {
  const run = (0, import_node_util.promisify)(import_node_child_process2.execFile);
  for (const west of westCandidates(topdir, env)) {
    try {
      const { stdout } = await run(west, ["list", "-f", "{name}	{abspath}"], {
        cwd: topdir,
        env,
        timeout: 15e3
      });
      const projects = stdout.split(/\r?\n/).filter(Boolean).map((line) => {
        const [name, path] = line.split("	");
        return { name, path };
      });
      if (projects.length) return projects;
    } catch {
    }
  }
  return void 0;
}
var asList = (v) => v === void 0 ? void 0 : [v].flat();
function readManifestProjects(ws) {
  const found = /* @__PURE__ */ new Map();
  found.set("manifest", { name: "manifest", path: ws.manifestPath });
  const visit = (file, prefix, allow, block, depth = 0) => {
    if (depth > 8 || !(0, import_node_fs5.existsSync)(file)) return;
    const manifest = ((0, import_yaml2.parse)((0, import_node_fs5.readFileSync)(file, "utf8")) ?? {}).manifest ?? {};
    const projects = manifest.projects ?? [];
    const imports = [];
    for (const p of projects) {
      if (allow && !allow.includes(p.name)) continue;
      if (block?.includes(p.name)) continue;
      if (found.has(p.name)) continue;
      const own = typeof p.import === "object" && !Array.isArray(p.import) ? p.import["path-prefix"] ?? "" : "";
      const path = (0, import_node_path4.resolve)(ws.topdir, prefix, own, p.path ?? p.name);
      found.set(p.name, { name: p.name, path });
      if (p.import) imports.push(() => importFrom(path, p.import, prefix, depth));
    }
    const self = manifest.self?.import;
    if (self && depth === 0) imports.unshift(() => importFrom(ws.manifestPath, self, prefix, depth));
    imports.forEach((f) => f());
  };
  const importFrom = (projectPath, spec, prefix, depth) => {
    if (spec === false) return;
    const specs = typeof spec === "object" && !Array.isArray(spec) ? spec : void 0;
    const files = spec === true ? ["west.yml"] : typeof spec === "string" ? [spec] : Array.isArray(spec) ? spec : [specs?.file ?? "west.yml"];
    const nextPrefix = (0, import_node_path4.join)(prefix, specs?.["path-prefix"] ?? "");
    for (const f of files) {
      const target = (0, import_node_path4.isAbsolute)(f) ? f : (0, import_node_path4.join)(projectPath, f);
      visit(target, nextPrefix, asList(specs?.["name-allowlist"]), asList(specs?.["name-blocklist"]), depth + 1);
    }
  };
  visit((0, import_node_path4.join)(ws.manifestPath, ws.manifestFile), "");
  return [...found.values()];
}

// src/proxy.ts
var SET_ACTIVE_COMMAND = "zephyr-devicetree.setActiveContext";
var OPEN_UI_COMMAND = "zephyr-devicetree.openVisualEditor";
var log2 = (...args) => console.error("[companion]", ...args);
function filesOf(tree, out = /* @__PURE__ */ new Set()) {
  if (Array.isArray(tree)) tree.forEach((t) => filesOf(t, out));
  else if (tree && typeof tree === "object") {
    for (const [k, v] of Object.entries(tree)) {
      if (k === "fsPath" && typeof v === "string") out.add(v);
      else if (k !== "settings") filesOf(v, out);
    }
  }
  return out;
}
var Proxy2 = class {
  constructor(zed, server) {
    this.zed = zed;
    this.server = server;
    this.backend = new EditorBackend({
      zed,
      server,
      docs: this.docs,
      external: () => this.external,
      canShowDocument: () => this.canShowDocument
    });
    this.ui = new UiServer(this.backend);
  }
  root;
  ws;
  external = [];
  /** ctxName -> context id, as returned by requestContext. */
  requested = /* @__PURE__ */ new Map();
  fingerprint = "";
  contexts = [];
  /** Last file Zed opened or asked about; drives the post-sync context choice. */
  currentFile;
  codeActions = /* @__PURE__ */ new Map();
  // request id -> file path
  initializeId;
  watchers = [];
  timer;
  syncing = Promise.resolve();
  docs = new DocumentStore();
  canShowDocument = false;
  ui;
  backend;
  uiTimer;
  /**
   * Debounced "model may have changed" for open editor pages. Typing waits
   * longer: every rebuild costs a full serializedContext in dts-lsp.
   */
  uiChanged(reason, delay = reason === "didChange" ? 1500 : 500) {
    this.backend.invalidate();
    clearTimeout(this.uiTimer);
    this.uiTimer = setTimeout(() => this.ui.changed(reason), delay);
  }
  fromZed(msg) {
    if (this.zed.settle(msg)) return;
    const uri = msg.params?.textDocument?.uri;
    if (typeof uri === "string" && uri.startsWith("file:") && msg.method !== "textDocument/didClose") {
      this.currentFile = (0, import_node_url5.fileURLToPath)(uri);
    }
    if (this.docs.observe(msg.method, msg.params) && msg.method !== "textDocument/didOpen") {
      this.uiChanged(msg.method.slice("textDocument/".length));
    }
    switch (msg.method) {
      case "initialize":
        this.initializeId = msg.id;
        this.root = rootOf(msg.params);
        this.canShowDocument = !!msg.params?.capabilities?.window?.showDocument?.support;
        break;
      case "initialized":
        this.server.send(msg);
        this.scheduleSync(0);
        return;
      case "textDocument/codeAction":
        if (msg.id !== void 0 && msg.params?.textDocument?.uri?.startsWith("file:")) {
          this.codeActions.set(msg.id, (0, import_node_url5.fileURLToPath)(msg.params.textDocument.uri));
        }
        break;
      case "workspace/executeCommand":
        if (msg.params?.command === SET_ACTIVE_COMMAND) {
          const [id] = msg.params.arguments ?? [];
          this.server.request("devicetree/setActive", { id }).then(() => this.refreshContexts()).then(() => this.zed.send({ id: msg.id, result: null })).catch((e) => this.zed.send({ id: msg.id, error: { code: -32603, message: String(e) } }));
          return;
        }
        if (msg.params?.command === OPEN_UI_COMMAND) {
          this.openUi().then(() => this.zed.send({ id: msg.id, result: null })).catch((e) => this.zed.send({ id: msg.id, error: { code: -32603, message: String(e) } }));
          return;
        }
        break;
      case "shutdown":
        this.watchers.forEach((w) => w.close());
        clearTimeout(this.timer);
        break;
    }
    this.server.send(msg);
  }
  fromServer(msg) {
    if (this.server.settle(msg)) return;
    if (msg.method === "textDocument/publishDiagnostics") {
      this.zed.send(this.filterDiagnostics(msg));
      return;
    }
    if (msg.method === "devicetree/newActiveContext" || msg.method === "devicetree/contextDeleted") {
      void this.refreshContexts();
    }
    if (msg.method === "devicetree/newActiveContext" || msg.method === "devicetree/activeContextStableNotification") {
      this.uiChanged(msg.method.slice("devicetree/".length));
    }
    if (msg.method?.startsWith("devicetree/") && msg.id === void 0) return;
    if (!msg.method && msg.id !== void 0) {
      if (msg.id === this.initializeId) {
        const caps = msg.result?.capabilities;
        if (caps) {
          const cmds = caps.executeCommandProvider?.commands ?? [];
          caps.executeCommandProvider = { ...caps.executeCommandProvider, commands: [...cmds, SET_ACTIVE_COMMAND, OPEN_UI_COMMAND] };
        }
      } else if (this.codeActions.has(msg.id)) {
        const file = this.codeActions.get(msg.id);
        this.codeActions.delete(msg.id);
        this.zed.send(this.withContextActions(msg, file));
        return;
      }
    }
    this.zed.send(msg);
  }
  filterDiagnostics(msg) {
    const uri = msg.params?.uri ?? "";
    if (!uri.startsWith("file:") || !this.external.length) return msg;
    if (!isUnder((0, import_node_url5.fileURLToPath)(uri), this.external)) return msg;
    const diagnostics = (msg.params.diagnostics ?? []).filter((d) => (d.severity ?? 1) <= 2);
    return { ...msg, params: { ...msg.params, diagnostics } };
  }
  /** Offer every other context that contains `file` (SPEC D5). */
  withContextActions(msg, file) {
    const owners = this.contexts.filter((c) => filesOf(c).has(file));
    const actions = owners.filter((c) => !c.active && c.type !== "Ad Hoc").map((c) => ({
      title: `Devicetree: switch context to ${c.ctxNames.join(", ")}`,
      kind: "source",
      command: { title: "Switch devicetree context", command: SET_ACTIVE_COMMAND, arguments: [c.id] }
    }));
    actions.unshift({
      title: "Devicetree: open visual editor",
      kind: "source",
      command: { title: "Open devicetree visual editor", command: OPEN_UI_COMMAND, arguments: [] }
    });
    if (msg.error) return msg;
    return { ...msg, result: [...msg.result ?? [], ...actions] };
  }
  async openUi() {
    const url = await this.ui.start();
    log2(`visual editor: ${url}`);
    if (this.canShowDocument) {
      const res = await this.zed.request("window/showDocument", { uri: url, external: true }).catch(() => void 0);
      if (res?.success) return;
    }
    openExternal(url);
  }
  async refreshContexts() {
    try {
      this.contexts = await this.server.request("devicetree/getContexts") ?? [];
    } catch (e) {
      log2("getContexts failed", e);
    }
  }
  /**
   * A file opened before discovery finished gets an ad-hoc context (an overlay
   * then becomes its own root and reports bogus errors). dts-lsp keeps an active
   * context that owns the file, so move to the newest build that owns it.
   */
  async preferBuildContext() {
    const file = this.currentFile;
    if (!file) return;
    const ours = new Set(this.requested.values());
    const active = this.contexts.find((c) => c.active);
    if (active && ours.has(active.id)) return;
    const owner = [...this.requested.values()].find((id) => {
      const ctx = this.contexts.find((c) => c.id === id);
      return ctx && filesOf(ctx).has(file);
    });
    if (!owner) return;
    await this.server.request("devicetree/setActive", { id: owner });
    await this.refreshContexts();
  }
  scheduleSync(delay = 1e3) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.syncing = this.syncing.then(() => this.sync()).catch((e) => log2("sync failed", e));
    }, delay);
  }
  /** Push workspace defaults and build contexts to dts-lsp when anything changed. */
  async sync() {
    if (!this.root) return;
    this.ws ??= await loadWorkspace(this.root);
    const topdir = this.ws?.topdir ?? this.root;
    const builds = discoverBuilds(topdir, defaultDiscovery);
    const fingerprint = JSON.stringify(builds.map((b) => [b.ctxName, b.mtimeMs]));
    if (this.fingerprint === "" && this.ws) {
      this.external = externalRoots(this.ws);
      await this.server.request("devicetree/setDefaultSettings", restrictedDefaults(this.ws, workspaceModules(this.ws)));
      log2(`workspace ${topdir}: zephyr ${this.ws.zephyrBase ?? "not found"}, ${this.ws.projects.length} projects`);
    }
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      for (const [name, id] of [...this.requested].reverse()) {
        await this.server.request("devicetree/removeContext", { id, name }).catch(() => void 0);
      }
      this.requested.clear();
      for (const b of builds) {
        const { buildDir: _dir, image: _image, mtimeMs: _mtime, ...ctx } = b;
        try {
          const item = await this.server.request("devicetree/requestContext", ctx);
          this.requested.set(b.ctxName, item.id);
        } catch (e) {
          log2(`context ${b.ctxName}:`, e);
        }
      }
      log2(`contexts: ${builds.map((b) => b.ctxName).join(", ") || "none"}`);
      await this.refreshContexts();
      await this.preferBuildContext();
      this.uiChanged("contexts", 0);
    }
    this.watchBuilds(topdir, builds);
  }
  watchBuilds(topdir, builds) {
    this.watchers.forEach((w) => w.close());
    const dirs = /* @__PURE__ */ new Set([...defaultDiscovery.buildParents.map((p) => (0, import_node_path5.join)(topdir, p)), ...builds.map((b) => b.buildDir)]);
    this.watchers = [...dirs].flatMap((d) => {
      try {
        return [(0, import_node_fs6.watch)(d, () => this.scheduleSync())];
      } catch {
        return [];
      }
    });
  }
};
function rootOf(params) {
  const uri = params?.workspaceFolders?.[0]?.uri ?? params?.rootUri;
  if (uri) return (0, import_node_url5.fileURLToPath)(uri);
  return params?.rootPath ?? void 0;
}

// src/bindings/lsp.ts
var import_node_fs10 = require("node:fs");
var import_node_url6 = require("node:url");
var import_yaml4 = __toESM(require_dist(), 1);

// src/bindings/compatibles.ts
var import_node_fs7 = require("node:fs");
var import_node_path6 = require("node:path");
var SKIP_DIRS = /^(\.|node_modules$|build|twister|__pycache__$)/;
var DTS_FILE = /\.(dts|dtsi|overlay|dtso)$/;
function* walkDts(dir, depth = 0) {
  if (depth > 12) return;
  let entries;
  try {
    entries = (0, import_node_fs7.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.test(e.name)) yield* walkDts((0, import_node_path6.join)(dir, e.name), depth + 1);
    } else if (DTS_FILE.test(e.name)) yield (0, import_node_path6.join)(dir, e.name);
  }
}
function scanCompatibles(file, text) {
  const uses = /* @__PURE__ */ new Map();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!/\bcompatible\s*=/.test(line)) return;
    for (const m of line.matchAll(/"([^"]+)"/g)) {
      const start = m.index;
      const list = uses.get(m[1]) ?? [];
      list.push({ file, line: i, start, end: start + m[0].length });
      uses.set(m[1], list);
    }
  });
  return uses;
}
var CompatibleIndex = class {
  constructor(roots) {
    this.roots = roots;
  }
  files = /* @__PURE__ */ new Map();
  /** Walks the roots (cheap), re-reads changed files only. */
  refresh() {
    const seen = /* @__PURE__ */ new Set();
    let reread = 0;
    for (const root of this.roots) {
      for (const file of walkDts(root)) {
        if (seen.has(file)) continue;
        seen.add(file);
        let mtimeMs;
        try {
          mtimeMs = (0, import_node_fs7.statSync)(file).mtimeMs;
        } catch {
          continue;
        }
        if (this.files.get(file)?.mtimeMs === mtimeMs) continue;
        reread++;
        let text = "";
        try {
          text = (0, import_node_fs7.readFileSync)(file, "utf8");
        } catch {
        }
        this.files.set(file, { mtimeMs, uses: scanCompatibles(file, text) });
      }
    }
    for (const file of this.files.keys()) if (!seen.has(file)) this.files.delete(file);
    return { files: seen.size, reread };
  }
  find(compatible) {
    return [...this.files.values()].flatMap((e) => e.uses.get(compatible) ?? []);
  }
};

// src/bindings/binding.ts
var import_node_fs9 = require("node:fs");
var import_node_path8 = require("node:path");
var import_yaml3 = __toESM(require_dist(), 1);

// src/bindings/rules.ts
var import_node_fs8 = require("node:fs");
var import_node_path7 = require("node:path");
var FALLBACK = {
  topKeys: ["title", "description", "compatible", "bus", "on-bus", "class", "properties", "child-binding", "examples"],
  propKeys: [
    "description",
    "type",
    "required",
    "enum",
    "const",
    "default",
    "deprecated",
    "specifier-space",
    "min",
    "max",
    "min-len",
    "max-len",
    "dependency-mode"
  ],
  types: [
    "boolean",
    "int",
    "array",
    "uint8-array",
    "string",
    "string-array",
    "phandle",
    "phandles",
    "phandle-array",
    "path",
    "compound"
  ]
};
function pySet(src, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*\\{([^}]*)\\}`).exec(src);
  if (!m) return void 0;
  const items = [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
  return items.length ? items : void 0;
}
function loadRules(zephyrBase) {
  const file = zephyrBase && (0, import_node_path7.join)(zephyrBase, "scripts", "dts", "python-devicetree", "src", "devicetree", "edtlib.py");
  const src = file && (0, import_node_fs8.existsSync)(file) ? (0, import_node_fs8.readFileSync)(file, "utf8") : "";
  const top = pySet(src, "ok_top");
  const prop3 = pySet(src, "ok_prop_keys");
  const types = pySet(src, "ok_types");
  return {
    topKeys: new Set(top ?? FALLBACK.topKeys),
    propKeys: new Set(prop3 ?? FALLBACK.propKeys),
    types: new Set(types ?? FALLBACK.types),
    source: top && prop3 && types ? file : "built-in (Zephyr 4.5)"
  };
}
var INCLUDE_KEYS = /* @__PURE__ */ new Set(["name", "property-allowlist", "property-blocklist", "child-binding"]);

// src/bindings/binding.ts
var BindingIndex = class {
  constructor(dirs) {
    this.dirs = dirs;
    for (const dir of dirs) this.scan(dir);
  }
  /** file name -> path; the first bindings dir wins, like edtlib. */
  byName = /* @__PURE__ */ new Map();
  /** compatible -> binding paths */
  byCompatible = /* @__PURE__ */ new Map();
  scan(dir) {
    let entries;
    try {
      entries = (0, import_node_fs9.readdirSync)(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const path = (0, import_node_path8.join)(dir, e.name);
      if (e.isDirectory()) this.scan(path);
      else if (/\.ya?ml$/.test(e.name)) {
        if (!this.byName.has(e.name)) this.byName.set(e.name, path);
        const compatible = /^compatible:\s*["']?([^"'\s#]+)/m.exec(safeRead(path))?.[1];
        if (compatible) this.byCompatible.set(compatible, [...this.byCompatible.get(compatible) ?? [], path]);
      }
    }
  }
  isBindingFile(file) {
    return this.dirs.some((d) => file.startsWith(d + "/") || file.startsWith(d + "\\")) || /[\\/]dts[\\/]bindings[\\/]/.test(file);
  }
};
function safeRead(file) {
  try {
    return (0, import_node_fs9.readFileSync)(file, "utf8");
  } catch {
    return "";
  }
}
var asList2 = (v) => Array.isArray(v) ? v.map(String) : void 0;
function analyze(file, text, index, rules) {
  const lc = new import_yaml3.LineCounter();
  const doc = (0, import_yaml3.parseDocument)(text, { lineCounter: lc, keepSourceTokens: false, uniqueKeys: true });
  const pos = (offset) => {
    const p = lc.linePos(offset);
    return { line: p.line - 1, character: p.col - 1 };
  };
  const rangeOf = (n) => {
    const r = n?.range ?? [0, 0, 0];
    return { start: pos(r[0]), end: pos(r[1]) };
  };
  const diagnostics = [];
  const report = (n, message, severity = 1) => diagnostics.push({ range: rangeOf(n), severity, message, source: "zephyr-bindings" });
  const targets = [];
  for (const e of doc.errors) {
    diagnostics.push({ range: { start: pos(e.pos[0]), end: pos(e.pos[1]) }, severity: 1, message: e.message, source: "zephyr-bindings" });
  }
  const includes = [];
  const props = [];
  let compatible;
  const root = doc.contents;
  if (!(0, import_yaml3.isMap)(root)) {
    if (root) report(root, "a binding must be a mapping");
    return { diagnostics, includes, props, compatible, at: () => void 0 };
  }
  const checkInclude = (n) => {
    const add = (name, extra = {}) => {
      const value = String(name.value);
      const ref2 = { name: value, range: rangeOf(name), ...extra };
      includes.push(ref2);
      targets.push({ kind: "include", name: value, range: ref2.range });
      if (!index.byName.has(value)) report(name, `included binding '${value}' not found in any bindings directory`);
    };
    if ((0, import_yaml3.isScalar)(n)) add(n);
    else if ((0, import_yaml3.isSeq)(n)) {
      for (const item of n.items) {
        if ((0, import_yaml3.isScalar)(item)) add(item);
        else if ((0, import_yaml3.isMap)(item)) {
          const name = item.get("name", true);
          for (const pair of item.items) {
            const key = String(pair.key?.value);
            if (!INCLUDE_KEYS.has(key)) report(pair.key, `unknown include key '${key}', expected one of ${[...INCLUDE_KEYS].join(", ")}`);
          }
          const allow = asList2(item.toJSON()["property-allowlist"]);
          const block = asList2(item.toJSON()["property-blocklist"]);
          if (allow && block) report(item, "include should not specify both 'property-allowlist:' and 'property-blocklist:'");
          if ((0, import_yaml3.isScalar)(name)) add(name, { allow, block });
          else report(item, "include entry needs 'name:'");
        } else report(item, "include entries are file names or maps with 'name:'");
      }
    } else if (n) report(n, "'include:' must be a string or a list");
  };
  const checkProperties = (map, own) => {
    if (!(0, import_yaml3.isMap)(map)) return;
    for (const pair of map.items) {
      const name = String(pair.key?.value);
      if (own) props.push({ name, file, range: rangeOf(pair.key), options: pair.value?.toJSON?.() ?? {} });
      targets.push({ kind: "property", name, range: rangeOf(pair.key) });
      if (!(0, import_yaml3.isMap)(pair.value)) {
        if (pair.value) report(pair.value, `'${name}': property options must be a mapping`);
        continue;
      }
      for (const opt of pair.value.items) {
        const key = String(opt.key?.value);
        targets.push({ kind: "key", path: ["properties", name, key], range: rangeOf(opt.key) });
        if (!rules.propKeys.has(key)) report(opt.key, `unknown key '${key}' in '${name}', expected one of ${[...rules.propKeys].join(", ")}`);
        if (key === "type") {
          targets.push({ kind: "type", range: rangeOf(opt.value) });
          const t = String(opt.value?.value);
          if (!rules.types.has(t)) report(opt.value, `'${t}' is not a valid type, expected one of ${[...rules.types].join(", ")}`);
        }
      }
      const o = pair.value.toJSON();
      if (o["specifier-space"] !== void 0 && o.type !== void 0 && o.type !== "phandle-array") {
        report(pair.key, `'specifier-space' in '${name}' is only allowed for type phandle-array`);
      }
      if (o.deprecated && o.required) report(pair.key, `'${name}' is both deprecated and required`, 2);
    }
  };
  const checkLevel = (map, top) => {
    for (const pair of map.items) {
      const key = String(pair.key?.value);
      targets.push({ kind: "key", path: [key], range: rangeOf(pair.key) });
      if (key !== "include" && !rules.topKeys.has(key) && !key.endsWith("-cells")) {
        report(pair.key, `unknown key '${key}', expected one of ${[...rules.topKeys].join(", ")}, include or *-cells`);
      }
      if (key === "include") checkInclude(pair.value);
      if (key === "properties") checkProperties(pair.value, top);
      if (key === "child-binding" && (0, import_yaml3.isMap)(pair.value)) checkLevel(pair.value, false);
      if (key === "compatible" && top && (0, import_yaml3.isScalar)(pair.value)) {
        compatible = { value: String(pair.value.value), range: rangeOf(pair.value) };
        targets.push({ kind: "compatible", ...compatible });
      }
    }
  };
  checkLevel(root, true);
  if (compatible && includes.every((i) => index.byName.has(i.name))) {
    const merged = resolveProperties(includes, index);
    for (const p of props) {
      if (p.options.type === void 0 && !merged.get(p.name)?.options.type) {
        diagnostics.push({ range: p.range, severity: 1, message: `missing 'type:' for '${p.name}'`, source: "zephyr-bindings" });
      }
    }
  }
  const inside = (r, p) => (p.line > r.start.line || p.line === r.start.line && p.character >= r.start.character) && (p.line < r.end.line || p.line === r.end.line && p.character <= r.end.character);
  return {
    diagnostics,
    includes,
    props,
    compatible,
    at: (p) => targets.filter((t) => inside(t.range, p)).at(-1)
  };
}
function resolveProperties(includes, index, depth = 0, seen = /* @__PURE__ */ new Set()) {
  const out = /* @__PURE__ */ new Map();
  if (depth > 16) return out;
  for (const inc of includes) {
    const path = index.byName.get(inc.name);
    if (!path || seen.has(path)) continue;
    const doc = (0, import_yaml3.parseDocument)(safeRead(path)).toJSON() ?? {};
    const nested = [];
    const raw = doc.include;
    for (const item of raw === void 0 ? [] : [raw].flat()) {
      if (typeof item === "string") nested.push({ name: item, range: zero });
      else if (item?.name) nested.push({ name: item.name, range: zero, allow: asList2(item["property-allowlist"]), block: asList2(item["property-blocklist"]) });
    }
    const all = new Map([...resolveProperties(nested, index, depth + 1, /* @__PURE__ */ new Set([...seen, path]))]);
    for (const [name, options] of Object.entries(doc.properties ?? {})) {
      const prev = all.get(name);
      all.set(name, { name, file: path, range: zero, options: { ...prev?.options ?? {}, ...options } });
    }
    for (const [name, def] of all) {
      if (inc.allow && !inc.allow.includes(name)) continue;
      if (inc.block?.includes(name)) continue;
      const prev = out.get(name);
      out.set(name, prev ? { ...def, options: { ...prev.options, ...def.options } } : def);
    }
  }
  return out;
}
var zero = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

// src/bindings/lsp.ts
var log3 = (...args) => console.error("[bindings]", ...args);
var BindingsServer = class {
  constructor(client) {
    this.client = client;
  }
  ws;
  index = new BindingIndex([]);
  rules = loadRules();
  docs = /* @__PURE__ */ new Map();
  ready = Promise.resolve();
  compatibles;
  handle(msg) {
    if (this.client.settle(msg)) return;
    const reply = (result) => msg.id !== void 0 && this.client.send({ id: msg.id, result });
    const p = msg.params;
    switch (msg.method) {
      case "initialize": {
        const uri = p?.workspaceFolders?.[0]?.uri ?? p?.rootUri;
        this.ready = this.load(uri ? (0, import_node_url6.fileURLToPath)(uri) : process.cwd());
        return void reply({
          capabilities: {
            textDocumentSync: { openClose: true, change: 1, save: true },
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
            completionProvider: { triggerCharacters: [":", " "] }
          },
          serverInfo: { name: "zephyr-bindings" }
        });
      }
      case "textDocument/didOpen":
        this.docs.set(p.textDocument.uri, p.textDocument.text);
        return void this.ready.then(() => this.publish(p.textDocument.uri));
      case "textDocument/didChange":
        this.docs.set(p.textDocument.uri, p.contentChanges.at(-1).text);
        return void this.ready.then(() => this.publish(p.textDocument.uri));
      case "textDocument/didSave":
        return void (this.ready = this.ready.then(() => this.reindex()));
      case "textDocument/didClose":
        this.docs.delete(p.textDocument.uri);
        return void this.client.notify("textDocument/publishDiagnostics", { uri: p.textDocument.uri, diagnostics: [] });
      case "textDocument/hover":
        return void this.ready.then(() => reply(this.hover(p.textDocument.uri, p.position)));
      case "textDocument/definition":
        return void this.ready.then(() => reply(this.definition(p.textDocument.uri, p.position)));
      case "textDocument/references":
        return void this.ready.then(() => reply(this.references(p.textDocument.uri, p.position)));
      case "textDocument/completion":
        return void this.ready.then(() => reply(this.completion(p.textDocument.uri, p.position)));
      case "shutdown":
        return void reply(null);
      case "exit":
        return process.exit(0);
      default:
        if (msg.id !== void 0 && msg.method) this.client.send({ id: msg.id, error: { code: -32601, message: `unsupported: ${msg.method}` } });
    }
  }
  async load(root) {
    this.ws = await loadWorkspace(root);
    this.rules = loadRules(this.ws?.zephyrBase);
    this.reindex();
    log3(`rules: ${this.rules.source}; ${this.index.byName.size} bindings in ${this.index.dirs.length} dirs`);
  }
  reindex() {
    if (!this.ws) return;
    const dirs = new Set(restrictedDefaults(this.ws, workspaceModules(this.ws)).defaultZephyrBindings);
    for (const b of discoverBuilds(this.ws.topdir)) b.zephyrBindings.forEach((d) => dirs.add(d));
    this.index = new BindingIndex([...dirs]);
  }
  analysis(uri) {
    if (!uri.startsWith("file:")) return void 0;
    const file = (0, import_node_url6.fileURLToPath)(uri);
    if (!this.index.isBindingFile(file)) return void 0;
    const text = this.docs.get(uri) ?? (0, import_node_fs10.readFileSync)(file, "utf8");
    return { file, text, a: analyze(file, text, this.index, this.rules) };
  }
  publish(uri) {
    const r = this.analysis(uri);
    if (r) this.client.notify("textDocument/publishDiagnostics", { uri, diagnostics: r.a.diagnostics });
  }
  merged(uri) {
    const r = this.analysis(uri);
    return r && { ...r, inherited: resolveProperties(r.a.includes, this.index) };
  }
  hover(uri, pos) {
    const r = this.merged(uri);
    const t = r?.a.at(pos);
    if (!r || !t) return null;
    if (t.kind === "include") {
      const path = this.index.byName.get(t.name);
      if (!path) return null;
      const description = String((0, import_yaml4.parseDocument)((0, import_node_fs10.readFileSync)(path, "utf8")).toJSON()?.description ?? "").trim();
      const props = [...resolveProperties([{ name: t.name, range: t.range }], this.index).values()];
      return md(
        `**${t.name}**  
\`${path}\`

${description ?? ""}

` + (props.length ? `Properties: ${props.map((p) => `\`${p.name}\``).join(", ")}` : ""),
        t.range
      );
    }
    if (t.kind === "property") {
      const own = r.a.props.find((p) => p.name === t.name);
      const base = r.inherited.get(t.name);
      const o = { ...base?.options ?? {}, ...own?.options ?? {} };
      const lines = [
        `**${t.name}**: \`${o.type ?? "?"}\`${o.required ? " \u2014 required" : ""}${o.deprecated ? " \u2014 deprecated" : ""}`,
        o.enum ? `enum: ${o.enum.map((v) => `\`${v}\``).join(", ")}` : "",
        o.default !== void 0 ? `default: \`${JSON.stringify(o.default)}\`` : "",
        typeof o.description === "string" ? o.description.trim() : "",
        base ? `_inherited from \`${base.file}\`_` : ""
      ];
      return md(lines.filter(Boolean).join("\n\n"), t.range);
    }
    return null;
  }
  definition(uri, pos) {
    const r = this.merged(uri);
    const t = r?.a.at(pos);
    if (!r || !t) return null;
    if (t.kind === "include") {
      const path = this.index.byName.get(t.name);
      return path ? location(path, 0, 0) : null;
    }
    if (t.kind === "property") {
      const base = r.inherited.get(t.name);
      if (!base) return null;
      const line = (0, import_node_fs10.readFileSync)(base.file, "utf8").split(/\r?\n/).findIndex((l) => new RegExp(`^\\s+${escape2(t.name)}:`).test(l));
      return location(base.file, Math.max(line, 0), 0);
    }
    return null;
  }
  /** `compatible:` -> every devicetree source that uses it. */
  references(uri, pos) {
    const r = this.analysis(uri);
    const t = r?.a.at(pos);
    if (!r || t?.kind !== "compatible" || !this.ws) return null;
    if (!this.compatibles) {
      const ws = this.ws;
      const outside = ws.zephyrBase && !ws.zephyrBase.startsWith(ws.topdir) ? [ws.zephyrBase] : [];
      this.compatibles = new CompatibleIndex([ws.topdir, ...outside]);
    }
    const t0 = Date.now();
    const stats = this.compatibles.refresh();
    log3(`references ${t.value}: ${stats.files} dts files, ${stats.reread} re-read, ${Date.now() - t0} ms`);
    return this.compatibles.find(t.value).map((u) => location(u.file, u.line, u.start, u.end));
  }
  completion(uri, pos) {
    const r = this.analysis(uri);
    if (!r) return null;
    const line = r.text.split(/\r?\n/)[pos.line] ?? "";
    const before = line.slice(0, pos.character);
    const indent = /^\s*/.exec(line)[0].length;
    const items = (labels, kind, suffix = "") => [...labels].map((label) => ({ label, kind, insertText: label + suffix }));
    if (/^\s*type:\s*\S*$/.test(before)) return items(this.rules.types, 12);
    if (/^\s*(-\s+|include:\s*|name:\s*)[\w.,-]*$/.test(before) && this.inInclude(r.text, pos.line)) {
      return items(this.index.byName.keys(), 17);
    }
    if (!/^\s*[\w#,.-]*$/.test(before)) return null;
    if (indent === 0) return items([...this.rules.topKeys, "include"], 10, ": ");
    if (indent >= 4 && this.inProperties(r.text, pos.line)) return items(this.rules.propKeys, 10, ": ");
    return null;
  }
  inInclude(text, line) {
    const lines = text.split(/\r?\n/);
    for (let i = line; i >= 0; i--) {
      const l = lines[i];
      if (/^include:/.test(l)) return true;
      if (/^\S/.test(l) && i !== line) return false;
    }
    return false;
  }
  inProperties(text, line) {
    const lines = text.split(/\r?\n/);
    for (let i = line - 1; i >= 0; i--) {
      if (/^\S/.test(lines[i])) return /^properties:/.test(lines[i]);
    }
    return false;
  }
};
var escape2 = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var md = (value, range) => ({ contents: { kind: "markdown", value }, range });
var location = (file, line, start, end = start) => ({
  uri: (0, import_node_url6.pathToFileURL)(file).href,
  range: { start: { line, character: start }, end: { line, character: end } }
});

// src/main.ts
function parseArgs(argv) {
  const i = argv.indexOf("--server");
  if (i < 0 || !argv[i + 1]) throw new Error("--server <path> is required");
  const server = argv[i + 1];
  const rest = argv.slice(i + 2).filter((a) => a !== "--stdio");
  return { server, args: [...rest, "--stdio"] };
}
if (process.argv.includes("--bindings")) {
  const server = new BindingsServer(new Peer(process.stdout, "zb-"));
  readMessages(process.stdin, (m) => server.handle(m));
} else {
  startProxy();
}
function startProxy() {
  const { server, args } = parseArgs(process.argv.slice(2));
  const isScript = /\.[cm]?js$/.test(server);
  const child = (0, import_node_child_process3.spawn)(isScript ? process.execPath : server, isScript ? [server, ...args] : args, {
    stdio: ["pipe", "pipe", "inherit"]
  });
  child.on("exit", (code) => process.exit(code ?? 1));
  process.stdin.on("end", () => child.kill());
  const proxy = new Proxy2(new Peer(process.stdout, "zc-"), new Peer(child.stdin, "zc-"));
  readMessages(process.stdin, (m) => proxy.fromZed(m));
  readMessages(child.stdout, (m) => proxy.fromServer(m));
}
