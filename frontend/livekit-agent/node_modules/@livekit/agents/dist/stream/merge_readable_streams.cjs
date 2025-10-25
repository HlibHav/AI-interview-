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
var merge_readable_streams_exports = {};
__export(merge_readable_streams_exports, {
  mergeReadableStreams: () => mergeReadableStreams
});
module.exports = __toCommonJS(merge_readable_streams_exports);
var import_web = require("node:stream/web");
var import_utils = require("../utils.cjs");
function mergeReadableStreams(...streams) {
  const resolvePromises = streams.map(() => (0, import_utils.withResolvers)());
  return new import_web.ReadableStream({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mergeReadableStreams
});
//# sourceMappingURL=merge_readable_streams.cjs.map