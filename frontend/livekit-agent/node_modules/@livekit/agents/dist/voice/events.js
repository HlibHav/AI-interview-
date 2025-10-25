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
export {
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
};
//# sourceMappingURL=events.js.map