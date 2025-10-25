import { TypedEventEmitter } from '@livekit/typed-emitter';
import { g as TextStreamHandler, f as ByteStreamHandler } from './stream_reader-DRyR29vo.js';
import { E2EEManager, E2EEOptions } from './e2ee.js';
import { RemoteParticipant, LocalParticipant, Participant } from './participant.js';
import { DisconnectReason } from './proto/participant_pb.js';
import { RoomInfo, ConnectionQuality, DataPacketKind, ConnectionState, IceTransportType, ContinualGatheringPolicy, IceServer, RoomOptions as RoomOptions$1 } from './proto/room_pb.js';
import { LocalTrack, RemoteTrack } from './track.js';
import { LocalTrackPublication, RemoteTrackPublication, TrackPublication } from './track_publication.js';
import { ChatMessage } from './types.js';
import './proto/e2ee_pb.js';
import '@bufbuild/protobuf';
import 'node:fs';
import './data_streams/stream_writer.js';
import './ffi_client.js';
import './napi/native.d.js';
import './proto/ffi_pb.js';
import './proto/track_pb.js';
import './proto/stats_pb.js';
import './proto/handle_pb.js';
import './proto/video_frame_pb.js';
import './proto/audio_frame_pb.js';
import './proto/rpc_pb.js';
import './proto/track_publication_pb.js';
import './proto/data_stream_pb.js';
import './rpc.js';
import './transcription.js';
import './audio_source.js';
import './audio_frame.js';
import './video_source.js';
import './video_frame.js';

interface RtcConfiguration {
    iceTransportType: IceTransportType;
    continualGatheringPolicy: ContinualGatheringPolicy;
    iceServers: IceServer[];
}
declare const defaultRtcConfiguration: RtcConfiguration;
interface RoomOptions {
    autoSubscribe: boolean;
    dynacast: boolean;
    e2ee?: E2EEOptions;
    rtcConfig?: RtcConfiguration;
}
declare const defaultRoomOptions: RoomOptions$1;
declare const Room_base: new () => TypedEventEmitter<RoomCallbacks>;
declare class Room extends Room_base {
    private info?;
    private ffiHandle?;
    private byteStreamControllers;
    private textStreamControllers;
    private byteStreamHandlers;
    private textStreamHandlers;
    private preConnectEvents;
    e2eeManager?: E2EEManager;
    connectionState: ConnectionState;
    remoteParticipants: Map<string, RemoteParticipant>;
    localParticipant?: LocalParticipant;
    constructor();
    get name(): string | undefined;
    get metadata(): string | undefined;
    get isConnected(): boolean;
    /**
     * Gets the room's server ID. This ID is assigned by the LiveKit server
     * and is unique for each room session.
     * SID is assigned asynchronously after connection.
     * @returns Promise that resolves to the room's server ID, or empty string if not connected
     */
    getSid(): Promise<string>;
    get numParticipants(): number;
    get numPublishers(): number;
    get creationTime(): Date;
    get isRecording(): boolean;
    /**
     * The time in seconds after which a room will be closed after the last
     * participant has disconnected.
     */
    get departureTimeout(): number;
    /**
     * The time in seconds after which an empty room will be automatically closed.
     */
    get emptyTimeout(): number;
    /**
     * Connects to a LiveKit room using the provided URL and access token.
     * @param url The WebSocket URL of the LiveKit server
     * @param token A valid LiveKit access token for authentication
     * @param opts Optional room configuration options
     * @throws ConnectError if connection fails
     */
    connect(url: string, token: string, opts?: RoomOptions): Promise<void>;
    /**
     * Disconnects from the room and cleans up all resources.
     * This will stop all tracks and close the connection.
     */
    disconnect(): Promise<void>;
    /**
     * Registers a handler for incoming text data streams on a specific topic.
     * Text streams are used for receiving structured text data from other participants.
     * @param topic The topic to listen for text streams on
     * @param callback Function to handle incoming text stream data
     * @throws Error if a handler for this topic is already registered
     */
    registerTextStreamHandler(topic: string, callback: TextStreamHandler): void;
    unregisterTextStreamHandler(topic: string): void;
    /**
     * Registers a handler for incoming byte data streams on a specific topic.
     * Byte streams are used for receiving binary data like files from other participants.
     * @param topic The topic to listen for byte streams on
     * @param callback Function to handle incoming byte stream data
     * @throws Error if a handler for this topic is already registered
     */
    registerByteStreamHandler(topic: string, callback: ByteStreamHandler): void;
    unregisterByteStreamHandler(topic: string): void;
    private onFfiEvent;
    private processFfiEvent;
    private retrieveParticipantByIdentity;
    private requireParticipantByIdentity;
    private requireRemoteParticipant;
    private requirePublicationOfParticipant;
    private requirePublicationOfRemoteParticipant;
    private createRemoteParticipant;
    private handleStreamHeader;
    private handleStreamChunk;
    private handleStreamTrailer;
}
declare class ConnectError extends Error {
    constructor(message: string);
}
type RoomCallbacks = {
    participantConnected: (participant: RemoteParticipant) => void;
    participantDisconnected: (participant: RemoteParticipant) => void;
    localTrackPublished: (publication: LocalTrackPublication, participant: LocalParticipant) => void;
    localTrackUnpublished: (publication: LocalTrackPublication, participant: LocalParticipant) => void;
    localTrackSubscribed: (track: LocalTrack) => void;
    trackPublished: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
    trackUnpublished: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
    trackSubscribed: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
    trackUnsubscribed: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
    trackSubscriptionFailed: (trackSid: string, participant: RemoteParticipant, reason?: string) => void;
    trackMuted: (publication: TrackPublication, participant: Participant) => void;
    trackUnmuted: (publication: TrackPublication, participant: Participant) => void;
    activeSpeakersChanged: (speakers: Participant[]) => void;
    roomMetadataChanged: (metadata: string) => void;
    roomInfoUpdated: (info: RoomInfo) => void;
    participantMetadataChanged: (metadata: string | undefined, participant: Participant) => void;
    participantNameChanged: (name: string, participant: Participant) => void;
    participantAttributesChanged: (changedAttributes: Record<string, string>, participant: Participant) => void;
    connectionQualityChanged: (quality: ConnectionQuality, participant: Participant) => void;
    dataReceived: (payload: Uint8Array, participant?: RemoteParticipant, kind?: DataPacketKind, topic?: string) => void;
    chatMessage: (message: ChatMessage, participant?: Participant) => void;
    dtmfReceived: (code: number, digit: string, participant: RemoteParticipant) => void;
    encryptionError: (error: Error) => void;
    connectionStateChanged: (state: ConnectionState) => void;
    connected: () => void;
    disconnected: (reason: DisconnectReason) => void;
    reconnecting: () => void;
    reconnected: () => void;
    roomSidChanged: (sid: string) => void;
    roomUpdated: () => void;
    moved: () => void;
};
declare enum RoomEvent {
    ParticipantConnected = "participantConnected",
    ParticipantDisconnected = "participantDisconnected",
    LocalTrackPublished = "localTrackPublished",
    LocalTrackUnpublished = "localTrackUnpublished",
    LocalTrackSubscribed = "localTrackSubscribed",
    TrackPublished = "trackPublished",
    TrackUnpublished = "trackUnpublished",
    TrackSubscribed = "trackSubscribed",
    TrackUnsubscribed = "trackUnsubscribed",
    TrackSubscriptionFailed = "trackSubscriptionFailed",
    TrackMuted = "trackMuted",
    TrackUnmuted = "trackUnmuted",
    ActiveSpeakersChanged = "activeSpeakersChanged",
    RoomMetadataChanged = "roomMetadataChanged",
    RoomSidChanged = "roomSidChanged",
    ParticipantMetadataChanged = "participantMetadataChanged",
    ParticipantNameChanged = "participantNameChanged",
    ParticipantAttributesChanged = "participantAttributesChanged",
    ConnectionQualityChanged = "connectionQualityChanged",
    DataReceived = "dataReceived",
    ChatMessage = "chatMessage",
    DtmfReceived = "dtmfReceived",
    EncryptionError = "encryptionError",
    ConnectionStateChanged = "connectionStateChanged",
    Connected = "connected",
    Disconnected = "disconnected",
    Reconnecting = "reconnecting",
    Reconnected = "reconnected",
    RoomUpdated = "roomUpdated",
    Moved = "moved"
}

export { ConnectError, Room, type RoomCallbacks, RoomEvent, type RoomOptions, type RtcConfiguration, defaultRoomOptions, defaultRtcConfiguration };
