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
var inference_runner_exports = {};
__export(inference_runner_exports, {
  InferenceRunner: () => InferenceRunner
});
module.exports = __toCommonJS(inference_runner_exports);
class InferenceRunner {
  static registeredRunners = {};
  static registerRunner(method, importPath) {
    if (InferenceRunner.registeredRunners[method]) {
      throw new Error(`Inference runner ${method} already registered`);
    }
    InferenceRunner.registeredRunners[method] = importPath;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InferenceRunner
});
//# sourceMappingURL=inference_runner.cjs.map