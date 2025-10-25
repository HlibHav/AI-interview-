import { AsyncIterableQueue, shortuuid } from "../utils.js";
import { SentenceStream, WordStream } from "./tokenizer.js";
class BufferedTokenStream {
  queue = new AsyncIterableQueue();
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
    this.#currentSegmentId = shortuuid();
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
      this.#currentSegmentId = shortuuid();
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
class BufferedSentenceStream extends SentenceStream {
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
class BufferedWordStream extends WordStream {
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
export {
  BufferedSentenceStream,
  BufferedTokenStream,
  BufferedWordStream
};
//# sourceMappingURL=token_stream.js.map