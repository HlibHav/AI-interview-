import { type NoiseCancellationOptions, RemoteParticipant, type Room } from '@livekit/rtc-node';
import { AudioInput } from '../io.js';
export declare class ParticipantAudioInputStream extends AudioInput {
    private room;
    private sampleRate;
    private numChannels;
    private noiseCancellation?;
    private publication;
    private participantIdentity;
    private logger;
    constructor({ room, sampleRate, numChannels, noiseCancellation, }: {
        room: Room;
        sampleRate: number;
        numChannels: number;
        noiseCancellation?: NoiseCancellationOptions;
    });
    setParticipant(participant: RemoteParticipant | string | null): void;
    private onTrackUnpublished;
    private closeStream;
    private onTrackSubscribed;
    private createStream;
    close(): Promise<void>;
}
//# sourceMappingURL=_input.d.ts.map