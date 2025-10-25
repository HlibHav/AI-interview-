import { AudioByteStream, shortuuid, tts } from "@livekit/agents";
import { OpenAI } from "openai";
const OPENAI_TTS_SAMPLE_RATE = 24e3;
const OPENAI_TTS_CHANNELS = 1;
const defaultTTSOptions = {
  apiKey: process.env.OPENAI_API_KEY,
  model: "tts-1",
  voice: "alloy",
  speed: 1
};
class TTS extends tts.TTS {
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
    this.#client = this.#opts.client || new OpenAI({
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
class ChunkedStream extends tts.ChunkedStream {
  label = "openai.ChunkedStream";
  stream;
  // set Promise<T> to any because OpenAI returns an annoying Response type
  constructor(tts2, text, stream) {
    super(text, tts2);
    this.stream = stream;
  }
  async run() {
    const buffer = await this.stream.then((r) => r.arrayBuffer());
    const requestId = shortuuid();
    const audioByteStream = new AudioByteStream(OPENAI_TTS_SAMPLE_RATE, OPENAI_TTS_CHANNELS);
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
export {
  ChunkedStream,
  TTS
};
//# sourceMappingURL=tts.js.map