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
var io_exports = {};
__export(io_exports, {
  AgentInput: () => AgentInput,
  AgentOutput: () => AgentOutput,
  AudioInput: () => AudioInput,
  AudioOutput: () => AudioOutput,
  TextOutput: () => TextOutput
});
module.exports = __toCommonJS(io_exports);
var import_node_events = require("node:events");
var import_log = require("../log.cjs");
var import_deferred_stream = require("../stream/deferred_stream.cjs");
var import_utils = require("../utils.cjs");
class AudioInput {
  deferredStream = new import_deferred_stream.DeferredReadableStream();
  get stream() {
    return this.deferredStream.stream;
  }
  onAttached() {
  }
  onDetached() {
  }
}
class AudioOutput extends import_node_events.EventEmitter {
  constructor(sampleRate, nextInChain) {
    super();
    this.sampleRate = sampleRate;
    this.nextInChain = nextInChain;
    if (this.nextInChain) {
      this.nextInChain.on(
        AudioOutput.EVENT_PLAYBACK_FINISHED,
        (ev) => this.onPlaybackFinished(ev)
      );
    }
  }
  static EVENT_PLAYBACK_FINISHED = "playbackFinished";
  playbackFinishedFuture = new import_utils.Future();
  _capturing = false;
  playbackFinishedCount = 0;
  playbackSegmentsCount = 0;
  lastPlaybackEvent = {
    playbackPosition: 0,
    interrupted: false
  };
  logger = (0, import_log.log)();
  /**
   * Capture an audio frame for playback, frames can be pushed faster than real-time
   */
  async captureFrame(_frame) {
    if (!this._capturing) {
      this._capturing = true;
      this.playbackSegmentsCount++;
    }
  }
  /**
   * Wait for the past audio segments to finish playing out.
   *
   * @returns The event that was emitted when the audio finished playing out (only the last segment information)
   */
  async waitForPlayout() {
    const target = this.playbackSegmentsCount;
    while (this.playbackFinishedCount < target) {
      await this.playbackFinishedFuture.await;
      this.playbackFinishedFuture = new import_utils.Future();
    }
    return this.lastPlaybackEvent;
  }
  /**
   * Developers building audio sinks must call this method when a playback/segment is finished.
   * Segments are segmented by calls to flush() or clearBuffer()
   */
  onPlaybackFinished(options) {
    if (this.playbackFinishedCount >= this.playbackSegmentsCount) {
      this.logger.warn("playback_finished called more times than playback segments were captured");
      return;
    }
    this.lastPlaybackEvent = options;
    this.playbackFinishedCount++;
    this.playbackFinishedFuture.resolve();
    this.emit(AudioOutput.EVENT_PLAYBACK_FINISHED, options);
  }
  flush() {
    this._capturing = false;
  }
  onAttached() {
    if (this.nextInChain) {
      this.nextInChain.onAttached();
    }
  }
  onDetached() {
    if (this.nextInChain) {
      this.nextInChain.onDetached();
    }
  }
}
class TextOutput {
  constructor(nextInChain) {
    this.nextInChain = nextInChain;
  }
  onAttached() {
    if (this.nextInChain) {
      this.nextInChain.onAttached();
    }
  }
  onDetached() {
    if (this.nextInChain) {
      this.nextInChain.onDetached();
    }
  }
}
class AgentInput {
  constructor(audioChanged) {
    this.audioChanged = audioChanged;
  }
  _audioStream = null;
  // enabled by default
  _audioEnabled = true;
  setAudioEnabled(enable) {
    if (enable === this._audioEnabled) {
      return;
    }
    this._audioEnabled = enable;
    if (!this._audioStream) {
      return;
    }
    if (enable) {
      this._audioStream.onAttached();
    } else {
      this._audioStream.onDetached();
    }
  }
  get audioEnabled() {
    return this._audioEnabled;
  }
  get audio() {
    return this._audioStream;
  }
  set audio(stream) {
    this._audioStream = stream;
    this.audioChanged();
  }
}
class AgentOutput {
  constructor(audioChanged, transcriptionChanged) {
    this.audioChanged = audioChanged;
    this.transcriptionChanged = transcriptionChanged;
  }
  _audioSink = null;
  _transcriptionSink = null;
  _audioEnabled = true;
  _transcriptionEnabled = true;
  setAudioEnabled(enabled) {
    if (enabled === this._audioEnabled) {
      return;
    }
    this._audioEnabled = enabled;
    if (!this._audioSink) {
      return;
    }
    if (enabled) {
      this._audioSink.onAttached();
    } else {
      this._audioSink.onDetached();
    }
  }
  setTranscriptionEnabled(enabled) {
    if (enabled === this._transcriptionEnabled) {
      return;
    }
    this._transcriptionEnabled = enabled;
    if (!this._transcriptionSink) {
      return;
    }
    if (enabled) {
      this._transcriptionSink.onAttached();
    } else {
      this._transcriptionSink.onDetached();
    }
  }
  get audioEnabled() {
    return this._audioEnabled;
  }
  get transcriptionEnabled() {
    return this._transcriptionEnabled;
  }
  get audio() {
    return this._audioSink;
  }
  set audio(sink) {
    if (sink === this._audioSink) {
      return;
    }
    if (this._audioSink) {
      this._audioSink.onDetached();
    }
    this._audioSink = sink;
    this.audioChanged();
    if (this._audioSink) {
      this._audioSink.onAttached();
    }
  }
  get transcription() {
    return this._transcriptionSink;
  }
  set transcription(sink) {
    if (sink === this._transcriptionSink) {
      return;
    }
    if (this._transcriptionSink) {
      this._transcriptionSink.onDetached();
    }
    this._transcriptionSink = sink;
    this.transcriptionChanged();
    if (this._transcriptionSink) {
      this._transcriptionSink.onAttached();
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentInput,
  AgentOutput,
  AudioInput,
  AudioOutput,
  TextOutput
});
//# sourceMappingURL=io.cjs.map