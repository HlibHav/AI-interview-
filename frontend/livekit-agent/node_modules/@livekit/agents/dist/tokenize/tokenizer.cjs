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
var tokenizer_exports = {};
__export(tokenizer_exports, {
  PUNCTUATIONS: () => PUNCTUATIONS,
  SentenceStream: () => SentenceStream,
  SentenceTokenizer: () => SentenceTokenizer,
  WordStream: () => WordStream,
  WordTokenizer: () => WordTokenizer
});
module.exports = __toCommonJS(tokenizer_exports);
var import_utils = require("../utils.cjs");
const PUNCTUATIONS = [
  "!",
  '"',
  "#",
  "$",
  "%",
  "&",
  "'",
  "(",
  ")",
  "*",
  "+",
  ",",
  "-",
  ".",
  "/",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "@",
  "[",
  "\\",
  "]",
  "^",
  "_",
  "`",
  "{",
  "|",
  "}",
  "~",
  "\xB1",
  "\u2014",
  "\u2018",
  "\u2019",
  "\u201C",
  "\u201D",
  "\u2026"
];
class SentenceTokenizer {
}
class SentenceStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  input = new import_utils.AsyncIterableQueue();
  queue = new import_utils.AsyncIterableQueue();
  #closed = false;
  get closed() {
    return this.#closed;
  }
  /** Push a string of text to the tokenizer */
  pushText(text) {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.#closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(text);
  }
  /** Flush the tokenizer, causing it to process all pending text */
  flush() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.#closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(SentenceStream.FLUSH_SENTINEL);
  }
  /** Mark the input as ended and forbid additional pushes */
  endInput() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.#closed) {
      throw new Error("Stream is closed");
    }
    this.input.close();
  }
  next() {
    return this.queue.next();
  }
  /** Close both the input and output of the tokenizer stream */
  close() {
    this.input.close();
    this.queue.close();
    this.#closed = true;
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
class WordTokenizer {
}
class WordStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  input = new import_utils.AsyncIterableQueue();
  queue = new import_utils.AsyncIterableQueue();
  #closed = false;
  get closed() {
    return this.#closed;
  }
  /** Push a string of text to the tokenizer */
  pushText(text) {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.#closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(text);
  }
  /** Flush the tokenizer, causing it to process all pending text */
  flush() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.#closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(WordStream.FLUSH_SENTINEL);
  }
  /** Mark the input as ended and forbid additional pushes */
  endInput() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.#closed) {
      throw new Error("Stream is closed");
    }
    this.input.close();
  }
  next() {
    return this.queue.next();
  }
  /** Close both the input and output of the tokenizer stream */
  close() {
    this.input.close();
    this.queue.close();
    this.#closed = true;
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PUNCTUATIONS,
  SentenceStream,
  SentenceTokenizer,
  WordStream,
  WordTokenizer
});
//# sourceMappingURL=tokenizer.cjs.map