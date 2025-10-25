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
var token_stream_exports = {};
__export(token_stream_exports, {
  BufferedSentenceStream: () => BufferedSentenceStream,
  BufferedTokenStream: () => BufferedTokenStream,
  BufferedWordStream: () => BufferedWordStream
});
module.exports = __toCommonJS(token_stream_exports);
var import_utils = require("../utils.cjs");
var import_tokenizer = require("./tokenizer.cjs");
class BufferedTokenStream {
  queue = new import_utils.AsyncIterableQueue();
  closed = false;
  #func;
  #minTokenLength;
  #minContextLength;
  #bufTokens = [];
  #inBuf = "";
  #outBuf = "";
  #currentSegmentId;
  constructor(func, minTokenLength, minContextLength) {
    this.#func = func;
    this.#minTokenLength = minTokenLength;
    this.#minContextLength = minContextLength;
    this.#currentSegmentId = (0, import_utils.shortuuid)();
  }
  /** Push a string of text into the token stream */
  pushText(text) {
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.#inBuf += text;
    if (this.#inBuf.length < this.#minContextLength) return;
    while (true) {
      const tokens = this.#func(this.#inBuf);
      if (tokens.length <= 1) break;
      if (this.#outBuf) this.#outBuf += " ";
      const tok = tokens.shift();
      let tokText;
      if (Array.isArray(tok)) {
        tokText = tok[0];
      } else {
        tokText = tok;
      }
      this.#outBuf += tokText;
      if (this.#outBuf.length >= this.#minTokenLength) {
        this.queue.put({ token: this.#outBuf, segmentId: this.#currentSegmentId });
        this.#outBuf = "";
      }
      if (typeof tok !== "string") {
        this.#inBuf = this.#inBuf.slice(tok[2]);
      } else {
        this.#inBuf = this.#inBuf.slice(Math.max(0, this.#inBuf.indexOf(tok)) + tok.length).trimStart();
      }
    }
  }
  /** Flush the stream, causing it to process all pending text */
  flush() {
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    if (this.#inBuf || this.#outBuf) {
      const tokens = this.#func(this.#inBuf);
      if (tokens) {
        if (this.#outBuf) this.#outBuf += " ";
        if (Array.isArray(tokens[0])) {
          this.#outBuf += tokens.map((tok) => tok[0]).join(" ");
        } else {
          this.#outBuf += tokens.join(" ");
        }
      }
      if (this.#outBuf) {
        this.queue.put({ token: this.#outBuf, segmentId: this.#currentSegmentId });
      }
      this.#currentSegmentId = (0, import_utils.shortuuid)();
    }
    this.#inBuf = "";
    this.#outBuf = "";
  }
  /** Mark the input as ended and forbid additional pushes */
  endInput() {
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.flush();
    this.close();
  }
  next() {
    return this.queue.next();
  }
  /** Close both the input and output of the token stream */
  close() {
    this.queue.close();
    this.closed = true;
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
class BufferedSentenceStream extends import_tokenizer.SentenceStream {
  #stream;
  constructor(func, minTokenLength, minContextLength) {
    super();
    this.#stream = new BufferedTokenStream(func, minTokenLength, minContextLength);
  }
  pushText(text) {
    this.#stream.pushText(text);
  }
  flush() {
    this.#stream.flush();
  }
  close() {
    super.close();
    this.#stream.close();
  }
  endInput() {
    this.#stream.endInput();
  }
  next() {
    return this.#stream.next();
  }
}
class BufferedWordStream extends import_tokenizer.WordStream {
  #stream;
  constructor(func, minTokenLength, minContextLength) {
    super();
    this.#stream = new BufferedTokenStream(func, minTokenLength, minContextLength);
  }
  pushText(text) {
    this.#stream.pushText(text);
  }
  flush() {
    this.#stream.flush();
  }
  endInput() {
    this.#stream.endInput();
  }
  close() {
    this.#stream.close();
  }
  next() {
    return this.#stream.next();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BufferedSentenceStream,
  BufferedTokenStream,
  BufferedWordStream
});
//# sourceMappingURL=token_stream.cjs.map