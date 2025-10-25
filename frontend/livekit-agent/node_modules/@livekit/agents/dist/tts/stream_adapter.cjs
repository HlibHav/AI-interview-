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
var stream_adapter_exports = {};
__export(stream_adapter_exports, {
  StreamAdapter: () => StreamAdapter,
  StreamAdapterWrapper: () => StreamAdapterWrapper
});
module.exports = __toCommonJS(stream_adapter_exports);
var import_utils = require("../utils.cjs");
var import_tts = require("./tts.cjs");
class StreamAdapter extends import_tts.TTS {
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
class StreamAdapterWrapper extends import_tts.SynthesizeStream {
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
        if (input === import_tts.SynthesizeStream.FLUSH_SENTINEL) {
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
        task = import_utils.Task.from(
          (controller) => synthesize(ev.token, task, controller),
          this.abortController
        );
        tokenCompletionTasks.push(task);
      }
      await Promise.all(tokenCompletionTasks.map((t) => t.result));
      this.queue.put(import_tts.SynthesizeStream.END_OF_STREAM);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StreamAdapter,
  StreamAdapterWrapper
});
//# sourceMappingURL=stream_adapter.cjs.map