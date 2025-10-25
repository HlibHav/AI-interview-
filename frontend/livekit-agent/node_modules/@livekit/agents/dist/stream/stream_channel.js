import { IdentityTransform } from "./identity_transform.js";
function createStreamChannel() {
  const transform = new IdentityTransform();
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
export {
  createStreamChannel
};
//# sourceMappingURL=stream_channel.js.map