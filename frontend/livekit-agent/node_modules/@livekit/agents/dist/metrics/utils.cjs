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
var utils_exports = {};
__export(utils_exports, {
  logMetrics: () => logMetrics
});
module.exports = __toCommonJS(utils_exports);
var import_log = require("../log.cjs");
function roundTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}
const logMetrics = (metrics) => {
  const logger = (0, import_log.log)();
  if (metrics.type === "llm_metrics") {
    logger.child({
      ttftMs: roundTwoDecimals(metrics.ttftMs),
      inputTokens: metrics.promptTokens,
      promptCachedTokens: metrics.promptCachedTokens,
      outputTokens: metrics.completionTokens,
      tokensPerSecond: roundTwoDecimals(metrics.tokensPerSecond)
    }).info("LLM metrics");
  } else if (metrics.type === "realtime_model_metrics") {
    logger.child({
      ttftMs: roundTwoDecimals(metrics.ttftMs),
      input_tokens: metrics.inputTokens,
      cached_input_tokens: metrics.inputTokenDetails.cachedTokens,
      output_tokens: metrics.outputTokens,
      total_tokens: metrics.totalTokens,
      tokens_per_second: roundTwoDecimals(metrics.tokensPerSecond)
    }).info("RealtimeModel metrics");
  } else if (metrics.type === "tts_metrics") {
    logger.child({
      ttfbMs: roundTwoDecimals(metrics.ttfbMs),
      audioDurationMs: Math.round(metrics.audioDurationMs)
    }).info("TTS metrics");
  } else if (metrics.type === "eou_metrics") {
    logger.child({
      endOfUtteranceDelayMs: roundTwoDecimals(metrics.endOfUtteranceDelayMs),
      transcriptionDelayMs: roundTwoDecimals(metrics.transcriptionDelayMs),
      onUserTurnCompletedDelayMs: roundTwoDecimals(metrics.onUserTurnCompletedDelayMs)
    }).info("EOU metrics");
  } else if (metrics.type === "vad_metrics") {
    logger.child({
      idleTimeMs: Math.round(metrics.idleTimeMs),
      inferenceDurationTotalMs: Math.round(metrics.inferenceDurationTotalMs),
      inferenceCount: metrics.inferenceCount
    }).info("VAD metrics");
  } else if (metrics.type === "stt_metrics") {
    logger.child({
      audioDurationMs: Math.round(metrics.audioDurationMs)
    }).info("STT metrics");
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  logMetrics
});
//# sourceMappingURL=utils.cjs.map