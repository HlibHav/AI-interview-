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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var voice_exports = {};
__export(voice_exports, {
  Agent: () => import_agent.Agent,
  AgentSession: () => import_agent_session.AgentSession,
  RunContext: () => import_run_context.RunContext,
  StopResponse: () => import_agent.StopResponse
});
module.exports = __toCommonJS(voice_exports);
var import_agent = require("./agent.cjs");
var import_agent_session = require("./agent_session.cjs");
__reExport(voice_exports, require("./avatar/index.cjs"), module.exports);
__reExport(voice_exports, require("./events.cjs"), module.exports);
__reExport(voice_exports, require("./room_io/index.cjs"), module.exports);
var import_run_context = require("./run_context.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Agent,
  AgentSession,
  RunContext,
  StopResponse,
  ...require("./avatar/index.cjs"),
  ...require("./events.cjs"),
  ...require("./room_io/index.cjs")
});
//# sourceMappingURL=index.cjs.map