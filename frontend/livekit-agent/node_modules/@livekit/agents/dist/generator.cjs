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
var generator_exports = {};
__export(generator_exports, {
  defineAgent: () => defineAgent,
  isAgent: () => isAgent
});
module.exports = __toCommonJS(generator_exports);
function isAgent(obj) {
  return typeof obj === "object" && obj !== null && "entry" in obj && typeof obj.entry === "function" && ("prewarm" in obj && typeof obj.prewarm === "function" || !("prewarm" in obj));
}
function defineAgent(agent) {
  return agent;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineAgent,
  isAgent
});
//# sourceMappingURL=generator.cjs.map