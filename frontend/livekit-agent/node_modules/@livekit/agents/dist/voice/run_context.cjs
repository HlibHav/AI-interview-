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
var run_context_exports = {};
__export(run_context_exports, {
  RunContext: () => RunContext
});
module.exports = __toCommonJS(run_context_exports);
class RunContext {
  constructor(session, speechHandle, functionCall) {
    this.session = session;
    this.speechHandle = speechHandle;
    this.functionCall = functionCall;
    this.initialStepIdx = speechHandle.numSteps - 1;
  }
  initialStepIdx;
  get userData() {
    return this.session.userData;
  }
  /**
   * Waits for the speech playout corresponding to this function call step.
   *
   * Unlike {@link SpeechHandle.waitForPlayout}, which waits for the full
   * assistant turn to complete (including all function tools),
   * this method only waits for the assistant's spoken response prior to running
   * this tool to finish playing.
   */
  async waitForPlayout() {
    return this.speechHandle._waitForGeneration(this.initialStepIdx);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RunContext
});
//# sourceMappingURL=run_context.cjs.map