import { VideoBufferType, VideoFrame } from "@livekit/rtc-node";
import sharp from "sharp";
import { ZodObject } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  FunctionCall,
  FunctionCallOutput
} from "./chat_context.js";
function getChannelsFromVideoBufferType(type) {
  switch (type) {
    case VideoBufferType.RGBA:
    case VideoBufferType.ABGR:
    case VideoBufferType.ARGB:
    case VideoBufferType.BGRA:
      return 4;
    case VideoBufferType.RGB24:
      return 3;
    default:
      throw new Error(`Unsupported VideoBufferType: ${type}. Only RGB/RGBA formats are supported.`);
  }
}
function ensureRGBCompatible(frame) {
  if (frame.type === VideoBufferType.RGBA || frame.type === VideoBufferType.BGRA || frame.type === VideoBufferType.ARGB || frame.type === VideoBufferType.ABGR || frame.type === VideoBufferType.RGB24) {
    return frame;
  }
  try {
    return frame.convert(VideoBufferType.RGBA);
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
  } else if (image.image instanceof VideoFrame) {
    const frame = ensureRGBCompatible(image.image);
    const channels = getChannelsFromVideoBufferType(frame.type);
    let encoded = sharp(frame.data, {
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
  const { properties, required, additionalProperties } = zodToJsonSchema(p, {
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
  return FunctionCall.create({
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
    return FunctionCallOutput.create({
      callId: toolCall.callId,
      output: `Invalid JSON: ${error}`,
      isError: true
    });
  }
  try {
    if (tool.parameters instanceof ZodObject) {
      params = tool.parameters.parse(args);
    } else {
      params = args;
    }
  } catch (error) {
    return FunctionCallOutput.create({
      callId: toolCall.callId,
      output: `Arguments parsing failed: ${error}`,
      isError: true
    });
  }
  try {
    const result = await tool.execute(params, createToolOptions(toolCall.callId));
    return FunctionCallOutput.create({
      callId: toolCall.callId,
      output: JSON.stringify(result),
      isError: false
    });
  } catch (error) {
    return FunctionCallOutput.create({
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
  if (schema instanceof ZodObject) {
    return oaiParams(schema, isOpenai);
  }
  return schema;
}
export {
  computeChatCtxDiff,
  createToolOptions,
  executeToolCall,
  oaiBuildFunctionInfo,
  oaiParams,
  serializeImage,
  toJsonSchema
};
//# sourceMappingURL=utils.js.map