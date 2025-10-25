import type { AudioFrame } from '@livekit/rtc-node';
import type { VAD } from '../vad.js';
import type { SpeechEvent } from './stt.js';
import { STT, SpeechStream } from './stt.js';
export declare class StreamAdapter extends STT {
    #private;
    label: string;
    constructor(stt: STT, vad: VAD);
    _recognize(frame: AudioFrame): Promise<SpeechEvent>;
    stream(): StreamAdapterWrapper;
}
export declare class StreamAdapterWrapper extends SpeechStream {
    #private;
    label: string;
    constructor(stt: STT, vad: VAD);
    monitorMetrics(): Promise<void>;
    protected run(): Promise<void>;
}
//# sourceMappingURL=stream_adapter.d.ts.map