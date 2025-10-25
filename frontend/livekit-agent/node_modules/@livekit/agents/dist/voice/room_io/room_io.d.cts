import { type NoiseCancellationOptions, ParticipantKind, type RemoteParticipant, type Room, type TextStreamInfo, TrackPublishOptions } from '@livekit/rtc-node';
import { type AgentSession } from '../agent_session.js';
import type { AudioOutput, TextOutput } from '../io.js';
export interface TextInputEvent {
    text: string;
    info: TextStreamInfo;
    participant: RemoteParticipant;
}
export type TextInputCallback = (sess: AgentSession, ev: TextInputEvent) => void | Promise<void>;
export interface RoomInputOptions {
    audioSampleRate: number;
    audioNumChannels: number;
    /** If not given, default to True. */
    textEnabled: boolean;
    /** If not given, default to True. */
    audioEnabled: boolean;
    /** If not given, default to False. */
    videoEnabled: boolean;
    /** The participant to link to. If not provided, link to the first participant.
      Can be overridden by the `participant` argument of RoomIO constructor or `set_participant`.
    */
    participantIdentity?: string;
    noiseCancellation?: NoiseCancellationOptions;
    textInputCallback?: TextInputCallback;
    /** Participant kinds accepted for auto subscription. If not provided,
      accept `DEFAULT_PARTICIPANT_KINDS`
    */
    participantKinds?: ParticipantKind[];
    /** Close the AgentSession if the linked participant disconnects with reasons in
      CLIENT_INITIATED, ROOM_DELETED, or USER_REJECTED.
    */
    closeOnDisconnect: boolean;
}
export interface RoomOutputOptions {
    /** If not given, default to True. */
    transcriptionEnabled: boolean;
    /** If not given, default to True. */
    audioEnabled: boolean;
    audioSampleRate: number;
    audioNumChannels: number;
    /** False to disable transcription synchronization with audio output.
      Otherwise, transcription is emitted as quickly as available.
    */
    syncTranscription: boolean;
    /** The name of the audio track to publish. If not provided, default to "roomio_audio".
     */
    audioPublishOptions: TrackPublishOptions;
}
export declare class RoomIO {
    private agentSession;
    private room;
    private inputOptions;
    private outputOptions;
    private audioInput?;
    private participantAudioOutput?;
    private userTranscriptOutput?;
    private agentTranscriptOutput?;
    private transcriptionSynchronizer?;
    private participantIdentity;
    private participantAvailableFuture;
    private roomConnectedFuture;
    private userTranscriptStream;
    private userTranscriptWriter;
    private forwardUserTranscriptTask?;
    private initTask?;
    private textStreamHandlerRegistered;
    private logger;
    constructor({ agentSession, room, participant, inputOptions, outputOptions, }: {
        agentSession: AgentSession;
        room: Room;
        participant?: RemoteParticipant | string | null;
        inputOptions?: Partial<RoomInputOptions>;
        outputOptions?: Partial<RoomOutputOptions>;
    });
    private init;
    private onConnectionStateChanged;
    private onParticipantConnected;
    private onParticipantDisconnected;
    private onUserInputTranscribed;
    private onAgentStateChanged;
    private onUserTextInput;
    private forwardUserTranscript;
    private createTranscriptionOutput;
    private updateTranscriptionOutput;
    get audioOutput(): AudioOutput | undefined;
    get transcriptionOutput(): TextOutput | undefined;
    /** Switch to a different participant */
    setParticipant(participantIdentity: string | null): void;
    unsetParticipant(): void;
    start(): void;
    close(): Promise<void>;
}
//# sourceMappingURL=room_io.d.ts.map