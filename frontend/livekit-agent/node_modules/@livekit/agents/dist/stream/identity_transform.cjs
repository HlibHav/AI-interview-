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
var identity_transform_exports = {};
__export(identity_transform_exports, {
  IdentityTransform: () => IdentityTransform
});
module.exports = __toCommonJS(identity_transform_exports);
var import_web = require("node:stream/web");
class IdentityTransform extends import_web.TransformStream {
  constructor() {
    super(
      {
        transform: (chunk, controller) => controller.enqueue(chunk)
      },
      // By default the transfor stream will buffer only one chunk at a time.
      // In order to follow the python agents channel.py, we set set the capaciy to be effectively infinite.
      { highWaterMark: Number.MAX_SAFE_INTEGER },
      { highWaterMark: Number.MAX_SAFE_INTEGER }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  IdentityTransform
});
//# sourceMappingURL=identity_transform.cjs.map