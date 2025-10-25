import { type AudioBuffer, stt } from '@livekit/agents';
import { OpenAI } from 'openai';
import type { GroqAudioModels, WhisperModels } from './models.js';
export interface STTOptions {
    apiKey?: string;
    language: string;
    prompt?: string;
    detectLanguage: boolean;
    model: WhisperModels | string;
    baseURL?: string;
    client?: OpenAI;
}
export declare class STT extends stt.STT {
    #private;
    label: string;
    /**
     * Create a new instance of OpenAI STT.
     *
     * @remarks
     * `apiKey` must be set to your OpenAI API key, either using the argument or by setting the
     * `OPENAI_API_KEY` environment variable.
     */
    constructor(opts?: Partial<STTOptions>);
    /**
     * Create a new instance of Groq STT.
     *
     * @remarks
     * `apiKey` must be set to your Groq API key, either using the argument or by setting the
     * `GROQ_API_KEY` environment variable.
     */
    static withGroq(opts?: Partial<{
        model: string | GroqAudioModels;
        apiKey?: string;
        baseURL?: string;
        client: OpenAI;
        language: string;
        detectLanguage: boolean;
    }>): STT;
    _recognize(buffer: AudioBuffer, language?: string): Promise<stt.SpeechEvent>;
    /** This method throws an error; streaming is unsupported on OpenAI STT. */
    stream(): stt.SpeechStream;
}
//# sourceMappingURL=stt.d.ts.map