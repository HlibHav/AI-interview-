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
var synchronizer_exports = {};
__export(synchronizer_exports, {
  TranscriptionSynchronizer: () => TranscriptionSynchronizer,
  defaultTextSyncOptions: () => defaultTextSyncOptions
});
module.exports = __toCommonJS(synchronizer_exports);
var import_log = require("../../log.cjs");
var import_identity_transform = require("../../stream/identity_transform.cjs");
var import_tokenize = require("../../tokenize/index.cjs");
var import_utils = require("../../utils.cjs");
var import_io = require("../io.cjs");
const STANDARD_SPEECH_RATE = 3.83;
class SegmentSynchronizerImpl {
  constructor(options, nextInChain) {
    this.options = options;
    this.nextInChain = nextInChain;
    this.speed = options.speed * STANDARD_SPEECH_RATE;
    this.textData = {
      sentenceStream: options.sentenceTokenizer.stream(),
      pushedText: "",
      done: false,
      forwardedHyphens: 0,
      forwardedText: ""
    };
    this.audioData = {
      pushedDuration: 0,
      done: false
    };
    this.outputStream = new import_identity_transform.IdentityTransform();
    this.outputStreamWriter = this.outputStream.writable.getWriter();
    this.mainTask().then(() => {
      this.outputStreamWriter.close();
    }).catch((error) => {
      this.logger.error({ error }, "mainTask SegmentSynchronizerImpl");
    });
    this.captureTask = this.captureTaskImpl();
  }
  textData;
  audioData;
  speed;
  outputStream;
  outputStreamWriter;
  captureTask;
  startWallTime;
  startFuture = new import_utils.Future();
  closedFuture = new import_utils.Future();
  playbackCompleted = false;
  logger = (0, import_log.log)();
  get closed() {
    return this.closedFuture.done;
  }
  get audioInputEnded() {
    return this.audioData.done;
  }
  get textInputEnded() {
    return this.textData.done;
  }
  get readable() {
    return this.outputStream.readable;
  }
  pushAudio(frame) {
    if (this.closed) {
      this.logger.warn("SegmentSynchronizerImpl.pushAudio called after close");
      return;
    }
    const frameDuration = frame.samplesPerChannel / frame.sampleRate;
    if (!this.startWallTime && frameDuration > 0) {
      this.startWallTime = Date.now();
      this.startFuture.resolve();
    }
    this.audioData.pushedDuration += frameDuration;
  }
  endAudioInput() {
    if (this.closed) {
      this.logger.warn("SegmentSynchronizerImpl.endAudioInput called after close");
      return;
    }
    this.audioData.done = true;
  }
  pushText(text) {
    if (this.closed) {
      this.logger.warn("SegmentSynchronizerImpl.pushText called after close");
      return;
    }
    this.textData.sentenceStream.pushText(text);
    this.textData.pushedText += text;
  }
  endTextInput() {
    if (this.closed) {
      this.logger.warn("SegmentSynchronizerImpl.endTextInput called after close");
      return;
    }
    this.textData.done = true;
    this.textData.sentenceStream.endInput();
  }
  markPlaybackFinished(_playbackPosition, interrupted) {
    if (this.closed) {
      this.logger.warn("SegmentSynchronizerImpl.markPlaybackFinished called after close");
      return;
    }
    if (!this.textData.done || !this.audioData.done) {
      this.logger.warn(
        { textDone: this.textData.done, audioDone: this.audioData.done },
        "SegmentSynchronizerImpl.markPlaybackFinished called before text/audio input is done"
      );
      return;
    }
    if (!interrupted) {
      this.playbackCompleted = true;
    }
  }
  get synchronizedTranscript() {
    if (this.playbackCompleted) {
      return this.textData.pushedText;
    }
    return this.textData.forwardedText;
  }
  async captureTaskImpl() {
    const reader = this.outputStream.readable.getReader();
    while (true) {
      const { done, value: text } = await reader.read();
      if (done) {
        break;
      }
      this.textData.forwardedText += text;
      await this.nextInChain.captureText(text);
    }
    reader.releaseLock();
    this.nextInChain.flush();
  }
  async mainTask() {
    await this.startFuture.await;
    if (this.closed && !this.playbackCompleted) {
      return;
    }
    if (!this.startWallTime) {
      throw new Error("startWallTime is not set when starting SegmentSynchronizerImpl.mainTask");
    }
    for await (const textSegment of this.textData.sentenceStream) {
      const sentence = textSegment.token;
      let textCursor = 0;
      if (this.closed && !this.playbackCompleted) {
        return;
      }
      for (const [word, _, endPos] of this.options.splitWords(sentence)) {
        if (this.closed && !this.playbackCompleted) {
          return;
        }
        if (this.playbackCompleted) {
          this.outputStreamWriter.write(sentence.slice(textCursor, endPos));
          textCursor = endPos;
          continue;
        }
        const wordHphens = this.options.hyphenateWord(word).length;
        const elapsedSeconds = (Date.now() - this.startWallTime) / 1e3;
        const targetHyphens = elapsedSeconds * this.options.speed;
        const hyphensBehind = Math.max(0, targetHyphens - this.textData.forwardedHyphens);
        let delay2 = Math.max(0, wordHphens - hyphensBehind) / this.speed;
        if (this.playbackCompleted) {
          delay2 = 0;
        }
        await this.sleepIfNotClosed(delay2 / 2);
        this.outputStreamWriter.write(sentence.slice(textCursor, endPos));
        await this.sleepIfNotClosed(delay2 / 2);
        this.textData.forwardedHyphens += wordHphens;
        textCursor = endPos;
      }
      if (textCursor < sentence.length) {
        const remaining = sentence.slice(textCursor);
        this.outputStreamWriter.write(remaining);
      }
    }
  }
  async sleepIfNotClosed(sleepTimeSeconds) {
    if (this.closed) {
      return;
    }
    await (0, import_utils.delay)(sleepTimeSeconds * 1e3);
  }
  async close() {
    if (this.closed) {
      return;
    }
    this.closedFuture.resolve();
    this.startFuture.resolve();
    this.textData.sentenceStream.close();
    await this.captureTask;
  }
}
const defaultTextSyncOptions = {
  speed: 1,
  hyphenateWord: import_tokenize.basic.hyphenateWord,
  splitWords: import_tokenize.basic.splitWords,
  sentenceTokenizer: new import_tokenize.basic.SentenceTokenizer({
    retainFormat: true
  })
};
class TranscriptionSynchronizer {
  audioOutput;
  textOutput;
  options;
  rotateSegmentTask;
  _enabled = true;
  closed = false;
  /** @internal */
  _impl;
  logger = (0, import_log.log)();
  constructor(nextInChainAudio, nextInChainText, options = defaultTextSyncOptions) {
    this.audioOutput = new SyncedAudioOutput(this, nextInChainAudio);
    this.textOutput = new SyncedTextOutput(this, nextInChainText);
    this.options = {
      speed: options.speed,
      hyphenateWord: options.hyphenateWord,
      splitWords: options.splitWords,
      sentenceTokenizer: options.sentenceTokenizer
    };
    this._impl = new SegmentSynchronizerImpl(this.options, nextInChainText);
    this.rotateSegmentTask = import_utils.Task.from(
      (controller) => this.rotateSegmentTaskImpl(controller.signal)
    );
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(enabled) {
    if (this._enabled === enabled) {
      return;
    }
    this._enabled = enabled;
    this.rotateSegment();
  }
  rotateSegment() {
    if (this.closed) {
      return;
    }
    if (!this.rotateSegmentTask.done) {
      this.logger.warn("rotateSegment called while previous segment is still being rotated");
    }
    this.rotateSegmentTask = import_utils.Task.from(
      (controller) => this.rotateSegmentTaskImpl(controller.signal, this.rotateSegmentTask)
    );
  }
  async close() {
    this.closed = true;
    await this.rotateSegmentTask.cancelAndWait();
    await this._impl.close();
  }
  async barrier() {
    if (this.rotateSegmentTask.done) {
      return;
    }
    await this.rotateSegmentTask.result;
  }
  async rotateSegmentTaskImpl(abort, oldTask) {
    if (oldTask) {
      await oldTask.result;
    }
    if (abort.aborted) {
      return;
    }
    await this._impl.close();
    this._impl = new SegmentSynchronizerImpl(this.options, this.textOutput.nextInChain);
  }
}
class SyncedAudioOutput extends import_io.AudioOutput {
  constructor(synchronizer, nextInChainAudio) {
    super(nextInChainAudio.sampleRate, nextInChainAudio);
    this.synchronizer = synchronizer;
    this.nextInChainAudio = nextInChainAudio;
  }
  pushedDuration = 0;
  async captureFrame(frame) {
    await this.synchronizer.barrier();
    await super.captureFrame(frame);
    await this.nextInChainAudio.captureFrame(frame);
    this.pushedDuration += frame.samplesPerChannel / frame.sampleRate;
    if (!this.synchronizer.enabled) {
      return;
    }
    if (this.synchronizer._impl.audioInputEnded) {
      this.logger.warn(
        "SegmentSynchronizerImpl audio marked as ended in capture audio, rotating segment"
      );
      this.synchronizer.rotateSegment();
      await this.synchronizer.barrier();
    }
    this.synchronizer._impl.pushAudio(frame);
  }
  flush() {
    super.flush();
    this.nextInChainAudio.flush();
    if (!this.synchronizer.enabled) {
      return;
    }
    if (!this.pushedDuration) {
      this.synchronizer.rotateSegment();
      return;
    }
    this.synchronizer._impl.endAudioInput();
  }
  clearBuffer() {
    this.nextInChainAudio.clearBuffer();
  }
  // this is going to be automatically called by the next_in_chain
  onPlaybackFinished(ev) {
    if (!this.synchronizer.enabled) {
      super.onPlaybackFinished(ev);
      return;
    }
    this.synchronizer._impl.markPlaybackFinished(ev.playbackPosition, ev.interrupted);
    super.onPlaybackFinished({
      playbackPosition: ev.playbackPosition,
      interrupted: ev.interrupted,
      synchronizedTranscript: this.synchronizer._impl.synchronizedTranscript
    });
    this.synchronizer.rotateSegment();
    this.pushedDuration = 0;
  }
}
class SyncedTextOutput extends import_io.TextOutput {
  constructor(synchronizer, nextInChain) {
    super(nextInChain);
    this.synchronizer = synchronizer;
    this.nextInChain = nextInChain;
  }
  capturing = false;
  logger = (0, import_log.log)();
  async captureText(text) {
    await this.synchronizer.barrier();
    if (!this.synchronizer.enabled) {
      await this.nextInChain.captureText(text);
      return;
    }
    this.capturing = true;
    if (this.synchronizer._impl.textInputEnded) {
      this.logger.warn(
        "SegmentSynchronizerImpl text marked as ended in capture text, rotating segment"
      );
      this.synchronizer.rotateSegment();
      await this.synchronizer.barrier();
    }
    this.synchronizer._impl.pushText(text);
  }
  flush() {
    if (!this.synchronizer.enabled) {
      this.nextInChain.flush();
      return;
    }
    if (!this.capturing) {
      return;
    }
    this.capturing = false;
    this.synchronizer._impl.endTextInput();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TranscriptionSynchronizer,
  defaultTextSyncOptions
});
//# sourceMappingURL=synchronizer.cjs.map