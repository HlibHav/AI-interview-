"use strict";
var import_vitest = require("vitest");
var import_stream_channel = require("./stream_channel.cjs");
(0, import_vitest.describe)("StreamChannel", () => {
  (0, import_vitest.it)("should write and read a single value", async () => {
    const channel = (0, import_stream_channel.createStreamChannel)();
    const reader = channel.stream().getReader();
    await channel.write("test value");
    await channel.close();
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toBe("test value");
    const nextResult = await reader.read();
    (0, import_vitest.expect)(nextResult.done).toBe(true);
  });
  (0, import_vitest.it)("should write and read multiple values in sequence", async () => {
    const channel = (0, import_stream_channel.createStreamChannel)();
    const reader = channel.stream().getReader();
    const testValues = ["first", "second", "third"];
    for (const value of testValues) {
      await channel.write(value);
    }
    await channel.close();
    const results = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    (0, import_vitest.expect)(results).toEqual(testValues);
  });
  (0, import_vitest.it)("should handle arrays", async () => {
    const channel = (0, import_stream_channel.createStreamChannel)();
    const reader = channel.stream().getReader();
    const testArray = [1, 2, 3, 4, 5];
    await channel.write(testArray);
    await channel.close();
    const result = await reader.read();
    (0, import_vitest.expect)(result.value).toEqual(testArray);
    (0, import_vitest.expect)(result.value).toBe(testArray);
  });
  (0, import_vitest.it)("should work with concurrent writing and reading", async () => {
    const channel = (0, import_stream_channel.createStreamChannel)();
    const reader = channel.stream().getReader();
    const testData = ["chunk1", "chunk2", "chunk3"];
    const results = [];
    const readPromise = (async () => {
      let result = await reader.read();
      while (!result.done) {
        results.push(result.value);
        result = await reader.read();
      }
    })();
    for (const chunk of testData) {
      await channel.write(chunk);
    }
    await channel.close();
    await readPromise;
    (0, import_vitest.expect)(results).toEqual(testData);
  });
  (0, import_vitest.it)("should handle empty stream", async () => {
    const channel = (0, import_stream_channel.createStreamChannel)();
    const reader = channel.stream().getReader();
    await channel.close();
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(true);
  });
  (0, import_vitest.it)("should handle non-awaited sequential writes", async () => {
    const channel = (0, import_stream_channel.createStreamChannel)();
    const reader = channel.stream().getReader();
    const testNumbers = Array.from({ length: 100 }, (_, i) => i);
    for (const num of testNumbers) {
      channel.write(num);
    }
    channel.close();
    const results = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    (0, import_vitest.expect)(results).toEqual(testNumbers);
  });
  (0, import_vitest.it)("should handle double closing without error", async () => {
    const channel = (0, import_stream_channel.createStreamChannel)();
    const reader = channel.stream().getReader();
    await channel.write("test");
    await channel.close();
    await (0, import_vitest.expect)(channel.close()).resolves.toBeUndefined();
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toBe("test");
    const nextResult = await reader.read();
    (0, import_vitest.expect)(nextResult.done).toBe(true);
  });
});
//# sourceMappingURL=stream_channel.test.cjs.map