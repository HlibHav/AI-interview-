"use strict";
var import_web = require("node:stream/web");
var import_vitest = require("vitest");
var import_utils = require("../utils.cjs");
var import_deferred_stream = require("./deferred_stream.cjs");
(0, import_vitest.describe)("DeferredReadableStream", () => {
  (0, import_vitest.it)("should create a readable stream that can be read after setting source", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const testData = ["chunk1", "chunk2", "chunk3"];
    const source = new import_web.ReadableStream({
      start(controller) {
        for (const chunk of testData) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });
    deferred.setSource(source);
    const results = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    (0, import_vitest.expect)(results).toEqual(testData);
  });
  (0, import_vitest.it)("should allow reading from stream before source is set", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const readPromise = reader.read();
    await (0, import_utils.delay)(10);
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("test-value");
        controller.close();
      }
    });
    deferred.setSource(source);
    const result = await readPromise;
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toBe("test-value");
    const nextResult = await reader.read();
    (0, import_vitest.expect)(nextResult.done).toBe(true);
  });
  (0, import_vitest.it)("should throw error when trying to set source on locked stream", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("test");
        controller.close();
      }
    });
    const source2 = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("test2");
        controller.close();
      }
    });
    (0, import_vitest.expect)(() => deferred.setSource(source)).not.toThrow();
    (0, import_vitest.expect)(() => deferred.setSource(source2)).toThrow("Stream source already set");
    reader.releaseLock();
  });
  (0, import_vitest.it)("should handle multiple concurrent readers before source is set", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const [stream1, stream2] = deferred.stream.tee();
    const reader1 = stream1.getReader();
    const reader2 = stream2.getReader();
    const read1Promise = reader1.read();
    const read2Promise = reader2.read();
    await (0, import_utils.delay)(10);
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue(42);
        controller.enqueue(84);
        controller.close();
      }
    });
    deferred.setSource(source);
    const [result1, result2] = await Promise.all([read1Promise, read2Promise]);
    (0, import_vitest.expect)(result1.done).toBe(false);
    (0, import_vitest.expect)(result1.value).toBe(42);
    (0, import_vitest.expect)(result2.done).toBe(false);
    (0, import_vitest.expect)(result2.value).toBe(42);
    const [second1, second2] = await Promise.all([reader1.read(), reader2.read()]);
    (0, import_vitest.expect)(second1.value).toBe(84);
    (0, import_vitest.expect)(second2.value).toBe(84);
  });
  (0, import_vitest.it)("should handle concurrent reads and writes", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const chunks = ["a", "b", "c", "d", "e"];
    let chunkIndex = 0;
    const source = new import_web.ReadableStream({
      start(controller) {
        const writeNext = () => {
          if (chunkIndex < chunks.length) {
            controller.enqueue(chunks[chunkIndex++]);
            setTimeout(writeNext, 5);
          } else {
            controller.close();
          }
        };
        writeNext();
      }
    });
    deferred.setSource(source);
    const results = [];
    const readConcurrently = async () => {
      let result = await reader.read();
      while (!result.done) {
        results.push(result.value);
        result = await reader.read();
      }
    };
    await readConcurrently();
    (0, import_vitest.expect)(results).toEqual(chunks);
  });
  (0, import_vitest.it)("should handle race condition between setSource and getReader", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("race-test");
        controller.close();
      }
    });
    const [, reader] = await Promise.all([
      // Set source
      Promise.resolve().then(() => deferred.setSource(source)),
      // Get reader
      Promise.resolve().then(() => deferred.stream.getReader())
    ]);
    const result = await reader.read();
    (0, import_vitest.expect)(result.value).toBe("race-test");
  });
  (0, import_vitest.it)("should handle empty source stream", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const emptySource = new import_web.ReadableStream({
      start(controller) {
        controller.close();
      }
    });
    deferred.setSource(emptySource);
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(true);
  });
  (0, import_vitest.it)("should handle source stream with errors", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const errorSource = new import_web.ReadableStream({
      async start(controller) {
        controller.enqueue("before-error");
        await new Promise((resolve) => setTimeout(resolve, 100));
        controller.error(new Error("Source stream error"));
      }
    });
    deferred.setSource(errorSource);
    const result1 = await reader.read();
    (0, import_vitest.expect)(result1.value).toBe("before-error");
    await (0, import_vitest.expect)(() => reader.read()).rejects.toThrow("Source stream error");
  });
  (0, import_vitest.it)("should handle multiple concurrent read operations", async () => {
    var _a, _b, _c;
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const readPromises = Array.from({ length: 3 }, () => reader.read());
    await (0, import_utils.delay)(10);
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
        controller.close();
      }
    });
    deferred.setSource(source);
    const results = await Promise.all(readPromises);
    (0, import_vitest.expect)((_a = results[0]) == null ? void 0 : _a.value).toBe(1);
    (0, import_vitest.expect)((_b = results[1]) == null ? void 0 : _b.value).toBe(2);
    (0, import_vitest.expect)((_c = results[2]) == null ? void 0 : _c.value).toBe(3);
    (0, import_vitest.expect)(results.every((r) => !r.done)).toBe(true);
    const finalResult = await reader.read();
    (0, import_vitest.expect)(finalResult.done).toBe(true);
  });
  (0, import_vitest.it)("should handle backpressure correctly", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const largeChunks = Array.from({ length: 1e3 }, (_, i) => `chunk-${i}`);
    const source = new import_web.ReadableStream({
      start(controller) {
        for (const chunk of largeChunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });
    deferred.setSource(source);
    const reader = deferred.stream.getReader();
    const results = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    (0, import_vitest.expect)(results).toEqual(largeChunks);
  });
  (0, import_vitest.it)("should handle concurrent setSource calls (second should fail)", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const source1 = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("first");
        controller.close();
      }
    });
    const source2 = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("second");
        controller.close();
      }
    });
    deferred.setSource(source1);
    (0, import_vitest.expect)(() => deferred.setSource(source2)).toThrow("Stream source already set");
    const reader = deferred.stream.getReader();
    const result = await reader.read();
    (0, import_vitest.expect)(result.value).toBe("first");
  });
  (0, import_vitest.it)("should handle reader release and re-acquire before source is set", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader1 = deferred.stream.getReader();
    reader1.releaseLock();
    const reader2 = deferred.stream.getReader();
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("test-after-release");
        controller.close();
      }
    });
    deferred.setSource(source);
    const result = await reader2.read();
    (0, import_vitest.expect)(result.value).toBe("test-after-release");
  });
  (0, import_vitest.it)("should handle type safety with different data types", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const testObject = { id: 1, name: "test" };
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue(testObject);
        controller.close();
      }
    });
    deferred.setSource(source);
    const result = await reader.read();
    (0, import_vitest.expect)(result.value).toEqual(testObject);
    (0, import_vitest.expect)(result.value).toBeDefined();
    (0, import_vitest.expect)(typeof result.value.id).toBe("number");
    (0, import_vitest.expect)(typeof result.value.name).toBe("string");
  });
  (0, import_vitest.it)("should create a readable stream", () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    (0, import_vitest.expect)(deferred.stream).toBeInstanceOf(import_web.ReadableStream);
  });
  (0, import_vitest.it)("should keep reader awaiting before source is set, then read after source is set", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    let readCompleted = false;
    const readPromise = reader.read().then((result4) => {
      readCompleted = true;
      return result4;
    });
    await (0, import_utils.delay)(50);
    (0, import_vitest.expect)(readCompleted).toBe(false);
    const sourceData = ["hello", "world"];
    const source = new import_web.ReadableStream({
      start(controller) {
        sourceData.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      }
    });
    deferred.setSource(source);
    const result = await readPromise;
    (0, import_vitest.expect)(readCompleted).toBe(true);
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toBe("hello");
    const result2 = await reader.read();
    (0, import_vitest.expect)(result2.done).toBe(false);
    (0, import_vitest.expect)(result2.value).toBe("world");
    const result3 = await reader.read();
    (0, import_vitest.expect)(result3.done).toBe(true);
    (0, import_vitest.expect)(result3.value).toBeUndefined();
    reader.releaseLock();
  });
  (0, import_vitest.it)("should handle multiple chunks from source", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const chunks = [];
    const collectPromise = (async () => {
      const reader = deferred.stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    })();
    const source = new import_web.ReadableStream({
      async start(controller) {
        for (let i = 0; i < 5; i++) {
          controller.enqueue(i);
          await (0, import_utils.delay)(10);
        }
        controller.close();
      }
    });
    deferred.setSource(source);
    await collectPromise;
    (0, import_vitest.expect)(chunks).toEqual([0, 1, 2, 3, 4]);
  });
  (0, import_vitest.it)("should propagate errors from source to reader", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const readPromise = reader.read();
    const errorMessage = "Source error";
    const source = new import_web.ReadableStream({
      async start(controller) {
        controller.error(new Error(errorMessage));
      },
      cancel(reason) {
        console.log("cancel", reason);
      }
    });
    deferred.setSource(source);
    try {
      await readPromise;
      import_vitest.expect.fail("readPromise should have rejected");
    } catch (e) {
      const error = e;
      (0, import_vitest.expect)(error).toBeInstanceOf(Error);
      (0, import_vitest.expect)(error.message).toBe("Source error");
    }
    reader.releaseLock();
  });
  (0, import_vitest.it)("should throw error when trying to set source twice", () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const source1 = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("first");
        controller.close();
      }
    });
    const source2 = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("second");
        controller.close();
      }
    });
    deferred.setSource(source1);
    (0, import_vitest.expect)(() => deferred.setSource(source2)).toThrow("Stream source already set");
  });
  (0, import_vitest.it)("should throw error when trying to detach source before setting it", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    await (0, import_vitest.expect)(deferred.detachSource()).rejects.toThrow("Source not set");
  });
  (0, import_vitest.it)("read returns undefined as soon as reader is cancelled", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const readPromise = reader.read();
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("data");
        controller.close();
      }
    });
    deferred.setSource(source);
    await reader.cancel();
    const result = await readPromise;
    (0, import_vitest.expect)(result.done).toBe(true);
    (0, import_vitest.expect)(result.value).toBeUndefined();
    reader.releaseLock();
  });
  (0, import_vitest.it)("reads after detaching source should return undefined", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const readPromise = reader.read();
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("first");
        controller.enqueue("second");
        controller.close();
      }
    });
    deferred.setSource(source);
    await deferred.detachSource();
    const result = await readPromise;
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toBe("first");
    const result2 = await reader.read();
    (0, import_vitest.expect)(result2.done).toBe(true);
    (0, import_vitest.expect)(result2.value).toBeUndefined();
    reader.releaseLock();
    const reader2 = source.getReader();
    const result3 = await reader2.read();
    (0, import_vitest.expect)(result3.done).toBe(false);
    (0, import_vitest.expect)(result3.value).toBe("second");
    const result4 = await reader2.read();
    (0, import_vitest.expect)(result4.done).toBe(true);
    (0, import_vitest.expect)(result4.value).toBeUndefined();
    reader.releaseLock();
  });
  (0, import_vitest.it)("should handle empty source stream", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const readPromise = reader.read();
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.close();
      }
    });
    deferred.setSource(source);
    const result = await readPromise;
    (0, import_vitest.expect)(result.done).toBe(true);
    (0, import_vitest.expect)(result.value).toBeUndefined();
    reader.releaseLock();
  });
  (0, import_vitest.it)("source can be set by another deferred stream after calling detach", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const source = new import_web.ReadableStream({
      start(controller) {
        controller.enqueue("before-cancel");
        controller.enqueue("after-cancel");
        controller.close();
      }
    });
    deferred.setSource(source);
    const reader = deferred.stream.getReader();
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toBe("before-cancel");
    const result2Promise = reader.read();
    await deferred.detachSource();
    const result2 = await result2Promise;
    (0, import_vitest.expect)(result2.done).toBe(true);
    (0, import_vitest.expect)(result2.value).toBeUndefined();
    reader.releaseLock();
    const deferred2 = new import_deferred_stream.DeferredReadableStream();
    deferred2.setSource(source);
    const reader2 = deferred2.stream.getReader();
    const result3 = await reader2.read();
    (0, import_vitest.expect)(result3.done).toBe(false);
    (0, import_vitest.expect)(result3.value).toBe("after-cancel");
    const result4 = await reader2.read();
    (0, import_vitest.expect)(result4.done).toBe(true);
    (0, import_vitest.expect)(result4.value).toBeUndefined();
    reader2.releaseLock();
  });
  (0, import_vitest.it)("a non-terminating source reader releases lock after detaching", async () => {
    const deferred = new import_deferred_stream.DeferredReadableStream();
    const reader = deferred.stream.getReader();
    const readPromise = reader.read();
    let resumeSource = false;
    const source = new import_web.ReadableStream({
      async start(controller) {
        while (!resumeSource) await (0, import_utils.delay)(10);
        controller.enqueue("data");
        controller.close();
      }
    });
    deferred.setSource(source);
    await deferred.detachSource();
    await (0, import_utils.delay)(100);
    const result = await readPromise;
    (0, import_vitest.expect)(result.done).toBe(true);
    (0, import_vitest.expect)(result.value).toBeUndefined();
    const reader2 = source.getReader();
    resumeSource = true;
    const result2 = await reader2.read();
    (0, import_vitest.expect)(result2.done).toBe(false);
    (0, import_vitest.expect)(result2.value).toBe("data");
    const result3 = await reader2.read();
    (0, import_vitest.expect)(result3.done).toBe(true);
    (0, import_vitest.expect)(result3.value).toBeUndefined();
    reader2.releaseLock();
  });
  (0, import_vitest.it)("should transfer source between deferred streams while reading is ongoing", async () => {
    const deferred1 = new import_deferred_stream.DeferredReadableStream();
    const deferred2 = new import_deferred_stream.DeferredReadableStream();
    const source = new import_web.ReadableStream({
      async start(controller) {
        for (let i = 0; i < 4; i++) {
          controller.enqueue(`chunk-${i}`);
          await (0, import_utils.delay)(20);
        }
        controller.close();
      }
    });
    deferred1.setSource(source);
    const reader1 = deferred1.stream.getReader();
    const result1 = await reader1.read();
    (0, import_vitest.expect)(result1.done).toBe(false);
    (0, import_vitest.expect)(result1.value).toBe("chunk-0");
    const result2 = await reader1.read();
    (0, import_vitest.expect)(result2.done).toBe(false);
    (0, import_vitest.expect)(result2.value).toBe("chunk-1");
    await (0, import_utils.delay)(10);
    await deferred1.detachSource();
    const result3 = await reader1.read();
    (0, import_vitest.expect)(result3.done).toBe(true);
    (0, import_vitest.expect)(result3.value).toBeUndefined();
    deferred2.setSource(source);
    const reader2 = deferred2.stream.getReader();
    const result4 = await reader2.read();
    (0, import_vitest.expect)(result4.done).toBe(false);
    (0, import_vitest.expect)(result4.value).toBe("chunk-2");
    const result5 = await reader2.read();
    (0, import_vitest.expect)(result5.done).toBe(false);
    (0, import_vitest.expect)(result5.value).toBe("chunk-3");
    const result6 = await reader2.read();
    (0, import_vitest.expect)(result6.done).toBe(true);
    (0, import_vitest.expect)(result6.value).toBeUndefined();
    reader1.releaseLock();
    reader2.releaseLock();
  });
});
//# sourceMappingURL=deferred_stream.test.cjs.map