"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var input_exports = {};
__export(input_exports, {
  ParticipantAudioInputStream: () => ParticipantAudioInputStream
});
module.exports = __toCommonJS(input_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_log = require("../../log.cjs");
var import_utils = require("../../utils.cjs");
var import_io = require("../io.cjs");
class ParticipantAudioInputStream extends import_io.AudioInput {
  room;
  sampleRate;
  numChannels;
  noiseCancellation;
  publication = null;
  participantIdentity = null;
  logger = (0, import_log.log)();
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
    this.room.on(import_rtc_node.RoomEvent.TrackSubscribed, this.onTrackSubscribed);
    this.room.on(import_rtc_node.RoomEvent.TrackUnpublished, this.onTrackUnpublished);
  }
  setParticipant(participant) {
    this.logger.debug({ participant }, "setting participant audio input");
    const participantIdentity = participant instanceof import_rtc_node.RemoteParticipant ? participant.identity : participant;
    if (this.participantIdentity === participantIdentity) {
      return;
    }
    this.participantIdentity = participantIdentity;
    this.closeStream();
    if (!participantIdentity) {
      return;
    }
    const participantValue = participant instanceof import_rtc_node.RemoteParticipant ? participant : this.room.remoteParticipants.get(participantIdentity);
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
        if (publication.track && publication.source === import_rtc_node.TrackSource.SOURCE_MICROPHONE) {
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
    if (this.participantIdentity !== participant.identity || publication.source !== import_rtc_node.TrackSource.SOURCE_MICROPHONE || this.publication && this.publication.sid === publication.sid) {
      return false;
    }
    this.closeStream();
    this.publication = publication;
    this.deferredStream.setSource(
      (0, import_utils.resampleStream)({
        stream: this.createStream(track),
        outputRate: this.sampleRate
      })
    );
    return true;
  };
  createStream(track) {
    return new import_rtc_node.AudioStream(track, {
      sampleRate: this.sampleRate,
      numChannels: this.numChannels,
      noiseCancellation: this.noiseCancellation
      // TODO(AJS-269): resolve compatibility issue with node-sdk to remove the forced type casting
    });
  }
  async close() {
    this.room.off(import_rtc_node.RoomEvent.TrackSubscribed, this.onTrackSubscribed);
    this.room.off(import_rtc_node.RoomEvent.TrackUnpublished, this.onTrackUnpublished);
    this.closeStream();
    this.deferredStream.stream.cancel();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ParticipantAudioInputStream
});
//# sourceMappingURL=_input.cjs.map