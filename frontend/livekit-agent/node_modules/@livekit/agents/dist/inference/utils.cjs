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
  connectWs: () => connectWs,
  createAccessToken: () => createAccessToken
});
module.exports = __toCommonJS(utils_exports);
var import_livekit_server_sdk = require("livekit-server-sdk");
var import_ws = require("ws");
var import__ = require("../index.cjs");
async function createAccessToken(apiKey, apiSecret, ttl = 600) {
  const token = new import_livekit_server_sdk.AccessToken(apiKey, apiSecret, { identity: "agent", ttl });
  token.addInferenceGrant({ perform: true });
  return await token.toJwt();
}
async function connectWs(url, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = new import_ws.WebSocket(url, { headers });
    const timeout = setTimeout(() => {
      reject(new import__.APIConnectionError({ message: "Timeout connecting to LiveKit WebSocket" }));
    }, timeoutMs);
    const onOpen = () => {
      clearTimeout(timeout);
      resolve(socket);
    };
    const onError = (err) => {
      clearTimeout(timeout);
      if (err && typeof err === "object" && "code" in err && err.code === 429) {
        reject(
          new import__.APIStatusError({
            message: "LiveKit gateway quota exceeded",
            options: { statusCode: 429 }
          })
        );
      } else {
        reject(new import__.APIConnectionError({ message: "Error connecting to LiveKit WebSocket" }));
      }
    };
    const onClose = (code) => {
      clearTimeout(timeout);
      if (code !== 1e3) {
        reject(
          new import__.APIConnectionError({
            message: "Connection closed unexpectedly"
          })
        );
      }
    };
    socket.once("open", onOpen);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  connectWs,
  createAccessToken
});
//# sourceMappingURL=utils.cjs.map