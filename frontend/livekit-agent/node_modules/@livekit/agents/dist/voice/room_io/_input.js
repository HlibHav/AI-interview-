import {
  AudioFrame,
  AudioStream,
  RemoteParticipant,
  RoomEvent,
  TrackSource
} from "@livekit/rtc-node";
import { log } from "../../log.js";
import { resampleStream } from "../../utils.js";
import { AudioInput } from "../io.js";
class ParticipantAudioInputStream extends AudioInput {
  room;
  sampleRate;
  numChannels;
  noiseCancellation;
  publication = null;
  participantIdentity = null;
  logger = log();
  constructor({
    room,
    sampleRate,
    numChannels,
    noiseCancellation
  }) {
    super();
    this.room = room;
    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    this.noiseCancellation = noiseCancellation;
    this.room.on(RoomEvent.TrackSubscribed, this.onTrackSubscribed);
    this.room.on(RoomEvent.TrackUnpublished, this.onTrackUnpublished);
  }
  setParticipant(participant) {
    this.logger.debug({ participant }, "setting participant audio input");
    const participantIdentity = participant instanceof RemoteParticipant ? participant.identity : participant;
    if (this.participantIdentity === participantIdentity) {
      return;
    }
    this.participantIdentity = participantIdentity;
    this.closeStream();
    if (!participantIdentity) {
      return;
    }
    const participantValue = participant instanceof RemoteParticipant ? participant : this.room.remoteParticipants.get(participantIdentity);
    const trackPublicationsArray = Array.from((participantValue == null ? void 0 : participantValue.trackPublications.values()) ?? []);
    this.logger.info(
      {
        participantValue: participantValue == null ? void 0 : participantValue.identity,
        trackPublications: trackPublicationsArray,
        lengthOfTrackPublications: trackPublicationsArray.length
      },
      "participantValue.trackPublications"
    );
    if (participantValue) {
      for (const publication of participantValue.trackPublications.values()) {
        if (publication.track && publication.source === TrackSource.SOURCE_MICROPHONE) {
          this.onTrackSubscribed(publication.track, publication, participantValue);
          break;
        }
      }
    }
  }
  onTrackUnpublished = (publication, participant) => {
    var _a;
    if (((_a = this.publication) == null ? void 0 : _a.sid) !== publication.sid || participant.identity !== this.participantIdentity) {
      return;
    }
    this.closeStream();
    for (const publication2 of participant.trackPublications.values()) {
      if (publication2.track && this.onTrackSubscribed(publication2.track, publication2, participant)) {
        return;
      }
    }
  };
  closeStream() {
    if (this.deferredStream.isSourceSet) {
      this.deferredStream.detachSource();
    }
    this.publication = null;
  }
  onTrackSubscribed = (track, publication, participant) => {
    this.logger.debug({ participant: participant.identity }, "onTrackSubscribed in _input");
    if (this.participantIdentity !== participant.identity || publication.source !== TrackSource.SOURCE_MICROPHONE || this.publication && this.publication.sid === publication.sid) {
      return false;
    }
    this.closeStream();
    this.publication = publication;
    this.deferredStream.setSource(
      resampleStream({
        stream: this.createStream(track),
        outputRate: this.sampleRate
      })
    );
    return true;
  };
  createStream(track) {
    return new AudioStream(track, {
      sampleRate: this.sampleRate,
      numChannels: this.numChannels,
      noiseCancellation: this.noiseCancellation
      // TODO(AJS-269): resolve compatibility issue with node-sdk to remove the forced type casting
    });
  }
  async close() {
    this.room.off(RoomEvent.TrackSubscribed, this.onTrackSubscribed);
    this.room.off(RoomEvent.TrackUnpublished, this.onTrackUnpublished);
    this.closeStream();
    this.deferredStream.stream.cancel();
  }
}
export {
  ParticipantAudioInputStream
};
//# sourceMappingURL=_input.js.map