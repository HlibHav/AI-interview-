import { AccessToken } from "livekit-server-sdk";
import { WebSocket } from "ws";
import { APIConnectionError, APIStatusError } from "../index.js";
async function createAccessToken(apiKey, apiSecret, ttl = 600) {
  const token = new AccessToken(apiKey, apiSecret, { identity: "agent", ttl });
  token.addInferenceGrant({ perform: true });
  return await token.toJwt();
}
async function connectWs(url, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers });
    const timeout = setTimeout(() => {
      reject(new APIConnectionError({ message: "Timeout connecting to LiveKit WebSocket" }));
    }, timeoutMs);
    const onOpen = () => {
      clearTimeout(timeout);
      resolve(socket);
    };
    const onError = (err) => {
      clearTimeout(timeout);
      if (err && typeof err === "object" && "code" in err && err.code === 429) {
        reject(
          new APIStatusError({
            message: "LiveKit gateway quota exceeded",
            options: { statusCode: 429 }
          })
        );
      } else {
        reject(new APIConnectionError({ message: "Error connecting to LiveKit WebSocket" }));
      }
    };
    const onClose = (code) => {
      clearTimeout(timeout);
      if (code !== 1e3) {
        reject(
          new APIConnectionError({
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
export {
  connectWs,
  createAccessToken
};
//# sourceMappingURL=utils.js.map