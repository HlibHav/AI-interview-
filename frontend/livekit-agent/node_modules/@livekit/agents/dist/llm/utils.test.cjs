"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var import_rtc_node = require("@livekit/rtc-node");
var import_sharp = __toESM(require("sharp"), 1);
var import_vitest = require("vitest");
var import_chat_context = require("./chat_context.cjs");
var import_utils = require("./utils.cjs");
function createChatMessage(id, content, role = "user") {
  return import_chat_context.ChatMessage.create({
    id,
    content,
    role
  });
}
function createChatContext(messages) {
  const ctx = new import_chat_context.ChatContext();
  for (const message of messages) {
    ctx.items.push(message);
  }
  return ctx;
}
function createImageContent(image, inferenceDetail = "auto", options) {
  return {
    id: "test-id",
    type: "image_content",
    image,
    inferenceDetail,
    mimeType: options == null ? void 0 : options.mimeType,
    inferenceWidth: options == null ? void 0 : options.inferenceWidth,
    inferenceHeight: options == null ? void 0 : options.inferenceHeight,
    _cache: {}
  };
}
async function decodeImageToRaw(base64Data) {
  const imageBuffer = Buffer.from(base64Data, "base64");
  const decodedImage = await (0, import_sharp.default)(imageBuffer).raw().toBuffer({ resolveWithObject: true });
  return { imageBuffer, decodedImage };
}
function createSolidColorFrame(width, height, color, bufferType = import_rtc_node.VideoBufferType.RGBA) {
  const channels = bufferType === import_rtc_node.VideoBufferType.RGB24 ? 3 : 4;
  const frameData = new Uint8Array(width * height * channels);
  for (let i = 0; i < frameData.length; i += channels) {
    frameData[i] = color.r;
    frameData[i + 1] = color.g;
    frameData[i + 2] = color.b;
    if (channels === 4 && color.a !== void 0) {
      frameData[i + 3] = color.a;
    }
  }
  return new import_rtc_node.VideoFrame(frameData, width, height, bufferType);
}
function createGradientFrame(width, height) {
  const channels = 4;
  const frameData = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      frameData[idx] = Math.floor(x / (width - 1) * 255);
      frameData[idx + 1] = Math.floor(y / (height - 1) * 255);
      frameData[idx + 2] = 128;
      frameData[idx + 3] = 255;
    }
  }
  return new import_rtc_node.VideoFrame(frameData, width, height, import_rtc_node.VideoBufferType.RGBA);
}
function createPatternFrame(width, height, patterns) {
  const channels = 4;
  const frameData = new Uint8Array(width * height * channels);
  for (let i = 0; i < patterns.length; i++) {
    const offset = i * 4;
    const pattern = patterns[i];
    frameData[offset] = pattern[0];
    frameData[offset + 1] = pattern[1];
    frameData[offset + 2] = pattern[2];
    frameData[offset + 3] = pattern[3];
  }
  return new import_rtc_node.VideoFrame(frameData, width, height, import_rtc_node.VideoBufferType.RGBA);
}
function verifyPngHeader(imageBuffer) {
  (0, import_vitest.expect)(imageBuffer[0]).toBe(137);
  (0, import_vitest.expect)(imageBuffer[1]).toBe(80);
  (0, import_vitest.expect)(imageBuffer[2]).toBe(78);
  (0, import_vitest.expect)(imageBuffer[3]).toBe(71);
}
function expectPixel(data, index, expected) {
  (0, import_vitest.expect)(data[index]).toBe(expected.r);
  (0, import_vitest.expect)(data[index + 1]).toBe(expected.g);
  (0, import_vitest.expect)(data[index + 2]).toBe(expected.b);
  (0, import_vitest.expect)(data[index + 3]).toBe(expected.a);
}
(0, import_vitest.describe)("computeChatCtxDiff", () => {
  (0, import_vitest.it)("should return empty operations for identical contexts", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const oldCtx = createChatContext([msg1, msg2]);
    const newCtx = createChatContext([msg1, msg2]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual([]);
    (0, import_vitest.expect)(result.toCreate).toEqual([]);
  });
  (0, import_vitest.it)("should handle empty old context", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const oldCtx = createChatContext([]);
    const newCtx = createChatContext([msg1, msg2]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual([]);
    (0, import_vitest.expect)(result.toCreate).toEqual([
      [null, "1"],
      // first item goes to root
      ["1", "2"]
    ]);
  });
  (0, import_vitest.it)("should handle empty new context", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const oldCtx = createChatContext([msg1, msg2]);
    const newCtx = createChatContext([]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual(["1", "2"]);
    (0, import_vitest.expect)(result.toCreate).toEqual([]);
  });
  (0, import_vitest.it)("should handle adding items to the end", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const oldCtx = createChatContext([msg1, msg2]);
    const newCtx = createChatContext([msg1, msg2, msg3]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual([]);
    (0, import_vitest.expect)(result.toCreate).toEqual([["2", "3"]]);
  });
  (0, import_vitest.it)("should handle removing items from the end", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const oldCtx = createChatContext([msg1, msg2, msg3]);
    const newCtx = createChatContext([msg1, msg2]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual(["3"]);
    (0, import_vitest.expect)(result.toCreate).toEqual([]);
  });
  (0, import_vitest.it)("should handle adding items to the beginning", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const oldCtx = createChatContext([msg2, msg3]);
    const newCtx = createChatContext([msg1, msg2, msg3]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual([]);
    (0, import_vitest.expect)(result.toCreate).toEqual([[null, "1"]]);
  });
  (0, import_vitest.it)("should handle removing items from the beginning", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const oldCtx = createChatContext([msg1, msg2, msg3]);
    const newCtx = createChatContext([msg2, msg3]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual(["1"]);
    (0, import_vitest.expect)(result.toCreate).toEqual([]);
  });
  (0, import_vitest.it)("should handle adding items in the middle", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const msg4 = createChatMessage("4", "Fine thanks", "assistant");
    const oldCtx = createChatContext([msg1, msg3, msg4]);
    const newCtx = createChatContext([msg1, msg2, msg3, msg4]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual([]);
    (0, import_vitest.expect)(result.toCreate).toEqual([["1", "2"]]);
  });
  (0, import_vitest.it)("should handle removing items from the middle", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const msg4 = createChatMessage("4", "Fine thanks", "assistant");
    const oldCtx = createChatContext([msg1, msg2, msg3, msg4]);
    const newCtx = createChatContext([msg1, msg3, msg4]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual(["2"]);
    (0, import_vitest.expect)(result.toCreate).toEqual([]);
  });
  (0, import_vitest.it)("should handle complex mixed operations", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const msg4 = createChatMessage("4", "Fine thanks", "assistant");
    const msg5 = createChatMessage("5", "Good to hear", "user");
    const msg6 = createChatMessage("6", "Anything else?", "assistant");
    const oldCtx = createChatContext([msg1, msg2, msg3, msg4]);
    const newCtx = createChatContext([msg1, msg5, msg3, msg6]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual(["2", "4"]);
    (0, import_vitest.expect)(result.toCreate).toEqual([
      ["1", "5"],
      ["3", "6"]
    ]);
  });
  (0, import_vitest.it)("should handle reordering items", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const oldCtx = createChatContext([msg1, msg2, msg3]);
    const newCtx = createChatContext([msg3, msg1, msg2]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove.length + result.toCreate.length).toBeGreaterThan(0);
  });
  (0, import_vitest.it)("should handle identical single item contexts", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const oldCtx = createChatContext([msg1]);
    const newCtx = createChatContext([msg1]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual([]);
    (0, import_vitest.expect)(result.toCreate).toEqual([]);
  });
  (0, import_vitest.it)("should handle longest common subsequence correctly", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const msg4 = createChatMessage("4", "Fine thanks", "assistant");
    const msg5 = createChatMessage("5", "Good to hear", "user");
    const oldCtx = createChatContext([msg1, msg2, msg3, msg4, msg5]);
    const newCtx = createChatContext([msg1, msg3, msg5]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual(["2", "4"]);
    (0, import_vitest.expect)(result.toCreate).toEqual([]);
  });
  (0, import_vitest.it)("should handle interleaved additions and common subsequence", () => {
    const msg1 = createChatMessage("1", "Hello", "user");
    const msg2 = createChatMessage("2", "Hi there", "assistant");
    const msg3 = createChatMessage("3", "How are you?", "user");
    const msg4 = createChatMessage("4", "Fine thanks", "assistant");
    const msg5 = createChatMessage("5", "Good to hear", "user");
    const msg6 = createChatMessage("6", "Anything else?", "assistant");
    const oldCtx = createChatContext([msg1, msg3, msg5]);
    const newCtx = createChatContext([msg1, msg2, msg3, msg4, msg5, msg6]);
    const result = (0, import_utils.computeChatCtxDiff)(oldCtx, newCtx);
    (0, import_vitest.expect)(result.toRemove).toEqual([]);
    (0, import_vitest.expect)(result.toCreate).toEqual([
      ["1", "2"],
      ["3", "4"],
      ["5", "6"]
    ]);
  });
});
(0, import_vitest.describe)("serializeImage", () => {
  let consoleWarnSpy;
  (0, import_vitest.beforeEach)(() => {
    consoleWarnSpy = import_vitest.vi.spyOn(console, "warn").mockImplementation(() => {
    });
    import_vitest.vi.clearAllMocks();
  });
  (0, import_vitest.describe)("Data URL handling", () => {
    (0, import_vitest.it)("should serialize a valid JPEG data URL", async () => {
      const originalBase64 = "/9j/4AAQSkZJRg==";
      const imageContent = createImageContent(`data:image/jpeg;base64,${originalBase64}`, "high");
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toEqual({
        base64Data: originalBase64,
        mimeType: "image/jpeg",
        inferenceDetail: "high"
      });
      (0, import_vitest.expect)(result.base64Data).toBe(originalBase64);
    });
    (0, import_vitest.it)("should serialize a valid PNG data URL", async () => {
      const imageContent = createImageContent(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
        "low"
      );
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toEqual({
        base64Data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
        mimeType: "image/png",
        inferenceDetail: "low"
      });
    });
    (0, import_vitest.it)("should serialize a valid WebP data URL", async () => {
      const imageContent = createImageContent(
        "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAA",
        "auto"
      );
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toEqual({
        base64Data: "UklGRiQAAABXRUJQVlA4IBgAAAA",
        mimeType: "image/webp",
        inferenceDetail: "auto"
      });
    });
    (0, import_vitest.it)("should serialize a valid GIF data URL", async () => {
      const imageContent = createImageContent(
        "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
        "auto"
      );
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toEqual({
        base64Data: "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
        mimeType: "image/gif",
        inferenceDetail: "auto"
      });
    });
    (0, import_vitest.it)("should warn and use provided mimeType when it differs from data URL mime type", async () => {
      const imageContent = createImageContent("data:image/jpeg;base64,/9j/4AAQSkZJRg==", "auto", {
        mimeType: "image/png"
      });
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(consoleWarnSpy).toHaveBeenCalledWith(
        "Provided mimeType 'image/png' does not match data URL mime type 'image/jpeg'. Using provided mimeType."
      );
      (0, import_vitest.expect)(result).toEqual({
        base64Data: "/9j/4AAQSkZJRg==",
        mimeType: "image/png",
        inferenceDetail: "auto"
      });
    });
    (0, import_vitest.it)("should throw error for invalid data URL format", async () => {
      const imageContent = createImageContent("data:;base64,/9j/4AAQSkZJRg==", "auto");
      await (0, import_vitest.expect)((0, import_utils.serializeImage)(imageContent)).rejects.toThrow("Invalid data URL format");
    });
    (0, import_vitest.it)("should throw error for unsupported mime type", async () => {
      const imageContent = createImageContent(
        "data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAA",
        "auto"
      );
      await (0, import_vitest.expect)((0, import_utils.serializeImage)(imageContent)).rejects.toThrow(
        "Unsupported mimeType image/bmp. Must be jpeg, png, webp, or gif"
      );
    });
  });
  (0, import_vitest.describe)("External URL handling", () => {
    (0, import_vitest.it)("should serialize an external URL without mimeType", async () => {
      const imageContent = createImageContent("https://example.com/image.jpg", "high");
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toEqual({
        mimeType: void 0,
        inferenceDetail: "high",
        externalUrl: "https://example.com/image.jpg"
      });
    });
    (0, import_vitest.it)("should serialize an external URL with mimeType", async () => {
      const imageContent = createImageContent("https://example.com/image.jpg", "low", {
        mimeType: "image/jpeg"
      });
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toEqual({
        mimeType: "image/jpeg",
        inferenceDetail: "low",
        externalUrl: "https://example.com/image.jpg"
      });
    });
  });
  (0, import_vitest.describe)("VideoFrame handling", () => {
    (0, import_vitest.it)("should serialize a VideoFrame without resize parameters", async () => {
      const width = 4;
      const height = 4;
      const videoFrame = createSolidColorFrame(width, height, { r: 255, g: 0, b: 0, a: 255 });
      const imageContent = createImageContent(videoFrame, "auto");
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toMatchObject({
        mimeType: "image/png",
        inferenceDetail: "auto"
      });
      (0, import_vitest.expect)(result.base64Data).toBeDefined();
      (0, import_vitest.expect)(result.base64Data).toMatch(/^[A-Za-z0-9+/]+=*$/);
      (0, import_vitest.expect)(result.externalUrl).toBeUndefined();
      const { imageBuffer, decodedImage } = await decodeImageToRaw(result.base64Data);
      verifyPngHeader(imageBuffer);
      (0, import_vitest.expect)(decodedImage.info.width).toBe(width);
      (0, import_vitest.expect)(decodedImage.info.height).toBe(height);
      (0, import_vitest.expect)(decodedImage.info.channels).toBe(4);
      const decodedData = decodedImage.data;
      for (let i = 0; i < decodedData.length; i += 4) {
        expectPixel(decodedData, i, { r: 255, g: 0, b: 0, a: 255 });
      }
    });
    (0, import_vitest.it)("should serialize a VideoFrame with a gradient pattern", async () => {
      const width = 8;
      const height = 8;
      const videoFrame = createGradientFrame(width, height);
      const imageContent = createImageContent(videoFrame, "high");
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result).toMatchObject({
        mimeType: "image/png",
        inferenceDetail: "high"
      });
      const { decodedImage } = await decodeImageToRaw(result.base64Data);
      (0, import_vitest.expect)(decodedImage.info.width).toBe(width);
      (0, import_vitest.expect)(decodedImage.info.height).toBe(height);
      const decodedData = decodedImage.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const expectedR = Math.floor(x / (width - 1) * 255);
          const expectedG = Math.floor(y / (height - 1) * 255);
          expectPixel(decodedData, idx, { r: expectedR, g: expectedG, b: 128, a: 255 });
        }
      }
    });
    (0, import_vitest.it)("should preserve exact pixel data through serialization", async () => {
      const width = 2;
      const height = 2;
      const patterns = [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 255, 255]
      ];
      const videoFrame = createPatternFrame(width, height, patterns);
      const imageContent = createImageContent(videoFrame, "low");
      const result = await (0, import_utils.serializeImage)(imageContent);
      const { decodedImage } = await decodeImageToRaw(result.base64Data);
      const decoded = decodedImage.data;
      expectPixel(decoded, 0, { r: 255, g: 0, b: 0, a: 255 });
      expectPixel(decoded, 4, { r: 0, g: 255, b: 0, a: 255 });
      expectPixel(decoded, width * 4, { r: 0, g: 0, b: 255, a: 255 });
      expectPixel(decoded, (width + 1) * 4, { r: 255, g: 255, b: 255, a: 255 });
    });
    (0, import_vitest.it)("should handle resize parameters correctly", async () => {
      const width = 2;
      const height = 2;
      const videoFrame = createSolidColorFrame(width, height, { r: 100, g: 100, b: 100, a: 255 });
      const imageContent = createImageContent(videoFrame, "auto", {
        inferenceWidth: 4,
        inferenceHeight: 4
      });
      const result = await (0, import_utils.serializeImage)(imageContent);
      const { decodedImage } = await decodeImageToRaw(result.base64Data);
      (0, import_vitest.expect)(decodedImage.info.width).toBe(4);
      (0, import_vitest.expect)(decodedImage.info.height).toBe(4);
      const decodedData = decodedImage.data;
      for (let i = 0; i < decodedData.length; i += 4) {
        (0, import_vitest.expect)(decodedData[i]).toBeCloseTo(100, -1);
        (0, import_vitest.expect)(decodedData[i + 1]).toBeCloseTo(100, -1);
        (0, import_vitest.expect)(decodedData[i + 2]).toBeCloseTo(100, -1);
        (0, import_vitest.expect)(decodedData[i + 3]).toBe(255);
      }
    });
    (0, import_vitest.it)("should handle RGB24 VideoBufferType correctly", async () => {
      const width = 2;
      const height = 2;
      const channels = 3;
      const frameData = new Uint8Array(width * height * channels);
      for (let i = 0; i < frameData.length; i += channels) {
        frameData[i] = 255;
        frameData[i + 1] = 128;
        frameData[i + 2] = 64;
      }
      const videoFrame = new import_rtc_node.VideoFrame(frameData, width, height, import_rtc_node.VideoBufferType.RGB24);
      const imageContent = createImageContent(videoFrame, "auto");
      const result = await (0, import_utils.serializeImage)(imageContent);
      (0, import_vitest.expect)(result.mimeType).toBe("image/png");
      const { decodedImage } = await decodeImageToRaw(result.base64Data);
      (0, import_vitest.expect)(decodedImage.info.channels).toBeGreaterThanOrEqual(3);
      const decodedData = decodedImage.data;
      const decodedChannels = decodedImage.info.channels;
      for (let i = 0; i < decodedData.length; i += decodedChannels) {
        (0, import_vitest.expect)(decodedData[i]).toBe(255);
        (0, import_vitest.expect)(decodedData[i + 1]).toBe(128);
        (0, import_vitest.expect)(decodedData[i + 2]).toBe(64);
        if (decodedChannels === 4) {
          (0, import_vitest.expect)(decodedData[i + 3]).toBe(255);
        }
      }
    });
    (0, import_vitest.it)("should handle different RGBA-like formats correctly", async () => {
      const width = 1;
      const height = 1;
      const testFormats = [
        import_rtc_node.VideoBufferType.RGBA,
        import_rtc_node.VideoBufferType.BGRA,
        import_rtc_node.VideoBufferType.ARGB,
        import_rtc_node.VideoBufferType.ABGR
      ];
      for (const format of testFormats) {
        const frameData = new Uint8Array([100, 150, 200, 250]);
        const videoFrame = new import_rtc_node.VideoFrame(frameData, width, height, format);
        const imageContent = createImageContent(videoFrame, "auto");
        const result = await (0, import_utils.serializeImage)(imageContent);
        (0, import_vitest.expect)(result.mimeType).toBe("image/png");
        (0, import_vitest.expect)(result.base64Data).toBeDefined();
      }
    });
  });
  (0, import_vitest.describe)("Error handling", () => {
    (0, import_vitest.it)("should throw error for unsupported image type", async () => {
      const imageContent = createImageContent(123, "auto");
      await (0, import_vitest.expect)((0, import_utils.serializeImage)(imageContent)).rejects.toThrow("Unsupported image type");
    });
  });
});
//# sourceMappingURL=utils.test.cjs.map