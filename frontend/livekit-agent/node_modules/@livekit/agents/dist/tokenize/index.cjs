"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var tokenize_exports = {};
__export(tokenize_exports, {
  BufferedSentenceStream: () => import_token_stream.BufferedSentenceStream,
  BufferedTokenStream: () => import_token_stream.BufferedTokenStream,
  BufferedWordStream: () => import_token_stream.BufferedWordStream,
  SentenceStream: () => import_tokenizer.SentenceStream,
  SentenceTokenizer: () => import_tokenizer.SentenceTokenizer,
  WordStream: () => import_tokenizer.WordStream,
  WordTokenizer: () => import_tokenizer.WordTokenizer,
  basic: () => basic
});
module.exports = __toCommonJS(tokenize_exports);
var basic = __toESM(require("./basic/index.cjs"), 1);
var import_tokenizer = require("./tokenizer.cjs");
var import_token_stream = require("./token_stream.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BufferedSentenceStream,
  BufferedTokenStream,
  BufferedWordStream,
  SentenceStream,
  SentenceTokenizer,
  WordStream,
  WordTokenizer,
  basic
});
//# sourceMappingURL=index.cjs.map