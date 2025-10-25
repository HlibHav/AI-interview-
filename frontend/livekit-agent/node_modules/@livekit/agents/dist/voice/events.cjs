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
var events_exports = {};
__export(events_exports, {
  AgentSessionEventTypes: () => AgentSessionEventTypes,
  CloseReason: () => CloseReason,
  createAgentStateChangedEvent: () => createAgentStateChangedEvent,
  createCloseEvent: () => createCloseEvent,
  createConversationItemAddedEvent: () => createConversationItemAddedEvent,
  createErrorEvent: () => createErrorEvent,
  createFunctionToolsExecutedEvent: () => createFunctionToolsExecutedEvent,
  createMetricsCollectedEvent: () => createMetricsCollectedEvent,
  createSpeechCreatedEvent: () => createSpeechCreatedEvent,
  createUserInputTranscribedEvent: () => createUserInputTranscribedEvent,
  createUserStateChangedEvent: () => createUserStateChangedEvent,
  zipFunctionCallsAndOutputs: () => zipFunctionCallsAndOutputs
});
module.exports = __toCommonJS(events_exports);
var AgentSessionEventTypes = /* @__PURE__ */ ((AgentSessionEventTypes2) => {
  AgentSessionEventTypes2["UserInputTranscribed"] = "user_input_transcribed";
  AgentSessionEventTypes2["AgentStateChanged"] = "agent_state_changed";
  AgentSessionEventTypes2["UserStateChanged"] = "user_state_changed";
  AgentSessionEventTypes2["ConversationItemAdded"] = "conversation_item_added";
  AgentSessionEventTypes2["FunctionToolsExecuted"] = "function_tools_executed";
  AgentSessionEventTypes2["MetricsCollected"] = "metrics_collected";
  AgentSessionEventTypes2["SpeechCreated"] = "speech_created";
  AgentSessionEventTypes2["Error"] = "error";
  AgentSessionEventTypes2["Close"] = "close";
  return AgentSessionEventTypes2;
})(AgentSessionEventTypes || {});
var CloseReason = /* @__PURE__ */ ((CloseReason2) => {
  CloseReason2["ERROR"] = "error";
  CloseReason2["JOB_SHUTDOWN"] = "job_shutdown";
  CloseReason2["PARTICIPANT_DISCONNECTED"] = "participant_disconnected";
  CloseReason2["USER_INITIATED"] = "user_initiated";
  return CloseReason2;
})(CloseReason || {});
const createUserStateChangedEvent = (oldState, newState, createdAt = Date.now()) => ({
  type: "user_state_changed",
  oldState,
  newState,
  createdAt
});
const createAgentStateChangedEvent = (oldState, newState, createdAt = Date.now()) => ({
  type: "agent_state_changed",
  oldState,
  newState,
  createdAt
});
const createUserInputTranscribedEvent = ({
  transcript,
  isFinal,
  speakerId = null,
  language = null,
  createdAt = Date.now()
}) => ({
  type: "user_input_transcribed",
  transcript,
  isFinal,
  speakerId,
  language,
  createdAt
});
const createMetricsCollectedEvent = ({
  metrics,
  createdAt = Date.now()
}) => ({
  type: "metrics_collected",
  metrics,
  createdAt
});
const createConversationItemAddedEvent = (item, createdAt = Date.now()) => ({
  type: "conversation_item_added",
  item,
  createdAt
});
const createFunctionToolsExecutedEvent = ({
  functionCalls,
  functionCallOutputs,
  createdAt = Date.now()
}) => {
  return {
    type: "function_tools_executed",
    functionCalls,
    functionCallOutputs,
    createdAt
  };
};
const zipFunctionCallsAndOutputs = (event) => {
  return event.functionCalls.map((call, index) => [call, event.functionCallOutputs[index]]);
};
const createSpeechCreatedEvent = ({
  userInitiated,
  source,
  speechHandle,
  createdAt = Date.now()
}) => ({
  type: "speech_created",
  userInitiated,
  source,
  speechHandle,
  createdAt
});
const createErrorEvent = (error, source, createdAt = Date.now()) => ({
  type: "error",
  error,
  source,
  createdAt
});
const createCloseEvent = (reason, error = null, createdAt = Date.now()) => ({
  type: "close",
  error,
  reason,
  createdAt
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentSessionEventTypes,
  CloseReason,
  createAgentStateChangedEvent,
  createCloseEvent,
  createConversationItemAddedEvent,
  createErrorEvent,
  createFunctionToolsExecutedEvent,
  createMetricsCollectedEvent,
  createSpeechCreatedEvent,
  createUserInputTranscribedEvent,
  createUserStateChangedEvent,
  zipFunctionCallsAndOutputs
});
//# sourceMappingURL=events.cjs.map