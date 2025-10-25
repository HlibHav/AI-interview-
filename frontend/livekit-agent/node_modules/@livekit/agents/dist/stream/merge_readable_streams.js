import { ReadableStream } from "node:stream/web";
import { withResolvers } from "../utils.js";
function mergeReadableStreams(...streams) {
  const resolvePromises = streams.map(() => withResolvers());
  return new ReadableStream({
    start(controller) {
      let mustClose = false;
      Promise.all(resolvePromises.map(({ promise }) => promise)).then(() => {
        controller.close();
      }).catch((error) => {
        mustClose = true;
        controller.error(error);
      });
      for (const [index, stream] of streams.entries()) {
        (async () => {
          try {
            for await (const data of stream) {
              if (mustClose) {
                break;
              }
              controller.enqueue(data);
            }
            resolvePromises[index].resolve();
          } catch (error) {
            resolvePromises[index].reject(error);
          }
        })();
      }
    }
  });
}
export {
  mergeReadableStreams
};
//# sourceMappingURL=merge_readable_streams.js.map