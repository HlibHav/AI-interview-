import { STT as BaseSTT, SpeechStream as BaseSpeechStream, type SpeechEvent } from '../stt/index.js';
import { type APIConnectOptions } from '../types.js';
import { type AudioBuffer } from '../utils.js';
import { type AnyString } from './utils.js';
export type DeepgramModels = 'deepgram' | 'deepgram/nova-3' | 'deepgram/nova-3-general' | 'deepgram/nova-3-medical' | 'deepgram/nova-2-conversationalai' | 'deepgram/nova-2' | 'deepgram/nova-2-general' | 'deepgram/nova-2-medical' | 'deepgram/nova-2-phonecall';
export type CartesiaModels = 'cartesia' | 'cartesia/ink-whisper';
export type AssemblyaiModels = 'assemblyai' | 'assemblyai/universal-streaming';
export interface CartesiaOptions {
    min_volume?: number;
    max_silence_duration_secs?: number;
}
export interface DeepgramOptions {
    filler_words?: boolean;
    interim_results?: boolean;
    endpointing?: number;
    punctuate?: boolean;
    smart_format?: boolean;
    keywords?: Array<[string, number]>;
    keyterms?: string[];
    profanity_filter?: boolean;
    numerals?: boolean;
    mip_opt_out?: boolean;
}
export interface AssemblyAIOptions {
    format_turns?: boolean;
    end_of_turn_confidence_threshold?: number;
    min_end_of_turn_silence_when_confident?: number;
    max_turn_silence?: number;
    keyterms_prompt?: string[];
}
export type STTLanguages = 'multi' | 'en' | 'de' | 'es' | 'fr' | 'ja' | 'pt' | 'zh' | 'hi' | AnyString;
type _STTModels = DeepgramModels | CartesiaModels | AssemblyaiModels;
export type STTModels = _STTModels | 'auto' | AnyString;
export type ModelWithLanguage = `${_STTModels}:${STTLanguages}` | STTModels;
export type STTOptions<TModel extends STTModels> = TModel extends DeepgramModels ? DeepgramOptions : TModel extends CartesiaModels ? CartesiaOptions : TModel extends AssemblyaiModels ? AssemblyAIOptions : Record<string, unknown>;
export type STTEncoding = 'pcm_s16le';
export interface InferenceSTTOptions<TModel extends STTModels> {
    model?: TModel;
    language?: STTLanguages;
    encoding: STTEncoding;
    sampleRate: number;
    baseURL: string;
    apiKey: string;
    apiSecret: string;
    modelOptions: STTOptions<TModel>;
}
/**
 * Livekit Cloud Inference STT
 */
export declare class STT<TModel extends STTModels> extends BaseSTT {
    #private;
    private opts;
    private streams;
    constructor(opts?: {
        model?: TModel;
        language?: STTLanguages;
        baseURL?: string;
        encoding?: STTEncoding;
        sampleRate?: number;
        apiKey?: string;
        apiSecret?: string;
        modelOptions?: STTOptions<TModel>;
    });
    get label(): string;
    static fromModelString(modelString: string): STT<AnyString>;
    protected _recognize(_: AudioBuffer): Promise<SpeechEvent>;
    updateOptions(opts: Partial<Pick<InferenceSTTOptions<TModel>, 'model' | 'language'>>): void;
    stream(options?: {
        language?: STTLanguages | string;
        connOptions?: APIConnectOptions;
    }): SpeechStream<TModel>;
}
export declare class SpeechStream<TModel extends STTModels> extends BaseSpeechStream {
    #private;
    private opts;
    private requestId;
    private speaking;
    private speechDuration;
    private reconnectEvent;
    constructor(sttImpl: STT<TModel>, opts: InferenceSTTOptions<TModel>, connOptions: APIConnectOptions);
    get label(): string;
    updateOptions(opts: Partial<Pick<InferenceSTTOptions<TModel>, 'model' | 'language'>>): void;
    protected run(): Promise<void>;
    private processTranscript;
}
export {};
//# sourceMappingURL=stt.d.ts.map