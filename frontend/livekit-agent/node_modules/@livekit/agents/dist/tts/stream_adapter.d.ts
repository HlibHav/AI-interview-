import type { SentenceTokenizer } from '../tokenize/index.js';
import type { ChunkedStream } from './tts.js';
import { SynthesizeStream, TTS } from './tts.js';
export declare class StreamAdapter extends TTS {
    #private;
    label: string;
    constructor(tts: TTS, sentenceTokenizer: SentenceTokenizer);
    synthesize(text: string): ChunkedStream;
    stream(): StreamAdapterWrapper;
}
export declare class StreamAdapterWrapper extends SynthesizeStream {
    #private;
    label: string;
    constructor(tts: TTS, sentenceTokenizer: SentenceTokenizer);
    protected run(): Promise<void>;
}
//# sourceMappingURL=stream_adapter.d.ts.map