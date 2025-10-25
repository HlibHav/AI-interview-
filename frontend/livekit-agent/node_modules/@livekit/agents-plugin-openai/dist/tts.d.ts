import { tts } from '@livekit/agents';
import { OpenAI } from 'openai';
import type { TTSModels, TTSVoices } from './models.js';
export interface TTSOptions {
    model: TTSModels | string;
    voice: TTSVoices;
    speed: number;
    instructions?: string;
    baseURL?: string;
    client?: OpenAI;
    apiKey?: string;
}
export declare class TTS extends tts.TTS {
    #private;
    label: string;
    /**
     * Create a new instance of OpenAI TTS.
     *
     * @remarks
     * `apiKey` must be set to your OpenAI API key, either using the argument or by setting the
     * `OPENAI_API_KEY` environment variable.
     */
    constructor(opts?: Partial<TTSOptions>);
    updateOptions(opts: {
        model?: TTSModels | string;
        voice?: TTSVoices;
        speed?: number;
    }): void;
    synthesize(text: string): ChunkedStream;
    stream(): tts.SynthesizeStream;
}
export declare class ChunkedStream extends tts.ChunkedStream {
    label: string;
    private stream;
    constructor(tts: TTS, text: string, stream: Promise<any>);
    protected run(): Promise<void>;
}
//# sourceMappingURL=tts.d.ts.map