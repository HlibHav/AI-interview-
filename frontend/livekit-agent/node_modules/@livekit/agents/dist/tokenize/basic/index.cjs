"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var basic_exports = {};
__export(basic_exports, {
  SentenceTokenizer: () => import_basic.SentenceTokenizer,
  WordTokenizer: () => import_basic.WordTokenizer,
  hyphenateWord: () => import_basic.hyphenateWord,
  splitWords: () => import_basic.splitWords,
  tokenizeParagraphs: () => import_basic.tokenizeParagraphs
});
module.exports = __toCommonJS(basic_exports);
var import_basic = require("./basic.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SentenceTokenizer,
  WordTokenizer,
  hyphenateWord,
  splitWords,
  tokenizeParagraphs
});
//# sourceMappingURL=index.cjs.map