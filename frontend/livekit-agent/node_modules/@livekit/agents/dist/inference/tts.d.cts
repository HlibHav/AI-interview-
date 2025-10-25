import { WebSocket } from 'ws';
import { SynthesizeStream as BaseSynthesizeStream, TTS as BaseTTS, ChunkedStream } from '../tts/index.js';
import { type APIConnectOptions } from '../types.js';
import { type AnyString } from './utils.js';
export type CartesiaModels = 'cartesia' | 'cartesia/sonic' | 'cartesia/sonic-2' | 'cartesia/sonic-turbo';
export type ElevenlabsModels = 'elevenlabs' | 'elevenlabs/eleven_flash_v2' | 'elevenlabs/eleven_flash_v2_5' | 'elevenlabs/eleven_turbo_v2' | 'elevenlabs/eleven_turbo_v2_5' | 'elevenlabs/eleven_multilingual_v2';
export type RimeModels = 'rime' | 'rime/mist' | 'rime/mistv2' | 'rime/arcana';
export type InworldModels = 'inworld' | 'inworld/inworld-tts-1';
export interface CartesiaOptions {
    duration?: number;
    speed?: 'slow' | 'normal' | 'fast';
}
export interface ElevenlabsOptions {
    inactivity_timeout?: number;
    apply_text_normalization?: 'auto' | 'off' | 'on';
}
export interface RimeOptions {
}
export interface InworldOptions {
}
type _TTSModels = CartesiaModels | ElevenlabsModels | RimeModels | InworldModels;
export type TTSModels = CartesiaModels | ElevenlabsModels | RimeModels | InworldModels | AnyString;
export type ModelWithVoice = `${_TTSModels}:${string}` | TTSModels;
export type TTSOptions<TModel extends TTSModels> = TModel extends CartesiaModels ? CartesiaOptions : TModel extends ElevenlabsModels ? ElevenlabsOptions : TModel extends RimeOptions ? RimeOptions : TModel extends InworldOptions ? InworldOptions : Record<string, unknown>;
type TTSEncoding = 'pcm_s16le';
export interface InferenceTTSOptions<TModel extends TTSModels> {
    model?: TModel;
    voice?: string;
    language?: string;
    encoding: TTSEncoding;
    sampleRate: number;
    baseURL: string;
    apiKey: string;
    apiSecret: string;
    modelOptions: TTSOptions<TModel>;
}
/**
 * Livekit Cloud Inference TTS
 */
export declare class TTS<TModel extends TTSModels> extends BaseTTS {
    #private;
    private opts;
    private streams;
    constructor(opts: {
        model: TModel;
        voice?: string;
        language?: string;
        baseURL?: string;
        encoding?: TTSEncoding;
        sampleRate?: number;
        apiKey?: string;
        apiSecret?: string;
        modelOptions?: TTSOptions<TModel>;
    });
    get label(): string;
    static fromModelString(modelString: string): TTS<AnyString>;
    updateOptions(opts: Partial<Pick<InferenceTTSOptions<TModel>, 'model' | 'voice' | 'language'>>): void;
    synthesize(_: string): ChunkedStream;
    stream(options?: {
        connOptions?: APIConnectOptions;
    }): SynthesizeStream<TModel>;
    connectWs(timeout: number): Promise<WebSocket>;
    closeWs(ws: WebSocket): Promise<void>;
    close(): Promise<void>;
}
export declare class SynthesizeStream<TModel extends TTSModels> extends BaseSynthesizeStream {
    #private;
    private opts;
    private tts;
    private connOptions;
    constructor(tts: TTS<TModel>, opts: InferenceTTSOptions<TModel>, connOptions: APIConnectOptions);
    get label(): string;
    updateOptions(opts: Partial<Pick<InferenceTTSOptions<TModel>, 'model' | 'voice' | 'language'>>): void;
    protected run(): Promise<void>;
}
export {};
//# sourceMappingURL=tts.d.ts.map