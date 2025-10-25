import { EventEmitter } from "events";
import { DeferredReadableStream } from "../stream/deferred_stream.js";
import { Task } from "../utils.js";
class RealtimeModel {
  _capabilities;
  constructor(capabilities) {
    this._capabilities = capabilities;
  }
  get capabilities() {
    return this._capabilities;
  }
}
class RealtimeSession extends EventEmitter {
  _realtimeModel;
  deferredInputStream = new DeferredReadableStream();
  _mainTask;
  constructor(realtimeModel) {
    super();
    this._realtimeModel = realtimeModel;
    this._mainTask = Task.from((controller) => this._mainTaskImpl(controller.signal));
  }
  get realtimeModel() {
    return this._realtimeModel;
  }
  async close() {
    this._mainTask.cancel();
  }
  /**
   * Notifies the model that user activity has started
   */
  startUserActivity() {
    return;
  }
  async _mainTaskImpl(signal) {
    const reader = this.deferredInputStream.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done || signal.aborted) {
        break;
      }
      this.pushAudio(value);
    }
  }
  setInputAudioStream(audioStream) {
    this.deferredInputStream.setSource(audioStream);
  }
}
export {
  RealtimeModel,
  RealtimeSession
};
//# sourceMappingURL=realtime.js.map