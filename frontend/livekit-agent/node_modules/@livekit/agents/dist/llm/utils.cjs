"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var utils_exports = {};
__export(utils_exports, {
  computeChatCtxDiff: () => computeChatCtxDiff,
  createToolOptions: () => createToolOptions,
  executeToolCall: () => executeToolCall,
  oaiBuildFunctionInfo: () => oaiBuildFunctionInfo,
  oaiParams: () => oaiParams,
  serializeImage: () => serializeImage,
  toJsonSchema: () => toJsonSchema
});
module.exports = __toCommonJS(utils_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_sharp = __toESM(require("sharp"), 1);
var import_zod = require("zod");
var import_zod_to_json_schema = require("zod-to-json-schema");
var import_chat_context = require("./chat_context.cjs");
function getChannelsFromVideoBufferType(type) {
  switch (type) {
    case import_rtc_node.VideoBufferType.RGBA:
    case import_rtc_node.VideoBufferType.ABGR:
    case import_rtc_node.VideoBufferType.ARGB:
    case import_rtc_node.VideoBufferType.BGRA:
      return 4;
    case import_rtc_node.VideoBufferType.RGB24:
      return 3;
    default:
      throw new Error(`Unsupported VideoBufferType: ${type}. Only RGB/RGBA formats are supported.`);
  }
}
function ensureRGBCompatible(frame) {
  if (frame.type === import_rtc_node.VideoBufferType.RGBA || frame.type === import_rtc_node.VideoBufferType.BGRA || frame.type === import_rtc_node.VideoBufferType.ARGB || frame.type === import_rtc_node.VideoBufferType.ABGR || frame.type === import_rtc_node.VideoBufferType.RGB24) {
    return frame;
  }
  try {
    return frame.convert(import_rtc_node.VideoBufferType.RGBA);
  } catch (error) {
    throw new Error(
      `Failed to convert format ${frame.type} to RGB: ${error}. Consider using RGB/RGBA formats or converting on the client side.`
    );
  }
}
async function serializeImage(image) {
  var _a;
  if (typeof image.image === "string") {
    if (image.image.startsWith("data:")) {
      const [header, base64Data] = image.image.split(",", 2);
      const headerParts = header.split(";");
      const mimeParts = (_a = headerParts[0]) == null ? void 0 : _a.split(":");
      const headerMime = mimeParts == null ? void 0 : mimeParts[1];
      if (!headerMime) {
        throw new Error("Invalid data URL format");
      }
      let mimeType;
      if (image.mimeType && image.mimeType !== headerMime) {
        console.warn(
          `Provided mimeType '${image.mimeType}' does not match data URL mime type '${headerMime}'. Using provided mimeType.`
        );
        mimeType = image.mimeType;
      } else {
        mimeType = headerMime;
      }
      const supportedTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
      if (!supportedTypes.has(mimeType)) {
        throw new Error(`Unsupported mimeType ${mimeType}. Must be jpeg, png, webp, or gif`);
      }
      return {
        base64Data,
        mimeType,
        inferenceDetail: image.inferenceDetail
      };
    }
    return {
      mimeType: image.mimeType,
      inferenceDetail: image.inferenceDetail,
      externalUrl: image.image
    };
  } else if (image.image instanceof import_rtc_node.VideoFrame) {
    const frame = ensureRGBCompatible(image.image);
    const channels = getChannelsFromVideoBufferType(frame.type);
    let encoded = (0, import_sharp.default)(frame.data, {
      raw: {
        width: frame.width,
        height: frame.height,
        channels
      }
    });
    if (image.inferenceWidth && image.inferenceHeight) {
      encoded = encoded.resize(image.inferenceWidth, image.inferenceHeight);
    }
    const base64Data = await encoded.png().toBuffer().then((buffer) => buffer.toString("base64"));
    return {
      base64Data,
      mimeType: "image/png",
      inferenceDetail: image.inferenceDetail
    };
  } else {
    throw new Error("Unsupported image type");
  }
}
const createToolOptions = (toolCallId, userData = {}) => {
  return { ctx: { userData }, toolCallId };
};
const oaiParams = (p, isOpenai = true) => {
  const { properties, required, additionalProperties } = (0, import_zod_to_json_schema.zodToJsonSchema)(p, {
    // note: openai mode breaks various gemini conversions
    target: isOpenai ? "openAi" : "jsonSchema7"
  });
  return {
    type: "object",
    properties,
    required,
    additionalProperties
  };
};
const oaiBuildFunctionInfo = (toolCtx, toolCallId, toolName, rawArgs) => {
  const tool = toolCtx[toolName];
  if (!tool) {
    throw new Error(`AI tool ${toolName} not found`);
  }
  return import_chat_context.FunctionCall.create({
    callId: toolCallId,
    name: toolName,
    args: rawArgs
  });
};
async function executeToolCall(toolCall, toolCtx) {
  const tool = toolCtx[toolCall.name];
  let args;
  let params;
  try {
    args = JSON.parse(toolCall.args);
  } catch (error) {
    return import_chat_context.FunctionCallOutput.create({
      callId: toolCall.callId,
      output: `Invalid JSON: ${error}`,
      isError: true
    });
  }
  try {
    if (tool.parameters instanceof import_zod.ZodObject) {
      params = tool.parameters.parse(args);
    } else {
      params = args;
    }
  } catch (error) {
    return import_chat_context.FunctionCallOutput.create({
      callId: toolCall.callId,
      output: `Arguments parsing failed: ${error}`,
      isError: true
    });
  }
  try {
    const result = await tool.execute(params, createToolOptions(toolCall.callId));
    return import_chat_context.FunctionCallOutput.create({
      callId: toolCall.callId,
      output: JSON.stringify(result),
      isError: false
    });
  } catch (error) {
    return import_chat_context.FunctionCallOutput.create({
      callId: toolCall.callId,
      output: `Tool execution failed: ${error}`,
      isError: true
    });
  }
}
function computeLCS(oldIds, newIds) {
  const n = oldIds.length;
  const m = newIds.length;
  const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
  for (let i2 = 1; i2 <= n; i2++) {
    for (let j2 = 1; j2 <= m; j2++) {
      if (oldIds[i2 - 1] === newIds[j2 - 1]) {
        dp[i2][j2] = dp[i2 - 1][j2 - 1] + 1;
      } else {
        dp[i2][j2] = Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
      }
    }
  }
  const lcsIds = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (oldIds[i - 1] === newIds[j - 1]) {
      lcsIds.push(oldIds[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return lcsIds.reverse();
}
function computeChatCtxDiff(oldCtx, newCtx) {
  const oldIds = oldCtx.items.map((item) => item.id);
  const newIds = newCtx.items.map((item) => item.id);
  const lcsIds = new Set(computeLCS(oldIds, newIds));
  const toRemove = oldCtx.items.filter((msg) => !lcsIds.has(msg.id)).map((msg) => msg.id);
  const toCreate = [];
  let lastIdInSequence = null;
  for (const newItem of newCtx.items) {
    if (lcsIds.has(newItem.id)) {
      lastIdInSequence = newItem.id;
    } else {
      const prevId = lastIdInSequence;
      toCreate.push([prevId, newItem.id]);
      lastIdInSequence = newItem.id;
    }
  }
  return {
    toRemove,
    toCreate
  };
}
function toJsonSchema(schema, isOpenai = true) {
  if (schema instanceof import_zod.ZodObject) {
    return oaiParams(schema, isOpenai);
  }
  return schema;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeChatCtxDiff,
  createToolOptions,
  executeToolCall,
  oaiBuildFunctionInfo,
  oaiParams,
  serializeImage,
  toJsonSchema
});
//# sourceMappingURL=utils.cjs.map