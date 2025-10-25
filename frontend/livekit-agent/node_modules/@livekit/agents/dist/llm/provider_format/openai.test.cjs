"use strict";
var import_rtc_node = require("@livekit/rtc-node");
var import_vitest = require("vitest");
var import_log = require("../../log.cjs");
var import_chat_context = require("../chat_context.cjs");
var import_utils = require("../utils.cjs");
var import_openai = require("./openai.cjs");
import_vitest.vi.mock("../utils.js", () => ({
  serializeImage: import_vitest.vi.fn()
}));
(0, import_vitest.describe)("toChatCtx", () => {
  const serializeImageMock = import_vitest.vi.mocked(import_utils.serializeImage);
  (0, import_log.initializeLogger)({ level: "silent", pretty: false });
  (0, import_vitest.beforeEach)(async () => {
    import_vitest.vi.clearAllMocks();
  });
  (0, import_vitest.it)("should convert simple text messages", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: "Hello" });
    ctx.addMessage({ role: "assistant", content: "Hi there!" });
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toHaveLength(2);
    (0, import_vitest.expect)(result[0]).toEqual({ role: "user", content: "Hello" });
    (0, import_vitest.expect)(result[1]).toEqual({ role: "assistant", content: "Hi there!" });
  });
  (0, import_vitest.it)("should handle system messages", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "system", content: "You are a helpful assistant" });
    ctx.addMessage({ role: "user", content: "Hello" });
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toHaveLength(2);
    (0, import_vitest.expect)(result[0]).toEqual({ role: "system", content: "You are a helpful assistant" });
    (0, import_vitest.expect)(result[1]).toEqual({ role: "user", content: "Hello" });
  });
  (0, import_vitest.it)("should handle multi-line text content", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({ role: "user", content: ["Line 1", "Line 2", "Line 3"] });
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toHaveLength(1);
    (0, import_vitest.expect)(result[0]).toEqual({ role: "user", content: "Line 1\nLine 2\nLine 3" });
  });
  (0, import_vitest.it)("should handle messages with external URL images", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "high",
      externalUrl: "https://example.com/image.jpg"
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
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "https://example.com/image.jpg",
              detail: "high"
            }
          },
          { type: "text", text: "Check out this image:" }
        ]
      }
    ]);
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
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "assistant",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
              detail: "auto"
            }
          },
          { type: "text", text: "Here is the image you requested" }
        ]
      }
    ]);
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
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
              detail: "low"
            }
          }
        ]
      }
    ]);
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
    await (0, import_openai.toChatCtx)(ctx);
    await (0, import_openai.toChatCtx)(ctx);
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
      output: '{"temperature": 72, "condition": "sunny"}',
      isError: false
    });
    ctx.insert([toolCall, toolOutput]);
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "assistant",
        content: "Let me help you with that.",
        tool_calls: [
          {
            type: "function",
            id: "call_123",
            function: {
              name: "get_weather",
              arguments: '{"location": "San Francisco"}'
            }
          }
        ]
      },
      {
        role: "tool",
        tool_call_id: "call_123",
        content: '{"temperature": 72, "condition": "sunny"}'
      }
    ]);
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
      output: '{"temperature": 65}',
      isError: false
    });
    const toolOutput2 = new import_chat_context.FunctionCallOutput({
      callId: "call_2",
      output: '{"temperature": 78}',
      isError: false
    });
    ctx.insert([toolCall1, toolCall2, toolOutput1, toolOutput2]);
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "assistant",
        content: "I'll check both locations.",
        tool_calls: [
          {
            type: "function",
            id: "call_1",
            function: { name: "get_weather", arguments: '{"location": "NYC"}' }
          },
          {
            type: "function",
            id: "call_2",
            function: { name: "get_weather", arguments: '{"location": "LA"}' }
          }
        ]
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        content: '{"temperature": 65}'
      },
      {
        role: "tool",
        tool_call_id: "call_2",
        content: '{"temperature": 78}'
      }
    ]);
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
      output: '{"result": 8}',
      isError: false
    });
    ctx.insert([toolCall, toolOutput]);
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "assistant",
        tool_calls: [
          {
            type: "function",
            id: "call_456",
            function: { name: "calculate", arguments: '{"a": 5, "b": 3}' }
          }
        ]
      },
      {
        role: "tool",
        tool_call_id: "call_456",
        content: '{"result": 8}'
      }
    ]);
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
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toHaveLength(2);
    (0, import_vitest.expect)(result).toContainEqual({ role: "user", content: "Hello" });
    (0, import_vitest.expect)(result).toContainEqual({ role: "assistant", content: "Hi!" });
  });
  (0, import_vitest.it)("should handle mixed content with text and multiple images", async () => {
    serializeImageMock.mockResolvedValueOnce({
      inferenceDetail: "high",
      externalUrl: "https://example.com/image1.jpg"
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
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "https://example.com/image1.jpg",
              detail: "high"
            }
          },
          {
            type: "image_url",
            image_url: {
              url: "data:image/png;base64,base64data",
              detail: "low"
            }
          },
          {
            type: "text",
            text: "Here are two images:\nAnd the second one:\nWhat do you think?"
          }
        ]
      }
    ]);
  });
  (0, import_vitest.it)("should handle content with only images and no text", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "auto",
      externalUrl: "https://example.com/image.jpg"
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
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "https://example.com/image.jpg",
              detail: "auto"
            }
          }
        ]
      }
    ]);
  });
  (0, import_vitest.it)("should throw error for unsupported content type", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: [
        {
          type: "audio_content",
          frame: []
        }
      ]
    });
    await (0, import_vitest.expect)((0, import_openai.toChatCtx)(ctx)).rejects.toThrow("Unsupported content type: audio_content");
  });
  (0, import_vitest.it)("should throw error when serialized image has no data", async () => {
    serializeImageMock.mockResolvedValue({
      inferenceDetail: "high"
      // No base64Data or externalUrl
    });
    const ctx = import_chat_context.ChatContext.empty();
    ctx.addMessage({
      role: "user",
      content: [
        {
          id: "img1",
          type: "image_content",
          image: "invalid-image",
          inferenceDetail: "high",
          _cache: {}
        }
      ]
    });
    await (0, import_vitest.expect)((0, import_openai.toChatCtx)(ctx)).rejects.toThrow("Serialized image has no data bytes");
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
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([]);
  });
  (0, import_vitest.it)("should handle function call output correctly", async () => {
    const ctx = import_chat_context.ChatContext.empty();
    const funcCall = new import_chat_context.FunctionCall({
      id: "func_1",
      callId: "call_output_test",
      name: "test_function",
      args: "{}"
    });
    const funcOutput = new import_chat_context.FunctionCallOutput({
      callId: "call_output_test",
      output: "Function executed successfully",
      isError: false
    });
    ctx.insert([funcCall, funcOutput]);
    const result = await (0, import_openai.toChatCtx)(ctx);
    (0, import_vitest.expect)(result).toEqual([
      {
        role: "assistant",
        tool_calls: [
          {
            id: "call_output_test",
            type: "function",
            function: {
              name: "test_function",
              arguments: "{}"
            }
          }
        ]
      },
      {
        role: "tool",
        tool_call_id: "call_output_test",
        content: "Function executed successfully"
      }
    ]);
  });
});
//# sourceMappingURL=openai.test.cjs.map