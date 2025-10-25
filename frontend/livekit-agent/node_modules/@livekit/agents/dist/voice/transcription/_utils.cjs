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
var utils_exports = {};
__export(utils_exports, {
  findMicrophoneTrackId: () => findMicrophoneTrackId
});
module.exports = __toCommonJS(utils_exports);
var import_rtc_node = require("@livekit/rtc-node");
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
    if (track.source === import_rtc_node.TrackSource.SOURCE_MICROPHONE && track.sid) {
      return track.sid;
    }
  }
  throw new Error(`Participant ${identity} does not have a microphone track`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findMicrophoneTrackId
});
//# sourceMappingURL=_utils.cjs.map