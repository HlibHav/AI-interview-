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
var import_log = require("../log.cjs");
var import_vad = require("../vad.cjs");
var import_stt = require("./stt.cjs");
class StreamAdapter extends import_stt.STT {
  #stt;
  #vad;
  label;
  constructor(stt, vad) {
    super({ streaming: true, interimResults: false });
    this.#stt = stt;
    this.#vad = vad;
    this.label = `stt.StreamAdapter<${this.#stt.label}>`;
    this.#stt.on("metrics_collected", (metrics) => {
      this.emit("metrics_collected", metrics);
    });
  }
  _recognize(frame) {
    return this.#stt.recognize(frame);
  }
  stream() {
    return new StreamAdapterWrapper(this.#stt, this.#vad);
  }
}
class StreamAdapterWrapper extends import_stt.SpeechStream {
  #stt;
  #vadStream;
  label;
  constructor(stt, vad) {
    super(stt);
    this.#stt = stt;
    this.#vadStream = vad.stream();
    this.label = `stt.StreamAdapterWrapper<${this.#stt.label}>`;
  }
  async monitorMetrics() {
    return;
  }
  async run() {
    const forwardInput = async () => {
      for await (const input of this.input) {
        if (input === import_stt.SpeechStream.FLUSH_SENTINEL) {
          this.#vadStream.flush();
        } else {
          this.#vadStream.pushFrame(input);
        }
      }
      this.#vadStream.endInput();
    };
    const recognize = async () => {
      for await (const ev of this.#vadStream) {
        switch (ev.type) {
          case import_vad.VADEventType.START_OF_SPEECH:
            this.output.put({ type: import_stt.SpeechEventType.START_OF_SPEECH });
            break;
          case import_vad.VADEventType.END_OF_SPEECH:
            this.output.put({ type: import_stt.SpeechEventType.END_OF_SPEECH });
            try {
              const event = await this.#stt.recognize(ev.frames);
              if (!event.alternatives[0].text) {
                continue;
              }
              this.output.put(event);
              break;
            } catch (error) {
              let logger = (0, import_log.log)();
              if (error instanceof Error) {
                logger = logger.child({ error: error.message });
              } else {
                logger = logger.child({ error });
              }
              logger.error(`${this.label}: provider recognize task failed`);
              continue;
            }
        }
      }
    };
    Promise.all([forwardInput(), recognize()]);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StreamAdapter,
  StreamAdapterWrapper
});
//# sourceMappingURL=stream_adapter.cjs.map