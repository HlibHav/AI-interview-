import { Task } from "../utils.js";
import { SynthesizeStream, TTS } from "./tts.js";
class StreamAdapter extends TTS {
  #tts;
  #sentenceTokenizer;
  label;
  constructor(tts, sentenceTokenizer) {
    super(tts.sampleRate, tts.numChannels, { streaming: true });
    this.#tts = tts;
    this.#sentenceTokenizer = sentenceTokenizer;
    this.label = this.#tts.label;
    this.label = `tts.StreamAdapter<${this.#tts.label}>`;
    this.#tts.on("metrics_collected", (metrics) => {
      this.emit("metrics_collected", metrics);
    });
  }
  synthesize(text) {
    return this.#tts.synthesize(text);
  }
  stream() {
    return new StreamAdapterWrapper(this.#tts, this.#sentenceTokenizer);
  }
}
class StreamAdapterWrapper extends SynthesizeStream {
  #tts;
  #sentenceStream;
  label;
  constructor(tts, sentenceTokenizer) {
    super(tts);
    this.#tts = tts;
    this.#sentenceStream = sentenceTokenizer.stream();
    this.label = `tts.StreamAdapterWrapper<${this.#tts.label}>`;
  }
  async run() {
    const forwardInput = async () => {
      for await (const input of this.input) {
        if (this.abortController.signal.aborted) break;
        if (input === SynthesizeStream.FLUSH_SENTINEL) {
          this.#sentenceStream.flush();
        } else {
          this.#sentenceStream.pushText(input);
        }
      }
      this.#sentenceStream.endInput();
      this.#sentenceStream.close();
    };
    const synthesizeSentenceStream = async () => {
      let task;
      const tokenCompletionTasks = [];
      for await (const ev of this.#sentenceStream) {
        if (this.abortController.signal.aborted) break;
        task = Task.from(
          (controller) => synthesize(ev.token, task, controller),
          this.abortController
        );
        tokenCompletionTasks.push(task);
      }
      await Promise.all(tokenCompletionTasks.map((t) => t.result));
      this.queue.put(SynthesizeStream.END_OF_STREAM);
    };
    const synthesize = async (token, prevTask, controller) => {
      const audioStream = this.#tts.synthesize(token);
      await (prevTask == null ? void 0 : prevTask.result);
      if (controller.signal.aborted) return;
      for await (const audio of audioStream) {
        if (controller.signal.aborted) break;
        this.queue.put(audio);
      }
    };
    await Promise.all([forwardInput(), synthesizeSentenceStream()]);
  }
}
export {
  StreamAdapter,
  StreamAdapterWrapper
};
//# sourceMappingURL=stream_adapter.js.map