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
var llm_exports = {};
__export(llm_exports, {
  ChatContext: () => import_chat_context.ChatContext,
  ChatMessage: () => import_chat_context.ChatMessage,
  FunctionCall: () => import_chat_context.FunctionCall,
  FunctionCallOutput: () => import_chat_context.FunctionCallOutput,
  LLM: () => import_llm.LLM,
  LLMStream: () => import_llm.LLMStream,
  RealtimeModel: () => import_realtime.RealtimeModel,
  RealtimeSession: () => import_realtime.RealtimeSession,
  RemoteChatContext: () => import_remote_chat_context.RemoteChatContext,
  ToolError: () => import_tool_context.ToolError,
  computeChatCtxDiff: () => import_utils.computeChatCtxDiff,
  createAudioContent: () => import_chat_context.createAudioContent,
  createImageContent: () => import_chat_context.createImageContent,
  createToolOptions: () => import_utils.createToolOptions,
  executeToolCall: () => import_utils.executeToolCall,
  handoff: () => import_tool_context.handoff,
  isFunctionTool: () => import_tool_context.isFunctionTool,
  oaiBuildFunctionInfo: () => import_utils.oaiBuildFunctionInfo,
  oaiParams: () => import_utils.oaiParams,
  toJsonSchema: () => import_utils.toJsonSchema,
  tool: () => import_tool_context.tool
});
module.exports = __toCommonJS(llm_exports);
var import_tool_context = require("./tool_context.cjs");
var import_chat_context = require("./chat_context.cjs");
var import_llm = require("./llm.cjs");
var import_realtime = require("./realtime.cjs");
var import_remote_chat_context = require("./remote_chat_context.cjs");
var import_utils = require("./utils.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatContext,
  ChatMessage,
  FunctionCall,
  FunctionCallOutput,
  LLM,
  LLMStream,
  RealtimeModel,
  RealtimeSession,
  RemoteChatContext,
  ToolError,
  computeChatCtxDiff,
  createAudioContent,
  createImageContent,
  createToolOptions,
  executeToolCall,
  handoff,
  isFunctionTool,
  oaiBuildFunctionInfo,
  oaiParams,
  toJsonSchema,
  tool
});
//# sourceMappingURL=index.cjs.map