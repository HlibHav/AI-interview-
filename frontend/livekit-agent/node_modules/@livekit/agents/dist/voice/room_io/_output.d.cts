import type { RemoteParticipant } from '@livekit/rtc-node';
import { type AudioFrame, type LocalTrackPublication, type Participant, type RemoteTrackPublication, type Room, TrackPublishOptions } from '@livekit/rtc-node';
import { AudioOutput, TextOutput } from '../io.js';
declare abstract class BaseParticipantTranscriptionOutput extends TextOutput {
    protected room: Room;
    protected isDeltaStream: boolean;
    protected participantIdentity: string | null;
    protected trackId?: string;
    protected capturing: boolean;
    protected latestText: string;
    protected currentId: string;
    protected logger: import("pino").Logger;
    constructor(room: Room, isDeltaStream: boolean, participant: Participant | string | null);
    setParticipant(participant: Participant | string | null): void;
    protected onTrackPublished: (track: RemoteTrackPublication, participant: RemoteParticipant) => void;
    protected onLocalTrackPublished: (track: LocalTrackPublication) => void;
    protected generateCurrentId(): string;
    protected resetState(): void;
    captureText(text: string): Promise<void>;
    flush(): void;
    protected abstract handleCaptureText(text: string): Promise<void>;
    protected abstract handleFlush(): void;
}
export declare class ParticipantTranscriptionOutput extends BaseParticipantTranscriptionOutput {
    private writer;
    private flushTask;
    protected handleCaptureText(text: string): Promise<void>;
    protected handleFlush(): void;
    private createTextWriter;
    private flushTaskImpl;
}
export declare class ParticipantLegacyTranscriptionOutput extends BaseParticipantTranscriptionOutput {
    private pushedText;
    private flushTask;
    protected handleCaptureText(text: string): Promise<void>;
    protected handleFlush(): void;
    publishTranscription(id: string, text: string, final: boolean, signal?: AbortSignal): Promise<void>;
    protected resetState(): void;
}
export declare class ParalellTextOutput extends TextOutput {
    /** @internal */
    _sinks: TextOutput[];
    constructor(sinks: TextOutput[], nextInChain?: TextOutput);
    captureText(text: string): Promise<void>;
    flush(): void;
}
export interface AudioOutputOptions {
    sampleRate: number;
    numChannels: number;
    trackPublishOptions: TrackPublishOptions;
    queueSizeMs?: number;
}
export declare class ParticipantAudioOutput extends AudioOutput {
    private room;
    private options;
    private audioSource;
    private publication?;
    private flushTask?;
    private pushedDurationMs;
    private startedFuture;
    private interruptedFuture;
    constructor(room: Room, options: AudioOutputOptions);
    get subscribed(): boolean;
    start(signal: AbortSignal): Promise<void>;
    captureFrame(frame: AudioFrame): Promise<void>;
    private waitForPlayoutTask;
    /**
     * Flush any buffered audio, marking the current playback/segment as complete
     */
    flush(): void;
    clearBuffer(): void;
    private publishTrack;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=_output.d.ts.map