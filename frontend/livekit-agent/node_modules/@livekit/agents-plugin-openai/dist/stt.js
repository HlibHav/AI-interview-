import { mergeFrames, stt } from "@livekit/agents";
import { OpenAI } from "openai";
const defaultSTTOptions = {
  apiKey: process.env.OPENAI_API_KEY,
  language: "en",
  detectLanguage: false,
  model: "whisper-1"
};
class STT extends stt.STT {
  #opts;
  #client;
  label = "openai.STT";
  /**
   * Create a new instance of OpenAI STT.
   *
   * @remarks
   * `apiKey` must be set to your OpenAI API key, either using the argument or by setting the
   * `OPENAI_API_KEY` environment variable.
   */
  constructor(opts = defaultSTTOptions) {
    super({ streaming: false, interimResults: false });
    this.#opts = { ...defaultSTTOptions, ...opts };
    if (this.#opts.apiKey === void 0) {
      throw new Error("OpenAI API key is required, whether as an argument or as $OPENAI_API_KEY");
    }
    this.#client = this.#opts.client || new OpenAI({
      baseURL: opts.baseURL,
      apiKey: opts.apiKey
    });
  }
  /**
   * Create a new instance of Groq STT.
   *
   * @remarks
   * `apiKey` must be set to your Groq API key, either using the argument or by setting the
   * `GROQ_API_KEY` environment variable.
   */
  static withGroq(opts = {}) {
    opts.apiKey = opts.apiKey || process.env.GROQ_API_KEY;
    if (opts.apiKey === void 0) {
      throw new Error("Groq API key is required, whether as an argument or as $GROQ_API_KEY");
    }
    return new STT({
      model: "whisper-large-v3-turbo",
      baseURL: "https://api.groq.com/openai/v1",
      ...opts
    });
  }
  #sanitizeOptions(language) {
    if (language) {
      return { ...this.#opts, language };
    } else {
      return this.#opts;
    }
  }
  #createWav(frame) {
    const bitsPerSample = 16;
    const byteRate = frame.sampleRate * frame.channels * bitsPerSample / 8;
    const blockAlign = frame.channels * bitsPerSample / 8;
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + frame.data.byteLength, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(frame.channels, 22);
    header.writeUInt32LE(frame.sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(frame.data.byteLength, 40);
    return Buffer.concat([header, Buffer.from(frame.data.buffer)]);
  }
  async _recognize(buffer, language) {
    const config = this.#sanitizeOptions(language);
    buffer = mergeFrames(buffer);
    const file = new File([this.#createWav(buffer)], "audio.wav", { type: "audio/wav" });
    const resp = await this.#client.audio.transcriptions.create({
      file,
      model: this.#opts.model,
      language: config.language,
      prompt: config.prompt,
      response_format: "json"
    });
    return {
      type: stt.SpeechEventType.FINAL_TRANSCRIPT,
      alternatives: [
        {
          text: resp.text || "",
          language: language || "",
          startTime: 0,
          endTime: 0,
          confidence: 0
        }
      ]
    };
  }
  /** This method throws an error; streaming is unsupported on OpenAI STT. */
  stream() {
    throw new Error("Streaming is not supported on OpenAI STT");
  }
}
export {
  STT
};
//# sourceMappingURL=stt.js.map