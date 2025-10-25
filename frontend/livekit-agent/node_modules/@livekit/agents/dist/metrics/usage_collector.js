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
export {
  UsageCollector
};
//# sourceMappingURL=usage_collector.js.map