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
var provider_format_exports = {};
__export(provider_format_exports, {
  toChatCtx: () => toChatCtx
});
module.exports = __toCommonJS(provider_format_exports);
var import_google = require("./google.cjs");
var import_openai = require("./openai.cjs");
async function toChatCtx(format, chatCtx, injectDummyUserMessage = true) {
  switch (format) {
    case "openai":
      return await (0, import_openai.toChatCtx)(chatCtx, injectDummyUserMessage);
    case "google":
      return await (0, import_google.toChatCtx)(chatCtx, injectDummyUserMessage);
    default:
      throw new Error(`Unsupported provider format: ${format}`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toChatCtx
});
//# sourceMappingURL=index.cjs.map