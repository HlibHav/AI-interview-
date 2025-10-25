import { AsyncIterableQueue } from "../utils.js";
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
  input = new AsyncIterableQueue();
  queue = new AsyncIterableQueue();
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
  input = new AsyncIterableQueue();
  queue = new AsyncIterableQueue();
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
export {
  PUNCTUATIONS,
  SentenceStream,
  SentenceTokenizer,
  WordStream,
  WordTokenizer
};
//# sourceMappingURL=tokenizer.js.map