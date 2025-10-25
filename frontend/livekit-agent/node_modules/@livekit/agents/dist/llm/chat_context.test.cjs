"use strict";
var import_vitest = require("vitest");
var import_chat_context = require("./chat_context.cjs");
(0, import_vitest.describe)("ChatContext.toJSON", () => {
  (0, import_vitest.it)("should match snapshot for empty context", () => {
    const context = new import_chat_context.ChatContext();
    (0, import_vitest.expect)(context.toJSON()).toMatchSnapshot();
  });
  (0, import_vitest.it)("should match snapshot for simple conversation", () => {
    const context = new import_chat_context.ChatContext();
    context.addMessage({
      id: "msg_system_1",
      role: "system",
      content: "You are a helpful assistant.",
      createdAt: 1e9
    });
    context.addMessage({
      id: "msg_user_1",
      role: "user",
      content: "Hello, how are you?",
      createdAt: 1000000001
    });
    context.addMessage({
      id: "msg_assistant_1",
      role: "assistant",
      content: "I'm doing well, thank you! How can I help you today?",
      createdAt: 1000000002
    });
    (0, import_vitest.expect)(context.toJSON()).toMatchSnapshot("simple-conversation-no-timestamps");
    (0, import_vitest.expect)(context.toJSON({ excludeTimestamp: false })).toMatchSnapshot(
      "simple-conversation-with-timestamps"
    );
  });
  (0, import_vitest.it)("should match snapshot for multimodal content", () => {
    const context = new import_chat_context.ChatContext();
    const imageContent = {
      id: "img_test_1",
      type: "image_content",
      image: "https://example.com/test-image.jpg",
      inferenceDetail: "high",
      inferenceWidth: 1024,
      inferenceHeight: 768,
      mimeType: "image/jpeg",
      _cache: {}
    };
    const audioContent = {
      type: "audio_content",
      frame: [],
      // This won't be included in JSON
      transcript: "This is a test audio transcript"
    };
    context.addMessage({
      id: "msg_user_2",
      role: "user",
      content: [
        "Check out this image and audio:",
        imageContent,
        audioContent,
        "What do you think?"
      ],
      createdAt: 2e9
    });
    (0, import_vitest.expect)(context.toJSON()).toMatchSnapshot("multimodal-default-exclusions");
    (0, import_vitest.expect)(
      context.toJSON({
        excludeImage: false,
        excludeAudio: true
      })
    ).toMatchSnapshot("multimodal-with-images-only");
    (0, import_vitest.expect)(
      context.toJSON({
        excludeImage: true,
        excludeAudio: false
      })
    ).toMatchSnapshot("multimodal-with-audio-only");
    (0, import_vitest.expect)(
      context.toJSON({
        excludeImage: false,
        excludeAudio: false,
        excludeTimestamp: false
      })
    ).toMatchSnapshot("multimodal-full-content");
  });
  (0, import_vitest.it)("should match snapshot for function calls", () => {
    const context = new import_chat_context.ChatContext();
    context.addMessage({
      id: "msg_user_3",
      role: "user",
      content: "What's the weather in Paris?",
      createdAt: 3e9
    });
    const functionCall = new import_chat_context.FunctionCall({
      id: "func_call_1",
      callId: "call_weather_123",
      name: "get_weather",
      args: '{"location": "Paris, France", "unit": "celsius"}',
      createdAt: 3000000001
    });
    context.insert(functionCall);
    const functionOutput = new import_chat_context.FunctionCallOutput({
      id: "func_output_1",
      callId: "call_weather_123",
      name: "get_weather",
      output: '{"temperature": 22, "condition": "partly cloudy", "humidity": 65}',
      isError: false,
      createdAt: 3000000002
    });
    context.insert(functionOutput);
    context.addMessage({
      id: "msg_assistant_2",
      role: "assistant",
      content: "The weather in Paris is currently 22\xB0C and partly cloudy with 65% humidity.",
      createdAt: 3000000003
    });
    (0, import_vitest.expect)(context.toJSON()).toMatchSnapshot("conversation-with-function-calls");
    (0, import_vitest.expect)(
      context.toJSON({
        excludeFunctionCall: true
      })
    ).toMatchSnapshot("conversation-without-function-calls");
    (0, import_vitest.expect)(
      context.toJSON({
        excludeTimestamp: false
      })
    ).toMatchSnapshot("conversation-with-function-calls-and-timestamps");
  });
  (0, import_vitest.it)("should match snapshot for edge cases", () => {
    const context = new import_chat_context.ChatContext();
    context.addMessage({
      id: "msg_empty_1",
      role: "user",
      content: [],
      createdAt: 5e9
    });
    const silentAudio = {
      type: "audio_content",
      frame: [],
      transcript: void 0
    };
    context.addMessage({
      id: "msg_silent_audio",
      role: "user",
      content: [silentAudio],
      createdAt: 5000000001
    });
    context.addMessage({
      id: "msg_multi_text",
      role: "assistant",
      content: ["Part 1. ", "Part 2. ", "Part 3."],
      createdAt: 5000000002
    });
    const minimalCall = new import_chat_context.FunctionCall({
      id: "func_minimal",
      callId: "minimal",
      name: "test",
      args: "{}",
      createdAt: 5000000003
    });
    context.insert(minimalCall);
    const namelessOutput = new import_chat_context.FunctionCallOutput({
      id: "func_output_nameless",
      callId: "minimal",
      output: "OK",
      isError: false,
      createdAt: 5000000004
    });
    context.insert(namelessOutput);
    context.addMessage({
      id: "msg_special_chars",
      role: "user",
      content: `Test with special chars: 
	\r "quotes" 'apostrophes' \\backslashes\\ {braces} [brackets]`,
      createdAt: 5000000005
    });
    (0, import_vitest.expect)(context.toJSON()).toMatchSnapshot("edge-cases-default");
    (0, import_vitest.expect)(
      context.toJSON({
        excludeTimestamp: false,
        excludeAudio: false
      })
    ).toMatchSnapshot("edge-cases-with-details");
  });
  (0, import_vitest.it)("should match snapshot for message property variations", () => {
    const context = new import_chat_context.ChatContext();
    context.addMessage({
      id: "custom-message-id-123",
      role: "user",
      content: "Message with custom ID",
      createdAt: 6e9
    });
    context.addMessage({
      id: "msg_interrupted",
      role: "assistant",
      content: "This response was interrupted...",
      interrupted: true,
      createdAt: 6000000001
    });
    context.addMessage({
      id: "msg_dev_2",
      role: "developer",
      content: "Developer message",
      createdAt: 6000000002
    });
    context.addMessage({
      id: "msg_system_3",
      role: "system",
      content: "System message",
      createdAt: 6000000003
    });
    const detailedImage = {
      id: "img_detailed",
      type: "image_content",
      image: "https://example.com/image.jpg",
      inferenceDetail: "low",
      inferenceWidth: 512,
      inferenceHeight: 512,
      mimeType: "image/png",
      _cache: { cached: true }
    };
    context.addMessage({
      id: "msg_with_image",
      role: "user",
      content: ["Image with all properties:", detailedImage],
      createdAt: 6000000004
    });
    (0, import_vitest.expect)(context.toJSON()).toMatchSnapshot("message-properties-default");
    (0, import_vitest.expect)(
      context.toJSON({
        excludeImage: false,
        excludeTimestamp: false
      })
    ).toMatchSnapshot("message-properties-full");
  });
});
(0, import_vitest.describe)("ReadonlyChatContext with immutable array", () => {
  (0, import_vitest.it)("should have readonly property set to true", () => {
    const items = [
      new import_chat_context.ChatMessage({
        id: "msg_1",
        role: "user",
        content: ["Test"],
        interrupted: false,
        createdAt: Date.now()
      })
    ];
    const readonlyContext = new import_chat_context.ReadonlyChatContext(items);
    (0, import_vitest.expect)(readonlyContext.readonly).toBe(true);
  });
  (0, import_vitest.it)("should prevent setting items property", () => {
    const items = [
      new import_chat_context.ChatMessage({
        id: "msg_1",
        role: "user",
        content: ["Test"],
        interrupted: false,
        createdAt: Date.now()
      })
    ];
    const readonlyContext = new import_chat_context.ReadonlyChatContext(items);
    (0, import_vitest.expect)(() => {
      readonlyContext.items = [];
    }).toThrow(
      `Cannot set items on a read-only chat context. Please use .copy() and agent.update_chat_ctx() to modify the chat context.`
    );
  });
  (0, import_vitest.it)("should prevent modifications through array methods", () => {
    const items = [
      new import_chat_context.ChatMessage({
        id: "msg_1",
        role: "user",
        content: ["Test"],
        interrupted: false,
        createdAt: Date.now()
      })
    ];
    const readonlyContext = new import_chat_context.ReadonlyChatContext(items);
    const newItem = new import_chat_context.ChatMessage({
      id: "msg_2",
      role: "assistant",
      content: ["Response"],
      interrupted: false,
      createdAt: Date.now()
    });
    const mutableItems = readonlyContext.items;
    (0, import_vitest.expect)(() => mutableItems.push(newItem)).toThrow(
      "Cannot call push() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.pop()).toThrow(
      "Cannot call pop() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.shift()).toThrow(
      "Cannot call shift() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.unshift(newItem)).toThrow(
      "Cannot call unshift() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.splice(0, 1)).toThrow(
      "Cannot call splice() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.sort()).toThrow(
      "Cannot call sort() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.reverse()).toThrow(
      "Cannot call reverse() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.fill(newItem)).toThrow(
      "Cannot call fill() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
    (0, import_vitest.expect)(() => mutableItems.copyWithin(0, 1)).toThrow(
      "Cannot call copyWithin() on a read-only array. Please use .copy() and agent.update_chat_ctx() to modify the chat context."
    );
  });
  (0, import_vitest.it)("should prevent bracket notation assignment and deletion", () => {
    const items = [
      new import_chat_context.ChatMessage({
        id: "msg_1",
        role: "user",
        content: ["Test"],
        interrupted: false,
        createdAt: Date.now()
      })
    ];
    const readonlyContext = new import_chat_context.ReadonlyChatContext(items);
    const newItem = new import_chat_context.ChatMessage({
      id: "msg_2",
      role: "assistant",
      content: ["Response"],
      interrupted: false,
      createdAt: Date.now()
    });
    (0, import_vitest.expect)(() => {
      readonlyContext.items[0] = newItem;
    }).toThrow(
      'Cannot assign to read-only array index "0". Please use .copy() and agent.update_chat_ctx() to modify the chat context.'
    );
    (0, import_vitest.expect)(() => {
      delete readonlyContext.items[0];
    }).toThrow(
      'Cannot delete read-only array index "0". Please use .copy() and agent.update_chat_ctx() to modify the chat context.'
    );
    (0, import_vitest.expect)(() => {
      readonlyContext.items[99] = newItem;
    }).toThrow(
      'Cannot assign to read-only array index "99". Please use .copy() and agent.update_chat_ctx() to modify the chat context.'
    );
  });
  (0, import_vitest.it)("should allow read operations on the immutable array", () => {
    const items = [
      new import_chat_context.ChatMessage({
        id: "msg_1",
        role: "user",
        content: ["Test 1"],
        interrupted: false,
        createdAt: 1e3
      }),
      new import_chat_context.ChatMessage({
        id: "msg_2",
        role: "assistant",
        content: ["Test 2"],
        interrupted: false,
        createdAt: 2e3
      })
    ];
    const readonlyContext = new import_chat_context.ReadonlyChatContext(items);
    (0, import_vitest.expect)(readonlyContext.items.length).toBe(2);
    (0, import_vitest.expect)(readonlyContext.items[0]).toEqual(items[0]);
    (0, import_vitest.expect)(readonlyContext.items[1]).toEqual(items[1]);
    (0, import_vitest.expect)(readonlyContext.items.find((item) => item.id === "msg_2")).toEqual(items[1]);
    (0, import_vitest.expect)(readonlyContext.items.map((item) => item.id)).toEqual(["msg_1", "msg_2"]);
    (0, import_vitest.expect)(
      readonlyContext.items.filter(
        (item) => item.type === "message" && item.role === "user"
      )
    ).toHaveLength(1);
    const ids = [];
    readonlyContext.items.forEach((item) => ids.push(item.id));
    (0, import_vitest.expect)(ids).toEqual(["msg_1", "msg_2"]);
  });
});
//# sourceMappingURL=chat_context.test.cjs.map