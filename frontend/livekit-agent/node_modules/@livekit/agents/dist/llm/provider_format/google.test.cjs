"use strict";
var import_rtc_node = require("@livekit/rtc-node");
var import_vitest = require("vitest");
var import_log = require("../../log.cjs");
var import_chat_context = require("../chat_context.cjs");
var import_utils = require("../utils.cjs");
var import_google = require("./google.cjs");
import_vitest.vi.mock("../utils.js", () => ({
  serializeImage: import_vitest.vi.fn()
}));
(0, import_vitest.describe)("Google Provider Format - toChatCtx", () => {
  const serializeImageMock = import_vitest.vi.mocked(import_utils.serializeImage);
  (0, import_log.initializeLogger)({ level: "silent", pretty: false });
  (0, import_vitest.beforeEach)(async () => {
    import_vitest.vi.clearAllMocks();
  });
  (0, import_vitest.it)("should convert simple text messages", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: "Hello" });
    ctx.addMessage({ role: "assistant", content: "Hi there!" });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "Hello" }]
      },
      {
        role: "model",
        parts: [{ text: "Hi there!" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle system messages separately", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "system", content: "You are a helpful assistant" });
    ctx.addMessage({ role: "user", content: "Hello" });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "Hello" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toEqual(["You are a helpful assistant"]);
  });
  (0, import_vitest.it)("should handle multiple system messages", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "system", content: "You are a helpful assistant" });
    ctx.addMessage({ role: "system", content: "Be concise in your responses" });
    ctx.addMessage({ role: "user", content: "Hello" });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "Hello" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toEqual([
      "You are a helpful assistant",
      "Be concise in your responses"
    ]);
  });
  (0, import_vitest.it)("should handle multi-part text content", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: ["Line 1", "Line 2", "Line 3"] });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "Line 1" }, { text: "Line 2" }, { text: "Line 3" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle messages with external URL images", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "high",
      externalUrl: "https://example.com/image.jpg",
      mimeType: "image/jpeg"
    });
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: [
        "Check out this image:",
        {
          id: "img1",
          type: "image_content",
          image: "https://example.com/image.jpg",
          inferenceDetail: "high",
          _cache: {}
        }
      ]
    });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [
          { text: "Check out this image:" },
          {
            fileData: {
              fileUri: "https://example.com/image.jpg",
              mimeType: "image/jpeg"
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle messages with base64 images", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "auto",
      mimeType: "image/png",
      base64Data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"
    });
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "assistant",
      content: [
        {
          id: "img1",
          type: "image_content",
          image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
          inferenceDetail: "auto",
          _cache: {}
        },
        "Here is the image you requested"
      ]
    });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "model",
        parts: [
          {
            inlineData: {
              data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
              mimeType: "image/png"
            }
          },
          { text: "Here is the image you requested" }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle VideoFrame images", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "low",
      mimeType: "image/jpeg",
      base64Data: "/9j/4AAQSkZJRg=="
    });
    const frameData = new Uint8Array(4 * 4 * 4);
    const videoFrame = new import_rtc_node.VideoFrame(frameData, 4, 4, import_rtc_node.VideoBufferType.RGBA);
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: [
        {
          id: "frame1",
          type: "image_content",
          image: videoFrame,
          inferenceDetail: "low",
          _cache: {}
        }
      ]
    });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: "/9j/4AAQSkZJRg==",
              mimeType: "image/jpeg"
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should cache serialized images", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "high",
      mimeType: "image/png",
      base64Data: "cached-data"
    });
    const imageContent = {
      id: "img1",
      type: "image_content",
      image: "https://example.com/image.jpg",
      inferenceDetail: "high",
      _cache: {}
    };
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: [imageContent] });
    await (0, import_google.toChatCtx)(ctx, false);
    await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(serializeImageMock).toHaveBeenCalledTimes(1);
    (0, import_vitest.expect)(imageContent._cache).toHaveProperty("serialized_image");
  });
  (0, import_vitest.it)("should handle tool calls and outputs", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    const msg = ctx.addMessage({ role: "assistant", content: "Let me help you with that." });
    const toolCall = import_chat_context.FunctionCall.create({
      id: msg.id + "/tool_1",
      callId: "call_123",
      name: "get_weather",
      args: '{"location": "San Francisco"}'
    });
    const toolOutput = import_chat_context.FunctionCallOutput.create({
      callId: "call_123",
      name: "get_weather",
      output: '{"temperature": 72, "condition": "sunny"}',
      isError: false
    });
    ctx.insert([toolCall, toolOutput]);
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "model",
        parts: [
          { text: "Let me help you with that." },
          {
            functionCall: {
              id: "call_123",
              name: "get_weather",
              args: { location: "San Francisco" }
            }
          }
        ]
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: "call_123",
              name: "get_weather",
              response: { output: '{"temperature": 72, "condition": "sunny"}' }
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle multiple tool calls in one message", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    const msg = ctx.addMessage({ role: "assistant", content: "I'll check both locations." });
    const toolCall1 = new import_chat_context.FunctionCall({
      id: msg.id + "/tool_1",
      callId: "call_1",
      name: "get_weather",
      args: '{"location": "NYC"}'
    });
    const toolCall2 = new import_chat_context.FunctionCall({
      id: msg.id + "/tool_2",
      callId: "call_2",
      name: "get_weather",
      args: '{"location": "LA"}'
    });
    const toolOutput1 = new import_chat_context.FunctionCallOutput({
      callId: "call_1",
      name: "get_weather",
      output: '{"temperature": 65}',
      isError: false
    });
    const toolOutput2 = new import_chat_context.FunctionCallOutput({
      callId: "call_2",
      name: "get_weather",
      output: '{"temperature": 78}',
      isError: false
    });
    ctx.insert([toolCall1, toolCall2, toolOutput1, toolOutput2]);
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "model",
        parts: [
          { text: "I'll check both locations." },
          {
            functionCall: {
              id: "call_1",
              name: "get_weather",
              args: { location: "NYC" }
            }
          },
          {
            functionCall: {
              id: "call_2",
              name: "get_weather",
              args: { location: "LA" }
            }
          }
        ]
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: "call_1",
              name: "get_weather",
              response: { output: '{"temperature": 65}' }
            }
          },
          {
            functionResponse: {
              id: "call_2",
              name: "get_weather",
              response: { output: '{"temperature": 78}' }
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle tool calls without accompanying message", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    const toolCall = new import_chat_context.FunctionCall({
      id: "func_123",
      callId: "call_456",
      name: "calculate",
      args: '{"a": 5, "b": 3}'
    });
    const toolOutput = new import_chat_context.FunctionCallOutput({
      callId: "call_456",
      name: "calculate",
      output: '{"result": 8}',
      isError: false
    });
    ctx.insert([toolCall, toolOutput]);
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "model",
        parts: [
          {
            functionCall: {
              id: "call_456",
              name: "calculate",
              args: { a: 5, b: 3 }
            }
          }
        ]
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: "call_456",
              name: "calculate",
              response: { output: '{"result": 8}' }
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle tool call errors", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    const toolCall = new import_chat_context.FunctionCall({
      id: "func_error",
      callId: "call_error",
      name: "failing_function",
      args: "{}"
    });
    const toolOutput = new import_chat_context.FunctionCallOutput({
      callId: "call_error",
      name: "failing_function",
      output: "Function failed to execute",
      isError: true
    });
    ctx.insert([toolCall, toolOutput]);
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "model",
        parts: [
          {
            functionCall: {
              id: "call_error",
              name: "failing_function",
              args: {}
            }
          }
        ]
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: "call_error",
              name: "failing_function",
              response: { error: "Function failed to execute" }
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should inject dummy user message when last turn is not user", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: "Hello" });
    ctx.addMessage({ role: "assistant", content: "Hi there!" });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, true);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "Hello" }]
      },
      {
        role: "model",
        parts: [{ text: "Hi there!" }]
      },
      {
        role: "user",
        parts: [{ text: "." }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should not inject dummy user message when last turn is already user", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "assistant", content: "Hi there!" });
    ctx.addMessage({ role: "user", content: "Hello" });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, true);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "model",
        parts: [{ text: "Hi there!" }]
      },
      {
        role: "user",
        parts: [{ text: "Hello" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should not inject dummy user message when disabled", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: "Hello" });
    ctx.addMessage({ role: "assistant", content: "Hi there!" });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "Hello" }]
      },
      {
        role: "model",
        parts: [{ text: "Hi there!" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle mixed content with text and multiple images", async () => {
    serializeImageMock.mockResolvedValueOnce({
      inferenceDetail: "high",
      externalUrl: "https://example.com/image1.jpg",
      mimeType: "image/jpeg"
    }).mockResolvedValueOnce({
      inferenceDetail: "low",
      mimeType: "image/png",
      base64Data: "base64data"
    });
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: [
        "Here are two images:",
        {
          id: "img1",
          type: "image_content",
          image: "https://example.com/image1.jpg",
          inferenceDetail: "high",
          _cache: {}
        },
        "And the second one:",
        {
          id: "img2",
          type: "image_content",
          image: "data:image/png;base64,base64data",
          inferenceDetail: "low",
          _cache: {}
        },
        "What do you think?"
      ]
    });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [
          { text: "Here are two images:" },
          {
            fileData: {
              fileUri: "https://example.com/image1.jpg",
              mimeType: "image/jpeg"
            }
          },
          { text: "And the second one:" },
          {
            inlineData: {
              data: "base64data",
              mimeType: "image/png"
            }
          },
          { text: "What do you think?" }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle content with only images and no text", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "auto",
      externalUrl: "https://example.com/image.jpg",
      mimeType: "image/jpeg"
    });
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: [
        {
          id: "img1",
          type: "image_content",
          image: "https://example.com/image.jpg",
          inferenceDetail: "auto",
          _cache: {}
        }
      ]
    });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: "https://example.com/image.jpg",
              mimeType: "image/jpeg"
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should group consecutive messages by role", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: "First user message" });
    ctx.addMessage({ role: "user", content: "Second user message" });
    ctx.addMessage({ role: "assistant", content: "First assistant response" });
    ctx.addMessage({ role: "assistant", content: "Second assistant response" });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "First user message" }, { text: "Second user message" }]
      },
      {
        role: "model",
        parts: [{ text: "First assistant response" }, { text: "Second assistant response" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle empty content arrays", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: [] });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle image with default MIME type when missing", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "high",
      externalUrl: "https://example.com/image.jpg"
      // No mimeType provided
    });
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: [
        {
          id: "img1",
          type: "image_content",
          image: "https://example.com/image.jpg",
          inferenceDetail: "high",
          _cache: {}
        }
      ]
    });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: "https://example.com/image.jpg",
              mimeType: "image/jpeg"
              // Should default to image/jpeg
            }
          }
        ]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should skip empty groups", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: "Hello", createdAt: 1e3 });
    const orphanOutput = new import_chat_context.FunctionCallOutput({
      callId: "orphan_call",
      output: "This should be ignored",
      isError: false,
      createdAt: 2e3
    });
    ctx.insert(orphanOutput);
    ctx.addMessage({ role: "assistant", content: "Hi!", createdAt: 3e3 });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "Hello" }]
      },
      {
        role: "model",
        parts: [{ text: "Hi!" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should filter out standalone function calls without outputs", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    const funcCall = new import_chat_context.FunctionCall({
      id: "func_standalone",
      callId: "call_999",
      name: "standalone_function",
      args: "{}"
    });
    ctx.insert(funcCall);
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
  (0, import_vitest.it)("should handle mixed content types", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: ["First part", "Second part"]
    });
    const [result, formatData] = await (0, import_google.toChatCtx)(ctx, false);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        parts: [{ text: "First part" }, { text: "Second part" }]
      }
    ]);
    (0, import_vitest.expect)(formatData.systemMessages).toBeNull();
  });
});
//# sourceMappingURL=google.test.cjs.map