import { BufferedSentenceStream, BufferedWordStream } from "../token_stream.js";
import * as tokenizer from "../tokenizer.js";
import { hyphenator } from "./hyphenator.js";
import { splitParagraphs } from "./paragraph.js";
import { splitSentences } from "./sentence.js";
import { splitWords } from "./word.js";
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
    return splitSentences(text, this.#config.minSentenceLength).map((tok) => tok[0]);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stream(language) {
    return new BufferedSentenceStream(
      (text) => splitSentences(text, this.#config.minSentenceLength, this.#config.retainFormat),
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
    return splitWords(text, this.#ignorePunctuation).map((tok) => tok[0]);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stream(language) {
    return new BufferedWordStream(
      (text) => splitWords(text, this.#ignorePunctuation),
      1,
      1
    );
  }
}
const hyphenateWord = (word) => {
  return hyphenator.hyphenateWord(word);
};
const tokenizeParagraphs = (text) => {
  return splitParagraphs(text).map((tok) => tok[0]);
};
export {
  SentenceTokenizer,
  WordTokenizer,
  hyphenateWord,
  splitWords,
  tokenizeParagraphs
};
//# sourceMappingURL=basic.js.map