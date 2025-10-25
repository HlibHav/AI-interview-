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
var stream_channel_exports = {};
__export(stream_channel_exports, {
  createStreamChannel: () => createStreamChannel
});
module.exports = __toCommonJS(stream_channel_exports);
var import_identity_transform = require("./identity_transform.cjs");
function createStreamChannel() {
  const transform = new import_identity_transform.IdentityTransform();
  const writer = transform.writable.getWriter();
  return {
    write: (chunk) => writer.write(chunk),
    stream: () => transform.readable,
    close: async () => {
      try {
        return await writer.close();
      } catch (e) {
        if (e instanceof Error && e.name === "TypeError") {
          return;
        }
        throw e;
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStreamChannel
});
//# sourceMappingURL=stream_channel.cjs.map