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
var audio_exports = {};
__export(audio_exports, {
  AudioByteStream: () => AudioByteStream,
  calculateAudioDurationSeconds: () => calculateAudioDurationSeconds
});
module.exports = __toCommonJS(audio_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_log = require("./log.cjs");
function calculateAudioDurationSeconds(frame) {
  return Array.isArray(frame) ? frame.reduce((sum, a) => sum + a.samplesPerChannel / a.sampleRate, 0) : frame.samplesPerChannel / frame.sampleRate;
}
class AudioByteStream {
  #sampleRate;
  #numChannels;
  #bytesPerFrame;
  #buf;
  #logger = (0, import_log.log)();
  constructor(sampleRate, numChannels, samplesPerChannel = null) {
    this.#sampleRate = sampleRate;
    this.#numChannels = numChannels;
    if (samplesPerChannel === null) {
      samplesPerChannel = Math.floor(sampleRate / 10);
    }
    this.#bytesPerFrame = numChannels * samplesPerChannel * 2;
    this.#buf = new Int8Array();
  }
  write(data) {
    this.#buf = new Int8Array([...this.#buf, ...new Int8Array(data)]);
    const frames = [];
    while (this.#buf.length >= this.#bytesPerFrame) {
      const frameData = this.#buf.slice(0, this.#bytesPerFrame);
      this.#buf = this.#buf.slice(this.#bytesPerFrame);
      frames.push(
        new import_rtc_node.AudioFrame(
          new Int16Array(frameData.buffer),
          this.#sampleRate,
          this.#numChannels,
          frameData.length / 2
        )
      );
    }
    return frames;
  }
  flush() {
    if (this.#buf.length % (2 * this.#numChannels) !== 0) {
      this.#logger.warn("AudioByteStream: incomplete frame during flush, dropping");
      return [];
    }
    const frames = [
      new import_rtc_node.AudioFrame(
        new Int16Array(this.#buf.buffer),
        this.#sampleRate,
        this.#numChannels,
        this.#buf.length / 2
      )
    ];
    this.#buf = new Int8Array();
    return frames;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AudioByteStream,
  calculateAudioDurationSeconds
});
//# sourceMappingURL=audio.cjs.map