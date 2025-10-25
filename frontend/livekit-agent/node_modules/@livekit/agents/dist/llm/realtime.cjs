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
var realtime_exports = {};
__export(realtime_exports, {
  RealtimeModel: () => RealtimeModel,
  RealtimeSession: () => RealtimeSession
});
module.exports = __toCommonJS(realtime_exports);
var import_events = require("events");
var import_deferred_stream = require("../stream/deferred_stream.cjs");
var import_utils = require("../utils.cjs");
class RealtimeModel {
  _capabilities;
  constructor(capabilities) {
    this._capabilities = capabilities;
  }
  get capabilities() {
    return this._capabilities;
  }
}
class RealtimeSession extends import_events.EventEmitter {
  _realtimeModel;
  deferredInputStream = new import_deferred_stream.DeferredReadableStream();
  _mainTask;
  constructor(realtimeModel) {
    super();
    this._realtimeModel = realtimeModel;
    this._mainTask = import_utils.Task.from((controller) => this._mainTaskImpl(controller.signal));
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RealtimeModel,
  RealtimeSession
});
//# sourceMappingURL=realtime.cjs.map