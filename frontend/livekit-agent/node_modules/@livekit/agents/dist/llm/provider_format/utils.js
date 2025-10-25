import { log } from "../../log.js";
class ChatItemGroup {
  message;
  toolCalls;
  toolOutputs;
  logger = log();
  constructor(params) {
    this.message = params.message;
    this.toolCalls = params.toolCalls;
    this.toolOutputs = params.toolOutputs;
  }
  static create(params) {
    const { message, toolCalls = [], toolOutputs = [] } = params ?? {};
    return new ChatItemGroup({ message, toolCalls, toolOutputs });
  }
  get isEmpty() {
    return this.message === void 0 && this.toolCalls.length === 0 && this.toolOutputs.length === 0;
  }
  add(item) {
    if (item.type === "message") {
      if (this.message) {
        throw new Error("only one message is allowed in a group");
      }
      this.message = item;
    } else if (item.type === "function_call") {
      this.toolCalls.push(item);
    } else if (item.type === "function_call_output") {
      this.toolOutputs.push(item);
    }
    return this;
  }
  removeInvalidToolCalls() {
    if (this.toolCalls.length === this.toolOutputs.length) {
      return;
    }
    const toolCallIds = new Set(this.toolCalls.map((call) => call.callId));
    const toolOutputIds = new Set(this.toolOutputs.map((output) => output.callId));
    const validCallIds = intersection(toolCallIds, toolOutputIds);
    this.toolCalls = this.toolCalls.filter((call) => {
      if (validCallIds.has(call.callId)) return true;
      this.logger.warn(
        {
          callId: call.callId,
          toolName: call.name
        },
        "function call missing the corresponding function output, ignoring"
      );
      return false;
    });
    this.toolOutputs = this.toolOutputs.filter((output) => {
      if (validCallIds.has(output.callId)) return true;
      this.logger.warn(
        {
          callId: output.callId,
          toolName: output.name
        },
        "function output missing the corresponding function call, ignoring"
      );
      return false;
    });
  }
  flatten() {
    const items = [];
    if (this.message) items.push(this.message);
    items.push(...this.toolCalls, ...this.toolOutputs);
    return items;
  }
}
function intersection(set1, set2) {
  return new Set([...set1].filter((item) => set2.has(item)));
}
function groupToolCalls(chatCtx) {
  const itemGroups = {};
  const insertionOrder = {};
  const toolOutputs = [];
  const logger = log();
  let insertionIndex = 0;
  for (const item of chatCtx.items) {
    const isAssistantMessage = item.type === "message" && item.role === "assistant";
    const isFunctionCall = item.type === "function_call";
    const isFunctionCallOutput = item.type === "function_call_output";
    if (isAssistantMessage || isFunctionCall) {
      const groupId = item.id.split("/")[0];
      if (itemGroups[groupId] === void 0) {
        itemGroups[groupId] = ChatItemGroup.create();
        insertionOrder[groupId] = insertionIndex;
        insertionIndex++;
      }
      itemGroups[groupId].add(item);
    } else if (isFunctionCallOutput) {
      toolOutputs.push(item);
    } else {
      itemGroups[item.id] = ChatItemGroup.create().add(item);
    }
  }
  const callIdToGroup = {};
  for (const group of Object.values(itemGroups)) {
    for (const toolCall of group.toolCalls) {
      callIdToGroup[toolCall.callId] = group;
    }
  }
  for (const toolOutput of toolOutputs) {
    const group = callIdToGroup[toolOutput.callId];
    if (group === void 0) {
      logger.warn(
        { callId: toolOutput.callId, toolName: toolOutput.name },
        "function output missing the corresponding function call, ignoring"
      );
      continue;
    }
    group.add(toolOutput);
  }
  for (const group of Object.values(itemGroups)) {
    group.removeInvalidToolCalls();
  }
  const orderedGroups = Object.entries(itemGroups).sort((a, b) => insertionOrder[a[0]] - insertionOrder[b[0]]).map(([, group]) => group);
  return orderedGroups;
}
export {
  groupToolCalls
};
//# sourceMappingURL=utils.js.map