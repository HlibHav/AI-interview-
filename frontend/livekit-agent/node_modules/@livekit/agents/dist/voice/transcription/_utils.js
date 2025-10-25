import { TrackSource } from "@livekit/rtc-node";
function findMicrophoneTrackId(room, identity) {
  var _a;
  let p = room.remoteParticipants.get(identity) ?? null;
  if (identity === ((_a = room.localParticipant) == null ? void 0 : _a.identity)) {
    p = room.localParticipant;
  }
  if (p === null) {
    throw new Error(`Participant ${identity} not found`);
  }
  for (const track of p.trackPublications.values()) {
    if (track.source === TrackSource.SOURCE_MICROPHONE && track.sid) {
      return track.sid;
    }
  }
  throw new Error(`Participant ${identity} does not have a microphone track`);
}
export {
  findMicrophoneTrackId
};
//# sourceMappingURL=_utils.js.map