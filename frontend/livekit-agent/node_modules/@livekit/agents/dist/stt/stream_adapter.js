import { log } from "../log.js";
import { VADEventType } from "../vad.js";
import { STT, SpeechEventType, SpeechStream } from "./stt.js";
class StreamAdapter extends STT {
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
class StreamAdapterWrapper extends SpeechStream {
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
        if (input === SpeechStream.FLUSH_SENTINEL) {
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
          case VADEventType.START_OF_SPEECH:
            this.output.put({ type: SpeechEventType.START_OF_SPEECH });
            break;
          case VADEventType.END_OF_SPEECH:
            this.output.put({ type: SpeechEventType.END_OF_SPEECH });
            try {
              const event = await this.#stt.recognize(ev.frames);
              if (!event.alternatives[0].text) {
                continue;
              }
              this.output.put(event);
              break;
            } catch (error) {
              let logger = log();
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
export {
  StreamAdapter,
  StreamAdapterWrapper
};
//# sourceMappingURL=stream_adapter.js.map