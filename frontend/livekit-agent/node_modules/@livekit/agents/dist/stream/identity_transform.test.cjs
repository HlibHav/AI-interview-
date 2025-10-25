"use strict";
var import_vitest = require("vitest");
var import_identity_transform = require("./identity_transform.cjs");
(0, import_vitest.describe)("IdentityTransform", () => {
  (0, import_vitest.it)("should handle stream with one value", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const inputValue = "single value";
    await writer.write(inputValue);
    await writer.close();
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toBe(inputValue);
    const nextResult = await reader.read();
    (0, import_vitest.expect)(nextResult.done).toBe(true);
  });
  (0, import_vitest.it)("should handle multiple values in sequence", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const inputValues = ["first", "second", "third"];
    for (const value of inputValues) {
      await writer.write(value);
    }
    await writer.close();
    const results = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    (0, import_vitest.expect)(results).toEqual(inputValues);
  });
  (0, import_vitest.it)("should handle null and undefined values", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const inputValues = ["test", null, void 0, "another"];
    for (const value of inputValues) {
      await writer.write(value);
    }
    await writer.close();
    const results = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    (0, import_vitest.expect)(results).toEqual(inputValues);
  });
  (0, import_vitest.it)("should handle arrays", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const inputValue = [1, 2, 3, 4, 5];
    await writer.write(inputValue);
    await writer.close();
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(false);
    (0, import_vitest.expect)(result.value).toEqual(inputValue);
    (0, import_vitest.expect)(result.value).toBe(inputValue);
    const nextResult = await reader.read();
    (0, import_vitest.expect)(nextResult.done).toBe(true);
  });
  (0, import_vitest.it)("should work with streamed data", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const testData = ["chunk1", "chunk2", "chunk3"];
    const writePromise = (async () => {
      for (const chunk of testData) {
        await writer.write(chunk);
      }
      await writer.close();
    })();
    const results = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    await writePromise;
    (0, import_vitest.expect)(results).toEqual(testData);
  });
  (0, import_vitest.it)("should handle empty stream", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    await writer.close();
    const result = await reader.read();
    (0, import_vitest.expect)(result.done).toBe(true);
  });
  (0, import_vitest.it)("should handle writer closing while reading is in progress", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const testData = ["chunk1", "chunk2", "chunk3"];
    const results = [];
    await writer.write(testData[0]);
    await writer.write(testData[1]);
    const readPromise = (async () => {
      let result = await reader.read();
      while (!result.done) {
        results.push(result.value);
        result = await reader.read();
      }
    })();
    await writer.write(testData[2]);
    await writer.close();
    await readPromise;
    (0, import_vitest.expect)(results).toEqual(testData);
  });
  (0, import_vitest.it)("should handle a pending read when the writer is closed", async () => {
    const transform = new import_identity_transform.IdentityTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const readPromise = reader.read();
    await writer.close();
    const result = await readPromise;
    (0, import_vitest.expect)(result.done).toBe(true);
    (0, import_vitest.expect)(result.value).toBeUndefined();
  });
});
//# sourceMappingURL=identity_transform.test.cjs.map