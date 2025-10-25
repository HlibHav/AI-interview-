import type { AgentMetrics } from './base.js';
export interface UsageSummary {
    llmPromptTokens: number;
    llmPromptCachedTokens: number;
    llmCompletionTokens: number;
    ttsCharactersCount: number;
    sttAudioDurationMs: number;
}
export declare class UsageCollector {
    private summary;
    constructor();
    collect(metrics: AgentMetrics): void;
    getSummary(): UsageSummary;
}
//# sourceMappingURL=usage_collector.d.ts.map