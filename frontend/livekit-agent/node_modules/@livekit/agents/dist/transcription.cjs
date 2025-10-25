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
var transcription_exports = {};
__export(transcription_exports, {
  TextAudioSynchronizer: () => TextAudioSynchronizer,
  defaultTextSyncOptions: () => defaultTextSyncOptions
});
module.exports = __toCommonJS(transcription_exports);
var import_protocol = require("@livekit/protocol");
var import_rtc_node = require("@livekit/rtc-node");
var import_node_events = require("node:events");
var import_tokenize = require("./tokenize/index.cjs");
var import_utils = require("./utils.cjs");
const STANDARD_SPEECH_RATE = 3830;
const defaultTextSyncOptions = {
  language: "",
  speed: 1,
  newSentenceDelay: 400,
  sentenceTokenizer: new import_tokenize.basic.SentenceTokenizer(),
  hyphenateWord: import_tokenize.basic.hyphenateWord,
  splitWords: import_tokenize.basic.splitWords
};
class TextAudioSynchronizer extends import_node_events.EventEmitter {
  #opts;
  #speed;
  #closed = false;
  #interrupted = false;
  #closeFut = new import_utils.Future();
  #playingSegIndex = -1;
  #finishedSegIndex = -1;
  #textQChanged = new import_utils.AsyncIterableQueue();
  #textQ = [];
  #audioQChanged = new import_utils.AsyncIterableQueue();
  #audioQ = [];
  #playedText = "";
  #task;
  #audioData;
  #textData;
  constructor(opts) {
    super();
    this.#opts = opts;
    this.#speed = opts.speed * STANDARD_SPEECH_RATE;
  }
  pushAudio(frame) {
    this.#checkNotClosed();
    if (!this.#audioData) {
      this.#audioData = { pushedDuration: 0, done: false };
      this.#audioQ.push(this.#audioData);
      this.#audioQChanged.put(1);
    }
    this.#audioData.pushedDuration += frame.samplesPerChannel / frame.sampleRate;
  }
  pushText(text) {
    this.#checkNotClosed();
    if (!this.#textData) {
      this.#textData = {
        sentenceStream: this.#opts.sentenceTokenizer.stream(),
        pushedText: "",
        done: false,
        forwardedHyphens: 0,
        forwardedSentences: 0
      };
      this.#textQ.push(this.#textData);
      this.#textQChanged.put(1);
    }
    this.#textData.pushedText += text;
    this.#textData.sentenceStream.pushText(text);
  }
  markAudioSegmentEnd() {
    this.#checkNotClosed();
    if (!this.#audioData) {
      this.pushAudio(new import_rtc_node.AudioFrame(new Int16Array(), 24e3, 1, 0));
    }
    this.#audioData.done = true;
    this.#audioData = void 0;
  }
  markTextSegmentEnd() {
    var _a, _b;
    this.#checkNotClosed();
    if (!this.#textData) {
      this.pushText("");
    }
    this.#textData.done = true;
    (_a = this.#textData) == null ? void 0 : _a.sentenceStream.flush();
    (_b = this.#textData) == null ? void 0 : _b.sentenceStream.close();
    this.#textData = void 0;
  }
  segmentPlayoutStarted() {
    this.#checkNotClosed();
    this.#playingSegIndex++;
    if (!this.#task) {
      this.#task = this.#mainLoop();
    }
  }
  segmentPlayoutFinished() {
    this.#checkNotClosed();
    this.#finishedSegIndex++;
  }
  get playedText() {
    return this.#playedText;
  }
  async close(interrupt) {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.#interrupted = interrupt;
    this.#closeFut.resolve();
    for (const textData of this.#textQ) {
      textData == null ? void 0 : textData.sentenceStream.close();
    }
    this.#textQ.push(void 0);
    this.#audioQ.push(void 0);
    this.#textQChanged.put(1);
    this.#audioQChanged.put(1);
    await this.#task;
  }
  async #mainLoop() {
    let segIndex = 0;
    let qDone = false;
    while (!qDone) {
      await this.#textQChanged.next();
      await this.#audioQChanged.next();
      while (this.#textQ.length && this.#audioQ.length) {
        const textData = this.#textQ.pop();
        const audioData = this.#audioQ.pop();
        if (!(textData && audioData)) {
          qDone = true;
          break;
        }
        while (!this.#closed) {
          if (this.#playingSegIndex >= segIndex) break;
          await this.#sleepIfNotClosed(125);
        }
        const sentenceStream = textData.sentenceStream;
        const forwardStartTime = Date.now();
        for await (const ev of sentenceStream) {
          await this.#syncSentence(segIndex, forwardStartTime, textData, audioData, ev.token);
        }
        segIndex++;
      }
    }
  }
  async #syncSentence(segIndex, segStartTime, textData, audioData, sentence) {
    let realSpeed;
    if (audioData.pushedDuration > 0 && audioData.done) {
      realSpeed = this.#calcHyphens(textData.pushedText).length / audioData.pushedDuration;
    }
    const segId = (0, import_utils.shortuuid)("SG_");
    const words = this.#opts.splitWords(sentence);
    const processedWords = [];
    const ogText = this.#playedText;
    for (const [word, _, end] of words) {
      if (segIndex <= this.#finishedSegIndex) break;
      if (this.#interrupted) return;
      const wordHyphens = this.#opts.hyphenateWord(word).length;
      processedWords.push(word);
      const elapsed = Date.now() - segStartTime;
      const text = sentence.slice(0, end);
      let speed = this.#speed;
      let delay;
      if (realSpeed) {
        speed = realSpeed;
        const estimatedPausesMs = textData.forwardedSentences * this.#opts.newSentenceDelay;
        const hyphPauses = estimatedPausesMs * speed;
        const targetHyphens = Math.round(speed * elapsed);
        const dt = targetHyphens - textData.forwardedHyphens - hyphPauses;
        const toWaitHyphens = Math.max(0, wordHyphens - dt);
        delay = toWaitHyphens / speed;
      } else {
        delay = wordHyphens / speed;
      }
      const firstDelay = Math.min(delay / 2, 2 / speed);
      await this.#sleepIfNotClosed(firstDelay * 1e6);
      this.emit(
        "textUpdated",
        new import_protocol.TranscriptionSegment({
          id: segId,
          text,
          startTime: BigInt(0),
          endTime: BigInt(0),
          final: false,
          language: this.#opts.language
        })
      );
      this.#playedText = `${ogText} ${text}`;
      await this.#sleepIfNotClosed((delay - firstDelay) * 1e6);
      textData.forwardedHyphens += wordHyphens;
    }
    this.emit(
      "textUpdated",
      new import_protocol.TranscriptionSegment({
        id: segId,
        text: sentence,
        startTime: BigInt(0),
        endTime: BigInt(0),
        final: true,
        language: this.#opts.language
      })
    );
    this.#playedText = `${ogText} ${sentence}`;
    await this.#sleepIfNotClosed(this.#opts.newSentenceDelay);
    textData.forwardedSentences++;
  }
  async #sleepIfNotClosed(delay) {
    await Promise.race([
      this.#closeFut.await,
      new Promise((resolve) => setTimeout(resolve, delay))
    ]);
  }
  #calcHyphens(text) {
    const hyphens = [];
    const words = this.#opts.splitWords(text);
    for (const word of words) {
      const n = this.#opts.hyphenateWord(word[0]);
      hyphens.push(...n);
    }
    return hyphens;
  }
  #checkNotClosed() {
    if (this.#closed) {
      throw new Error("TextAudioSynchronizer is closed");
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TextAudioSynchronizer,
  defaultTextSyncOptions
});
//# sourceMappingURL=transcription.cjs.map