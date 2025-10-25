import { AudioFrame } from "@livekit/rtc-node";
import { log } from "./log.js";
function calculateAudioDurationSeconds(frame) {
  return Array.isArray(frame) ? frame.reduce((sum, a) => sum + a.samplesPerChannel / a.sampleRate, 0) : frame.samplesPerChannel / frame.sampleRate;
}
class AudioByteStream {
  #sampleRate;
  #numChannels;
  #bytesPerFrame;
  #buf;
  #logger = log();
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
        new AudioFrame(
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
      new AudioFrame(
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
export {
  AudioByteStream,
  calculateAudioDurationSeconds
};
//# sourceMappingURL=audio.js.map