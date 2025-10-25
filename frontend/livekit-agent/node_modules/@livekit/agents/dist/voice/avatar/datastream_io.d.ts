import { type AudioFrame, type Room, type RpcInvocationData, type TrackKind } from '@livekit/rtc-node';
import { AudioOutput } from '../io.js';
export interface DataStreamAudioOutputOptions {
    room: Room;
    destinationIdentity: string;
    sampleRate?: number;
    waitRemoteTrack?: TrackKind;
}
/**
 * AudioOutput implementation that streams audio to a remote avatar worker using LiveKit DataStream.
 */
export declare class DataStreamAudioOutput extends AudioOutput {
    #private;
    static _playbackFinishedRpcRegistered: boolean;
    static _playbackFinishedHandlers: Record<string, (data: RpcInvocationData) => string>;
    private room;
    private destinationIdentity;
    private roomConnectedFuture;
    private waitRemoteTrack?;
    private streamWriter?;
    private pushedDuration;
    private started;
    private lock;
    private startTask?;
    constructor(opts: DataStreamAudioOutputOptions);
    private _start;
    captureFrame(frame: AudioFrame): Promise<void>;
    flush(): void;
    clearBuffer(): void;
    private handlePlaybackFinished;
    static registerPlaybackFinishedRpc({ room, callerIdentity, handler, }: {
        room: Room;
        callerIdentity: string;
        handler: (data: RpcInvocationData) => string;
    }): void;
}
//# sourceMappingURL=datastream_io.d.ts.map