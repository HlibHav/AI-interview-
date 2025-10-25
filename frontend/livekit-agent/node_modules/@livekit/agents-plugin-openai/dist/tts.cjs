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
var tts_exports = {};
__export(tts_exports, {
  ChunkedStream: () => ChunkedStream,
  TTS: () => TTS
});
module.exports = __toCommonJS(tts_exports);
var import_agents = require("@livekit/agents");
var import_openai = require("openai");
const OPENAI_TTS_SAMPLE_RATE = 24e3;
const OPENAI_TTS_CHANNELS = 1;
const defaultTTSOptions = {
  apiKey: process.env.OPENAI_API_KEY,
  model: "tts-1",
  voice: "alloy",
  speed: 1
};
class TTS extends import_agents.tts.TTS {
  #opts;
  #client;
  label = "openai.TTS";
  /**
   * Create a new instance of OpenAI TTS.
   *
   * @remarks
   * `apiKey` must be set to your OpenAI API key, either using the argument or by setting the
   * `OPENAI_API_KEY` environment variable.
   */
  constructor(opts = defaultTTSOptions) {
    super(OPENAI_TTS_SAMPLE_RATE, OPENAI_TTS_CHANNELS, { streaming: false });
    this.#opts = { ...defaultTTSOptions, ...opts };
    if (this.#opts.apiKey === void 0) {
      throw new Error("OpenAI API key is required, whether as an argument or as $OPENAI_API_KEY");
    }
    this.#client = this.#opts.client || new import_openai.OpenAI({
      baseURL: opts.baseURL,
      apiKey: opts.apiKey
    });
  }
  updateOptions(opts) {
    this.#opts = { ...this.#opts, ...opts };
  }
  synthesize(text) {
    return new ChunkedStream(
      this,
      text,
      this.#client.audio.speech.create({
        input: text,
        model: this.#opts.model,
        voice: this.#opts.voice,
        instructions: this.#opts.instructions,
        response_format: "pcm",
        speed: this.#opts.speed
      })
    );
  }
  stream() {
    throw new Error("Streaming is not supported on OpenAI TTS");
  }
}
class ChunkedStream extends import_agents.tts.ChunkedStream {
  label = "openai.ChunkedStream";
  stream;
  // set Promise<T> to any because OpenAI returns an annoying Response type
  constructor(tts2, text, stream) {
    super(text, tts2);
    this.stream = stream;
  }
  async run() {
    const buffer = await this.stream.then((r) => r.arrayBuffer());
    const requestId = (0, import_agents.shortuuid)();
    const audioByteStream = new import_agents.AudioByteStream(OPENAI_TTS_SAMPLE_RATE, OPENAI_TTS_CHANNELS);
    const frames = audioByteStream.write(buffer);
    let lastFrame;
    const sendLastFrame = (segmentId, final) => {
      if (lastFrame) {
        this.queue.put({ requestId, segmentId, frame: lastFrame, final });
        lastFrame = void 0;
      }
    };
    for (const frame of frames) {
      sendLastFrame(requestId, false);
      lastFrame = frame;
    }
    sendLastFrame(requestId, true);
    this.queue.close();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChunkedStream,
  TTS
});
//# sourceMappingURL=tts.cjs.map