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
var tool_context_exports = {};
__export(tool_context_exports, {
  ToolError: () => ToolError,
  handoff: () => handoff,
  isAgentHandoff: () => isAgentHandoff,
  isFunctionTool: () => isFunctionTool,
  isProviderDefinedTool: () => isProviderDefinedTool,
  isTool: () => isTool,
  isToolError: () => isToolError,
  tool: () => tool
});
module.exports = __toCommonJS(tool_context_exports);
var import_zod = require("zod");
const TOOL_SYMBOL = Symbol("tool");
const FUNCTION_TOOL_SYMBOL = Symbol("function_tool");
const PROVIDER_DEFINED_TOOL_SYMBOL = Symbol("provider_defined_tool");
const TOOL_ERROR_SYMBOL = Symbol("tool_error");
const HANDOFF_SYMBOL = Symbol("handoff");
class ToolError extends Error {
  constructor(message) {
    super(message);
    Object.defineProperty(this, TOOL_ERROR_SYMBOL, {
      value: true
    });
  }
}
function handoff(options) {
  return {
    agent: options.agent,
    returns: options.returns,
    [HANDOFF_SYMBOL]: true
  };
}
function tool(tool2) {
  if (tool2.execute !== void 0) {
    const parameters = tool2.parameters ?? import_zod.z.object({});
    if (parameters instanceof import_zod.ZodType && parameters._def.typeName !== "ZodObject") {
      throw new Error("Tool parameters must be a Zod object schema (z.object(...))");
    }
    if (!(parameters instanceof import_zod.ZodObject) && !(typeof parameters === "object")) {
      throw new Error("Tool parameters must be a Zod object schema or a raw JSON schema");
    }
    return {
      type: "function",
      description: tool2.description,
      parameters,
      execute: tool2.execute,
      [TOOL_SYMBOL]: true,
      [FUNCTION_TOOL_SYMBOL]: true
    };
  }
  if (tool2.config !== void 0 && tool2.id !== void 0) {
    return {
      type: "provider-defined",
      id: tool2.id,
      config: tool2.config,
      [TOOL_SYMBOL]: true,
      [PROVIDER_DEFINED_TOOL_SYMBOL]: true
    };
  }
  throw new Error("Invalid tool");
}
function isTool(tool2) {
  return tool2 && tool2[TOOL_SYMBOL] === true;
}
function isFunctionTool(tool2) {
  const isTool2 = tool2 && tool2[TOOL_SYMBOL] === true;
  const isFunctionTool2 = tool2[FUNCTION_TOOL_SYMBOL] === true;
  return isTool2 && isFunctionTool2;
}
function isProviderDefinedTool(tool2) {
  const isTool2 = tool2 && tool2[TOOL_SYMBOL] === true;
  const isProviderDefinedTool2 = tool2[PROVIDER_DEFINED_TOOL_SYMBOL] === true;
  return isTool2 && isProviderDefinedTool2;
}
function isToolError(error) {
  return error && error[TOOL_ERROR_SYMBOL] === true;
}
function isAgentHandoff(handoff2) {
  return handoff2 && handoff2[HANDOFF_SYMBOL] === true;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ToolError,
  handoff,
  isAgentHandoff,
  isFunctionTool,
  isProviderDefinedTool,
  isTool,
  isToolError,
  tool
});
//# sourceMappingURL=tool_context.cjs.map