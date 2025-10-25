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
var usage_collector_exports = {};
__export(usage_collector_exports, {
  UsageCollector: () => UsageCollector
});
module.exports = __toCommonJS(usage_collector_exports);
class UsageCollector {
  summary;
  constructor() {
    this.summary = {
      llmPromptTokens: 0,
      llmPromptCachedTokens: 0,
      llmCompletionTokens: 0,
      ttsCharactersCount: 0,
      sttAudioDurationMs: 0
    };
  }
  collect(metrics) {
    if (metrics.type === "llm_metrics") {
      this.summary.llmPromptTokens += metrics.promptTokens;
      this.summary.llmPromptCachedTokens += metrics.promptCachedTokens;
      this.summary.llmCompletionTokens += metrics.completionTokens;
    } else if (metrics.type === "realtime_model_metrics") {
      this.summary.llmPromptTokens += metrics.inputTokens;
      this.summary.llmPromptCachedTokens += metrics.inputTokenDetails.cachedTokens;
      this.summary.llmCompletionTokens += metrics.outputTokens;
    } else if (metrics.type === "tts_metrics") {
      this.summary.ttsCharactersCount += metrics.charactersCount;
    } else if (metrics.type === "stt_metrics") {
      this.summary.sttAudioDurationMs += metrics.audioDurationMs;
    }
  }
  getSummary() {
    return { ...this.summary };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  UsageCollector
});
//# sourceMappingURL=usage_collector.cjs.map