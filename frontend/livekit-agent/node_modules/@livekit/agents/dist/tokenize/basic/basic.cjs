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
var basic_exports = {};
__export(basic_exports, {
  SentenceTokenizer: () => SentenceTokenizer,
  WordTokenizer: () => WordTokenizer,
  hyphenateWord: () => hyphenateWord,
  splitWords: () => import_word.splitWords,
  tokenizeParagraphs: () => tokenizeParagraphs
});
module.exports = __toCommonJS(basic_exports);
var import_token_stream = require("../token_stream.cjs");
var tokenizer = __toESM(require("../tokenizer.cjs"), 1);
var import_hyphenator = require("./hyphenator.cjs");
var import_paragraph = require("./paragraph.cjs");
var import_sentence = require("./sentence.cjs");
var import_word = require("./word.cjs");
const defaultTokenizerOptions = {
  language: "en-US",
  minSentenceLength: 20,
  streamContextLength: 10,
  retainFormat: false
};
class SentenceTokenizer extends tokenizer.SentenceTokenizer {
  #config;
  constructor(options) {
    super();
    this.#config = {
      ...defaultTokenizerOptions,
      ...options
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(text, language) {
    return (0, import_sentence.splitSentences)(text, this.#config.minSentenceLength).map((tok) => tok[0]);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stream(language) {
    return new import_token_stream.BufferedSentenceStream(
      (text) => (0, import_sentence.splitSentences)(text, this.#config.minSentenceLength, this.#config.retainFormat),
      this.#config.minSentenceLength,
      this.#config.streamContextLength
    );
  }
}
class WordTokenizer extends tokenizer.WordTokenizer {
  #ignorePunctuation;
  constructor(ignorePunctuation = true) {
    super();
    this.#ignorePunctuation = ignorePunctuation;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(text, language) {
    return (0, import_word.splitWords)(text, this.#ignorePunctuation).map((tok) => tok[0]);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stream(language) {
    return new import_token_stream.BufferedWordStream(
      (text) => (0, import_word.splitWords)(text, this.#ignorePunctuation),
      1,
      1
    );
  }
}
const hyphenateWord = (word) => {
  return import_hyphenator.hyphenator.hyphenateWord(word);
};
const tokenizeParagraphs = (text) => {
  return (0, import_paragraph.splitParagraphs)(text).map((tok) => tok[0]);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SentenceTokenizer,
  WordTokenizer,
  hyphenateWord,
  splitWords,
  tokenizeParagraphs
});
//# sourceMappingURL=basic.cjs.map