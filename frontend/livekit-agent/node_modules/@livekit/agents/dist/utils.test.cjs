"use strict";
var import_rtc_node = require("@livekit/rtc-node");
var import_web = require("node:stream/web");
var import_vitest = require("vitest");
var import_log = require("../src/log.cjs");
var import_utils = require("../src/utils.cjs");
(0, import_vitest.describe)("utils", () => {
  (0, import_log.initializeLogger)({ pretty: true, level: "debug" });
  (0, import_vitest.describe)("Task", () => {
    (0, import_vitest.it)("should execute task successfully and return result", async () => {
      const expectedResult = "task completed";
      const task = import_utils.Task.from(async () => {
        await (0, import_utils.delay)(10);
        return expectedResult;
      });
      (0, import_vitest.expect)(task.done).toBe(false);
      const result = await task.result;
      (0, import_vitest.expect)(result).toBe(expectedResult);
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle task errors properly", async () => {
      const expectedError = new Error("Task failed");
      const task = import_utils.Task.from(async () => {
        await (0, import_utils.delay)(10);
        throw expectedError;
      });
      (0, import_vitest.expect)(task.done).toBe(false);
      await (0, import_vitest.expect)(task.result).rejects.toThrow(expectedError);
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should cancel task when cancel is called", async () => {
      let taskStarted = false;
      let taskCompleted = false;
      const task = import_utils.Task.from(async (controller) => {
        taskStarted = true;
        await (0, import_utils.delay)(100, { signal: controller.signal });
        taskCompleted = true;
        return "should not complete";
      });
      await (0, import_utils.delay)(10);
      (0, import_vitest.expect)(taskStarted).toBe(true);
      (0, import_vitest.expect)(task.done).toBe(false);
      task.cancel();
      try {
        await task.result;
      } catch (error) {
        (0, import_vitest.expect)(error.name).toBe("AbortError");
      }
      (0, import_vitest.expect)(taskCompleted).toBe(false);
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should use provided AbortController", async () => {
      const controller = new AbortController();
      const task = import_utils.Task.from(async (ctrl) => {
        (0, import_vitest.expect)(ctrl).toBe(controller);
        await (0, import_utils.delay)(100, { signal: ctrl.signal });
        return "completed";
      }, controller);
      await (0, import_utils.delay)(10);
      controller.abort();
      try {
        await task.result;
      } catch (error) {
        (0, import_vitest.expect)(error.name).toBe("AbortError");
      }
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle immediate resolution", async () => {
      const task = import_utils.Task.from(async () => {
        return "immediate";
      });
      const result = await task.result;
      (0, import_vitest.expect)(result).toBe("immediate");
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle immediate rejection", async () => {
      const expectedError = new Error("Immediate error");
      const task = import_utils.Task.from(async () => {
        throw expectedError;
      });
      try {
        await task.result;
      } catch (error) {
        (0, import_vitest.expect)(error).toBe(expectedError);
      }
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle multiple calls to cancel", async () => {
      const task = import_utils.Task.from(async (controller) => {
        await (0, import_utils.delay)(100, { signal: controller.signal });
        return "should not complete";
      });
      await (0, import_utils.delay)(10);
      task.cancel();
      task.cancel();
      task.cancel();
      try {
        await task.result;
      } catch (error) {
        (0, import_vitest.expect)(error.name).toBe("AbortError");
      }
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle task that checks abort signal manually", async () => {
      const arr = [];
      const task = import_utils.Task.from(async (controller) => {
        for (let i = 0; i < 10; i++) {
          if (controller.signal.aborted) {
            throw new Error("Task was aborted");
          }
          await (0, import_utils.delay)(10);
          arr.push(i);
        }
        return "completed";
      });
      await (0, import_utils.delay)(39);
      task.cancel();
      (0, import_vitest.expect)(arr).toEqual([0, 1, 2]);
      try {
        await task.result;
      } catch (error) {
        (0, import_vitest.expect)(error.message).toBe("Task was aborted");
      }
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle cleanup in finally block", async () => {
      let cleanupExecuted = false;
      const task = import_utils.Task.from(async (controller) => {
        try {
          await (0, import_utils.delay)(100, { signal: controller.signal });
          return "completed";
        } finally {
          cleanupExecuted = true;
        }
      });
      await (0, import_utils.delay)(10);
      task.cancel();
      try {
        await task.result;
      } catch {
      }
      (0, import_vitest.expect)(cleanupExecuted).toBe(true);
    });
    (0, import_vitest.it)("should handle accessing result multiple times", async () => {
      const task = import_utils.Task.from(async () => {
        await (0, import_utils.delay)(10);
        return "result";
      });
      const result1 = await task.result;
      const result2 = await task.result;
      const result3 = await task.result;
      (0, import_vitest.expect)(result1).toBe("result");
      (0, import_vitest.expect)(result2).toBe("result");
      (0, import_vitest.expect)(result3).toBe("result");
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle accessing result promise before completion", async () => {
      const task = import_utils.Task.from(async () => {
        await (0, import_utils.delay)(50);
        return "delayed result";
      });
      const resultPromise1 = task.result;
      const resultPromise2 = task.result;
      (0, import_vitest.expect)(task.done).toBe(false);
      const [result1, result2] = await Promise.all([resultPromise1, resultPromise2]);
      (0, import_vitest.expect)(result1).toBe("delayed result");
      (0, import_vitest.expect)(result2).toBe("delayed result");
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should cancel child tasks when parent task is canceled", async () => {
      let parentStarted = false;
      let child1Started = false;
      let child2Started = false;
      let parentCompleted = false;
      let child1Completed = false;
      let child2Completed = false;
      let child1Task = void 0;
      let child2Task = void 0;
      const parentTask = import_utils.Task.from(async (controller) => {
        parentStarted = true;
        child1Task = import_utils.Task.from(async (childController) => {
          child1Started = true;
          await (0, import_utils.delay)(100, { signal: childController.signal });
          child1Completed = true;
          return "child1";
        }, controller);
        child2Task = import_utils.Task.from(async (childController) => {
          child2Started = true;
          await (0, import_utils.delay)(100, { signal: childController.signal });
          child2Completed = true;
          return "child2";
        }, controller);
        const results = await Promise.all([child1Task.result, child2Task.result]);
        parentCompleted = true;
        return results;
      });
      await (0, import_utils.delay)(20);
      (0, import_vitest.expect)(parentStarted).toBe(true);
      (0, import_vitest.expect)(child1Started).toBe(true);
      (0, import_vitest.expect)(child2Started).toBe(true);
      parentTask.cancel();
      const [parentResult, child1Result, child2Result] = await Promise.allSettled([
        parentTask.result,
        child1Task.result,
        child2Task.result
      ]);
      (0, import_vitest.expect)(parentResult.status).toBe("rejected");
      (0, import_vitest.expect)(parentResult.reason.name).toBe("AbortError");
      (0, import_vitest.expect)(child1Result.status).toBe("rejected");
      (0, import_vitest.expect)(child1Result.reason.name).toBe("AbortError");
      (0, import_vitest.expect)(child2Result.status).toBe("rejected");
      (0, import_vitest.expect)(child2Result.reason.name).toBe("AbortError");
      (0, import_vitest.expect)(parentCompleted).toBe(false);
      (0, import_vitest.expect)(child1Completed).toBe(false);
      (0, import_vitest.expect)(child2Completed).toBe(false);
      (0, import_vitest.expect)(parentTask.done).toBe(true);
      (0, import_vitest.expect)(child1Task.done).toBe(true);
      (0, import_vitest.expect)(child2Task.done).toBe(true);
    });
    (0, import_vitest.it)("should handle nested tasks that complete successfully", async () => {
      const results = [];
      const parentTask = import_utils.Task.from(async (controller) => {
        results.push("parent-start");
        const child1Task = import_utils.Task.from(async () => {
          results.push("child1-start");
          await (0, import_utils.delay)(25);
          results.push("child1-end");
          return "child1-result";
        }, controller);
        const child2Task = import_utils.Task.from(async (childController) => {
          results.push("child2-start");
          const grandchildTask = import_utils.Task.from(async () => {
            results.push("grandchild-start");
            await (0, import_utils.delay)(10);
            results.push("grandchild-end");
            return "grandchild-result";
          }, childController);
          const grandchildResult = await grandchildTask.result;
          await (0, import_utils.delay)(10);
          results.push("child2-end");
          return `child2-result-with-${grandchildResult}`;
        }, controller);
        const [child1Result, child2Result] = await Promise.all([
          child1Task.result,
          child2Task.result
        ]);
        results.push("parent-end");
        return {
          parent: "parent-result",
          child1: child1Result,
          child2: child2Result
        };
      });
      const finalResult = await parentTask.result;
      (0, import_vitest.expect)(finalResult).toEqual({
        parent: "parent-result",
        child1: "child1-result",
        child2: "child2-result-with-grandchild-result"
      });
      (0, import_vitest.expect)(results).toEqual([
        "parent-start",
        "child1-start",
        "child2-start",
        "grandchild-start",
        "grandchild-end",
        "child2-end",
        "child1-end",
        "parent-end"
      ]);
      (0, import_vitest.expect)(parentTask.done).toBe(true);
    });
    (0, import_vitest.it)("should propagate errors from nested tasks", async () => {
      let parentError = null;
      let child1Completed = false;
      let child2Started = false;
      const parentTask = import_utils.Task.from(async (controller) => {
        const child1Task = import_utils.Task.from(async () => {
          await (0, import_utils.delay)(20);
          throw new Error("child1 error");
        }, controller);
        const child2Task = import_utils.Task.from(async () => {
          child2Started = true;
          await (0, import_utils.delay)(30);
          child1Completed = true;
          return "child2-result";
        }, controller);
        const results = await Promise.all([child1Task.result, child2Task.result]);
        return results;
      });
      try {
        await parentTask.result;
        import_vitest.expect.fail("Parent task should have thrown");
      } catch (error) {
        parentError = error;
      }
      (0, import_vitest.expect)(parentError == null ? void 0 : parentError.message).toBe("child1 error");
      (0, import_vitest.expect)(child1Completed).toBe(false);
      (0, import_vitest.expect)(child2Started).toBe(true);
      (0, import_vitest.expect)(parentTask.done).toBe(true);
    });
    (0, import_vitest.it)("should cancel and wait for task completion", async () => {
      let taskCompleted = false;
      const task = import_utils.Task.from(async (controller) => {
        await (0, import_utils.delay)(5e3, { signal: controller.signal });
        taskCompleted = true;
        return "should not complete";
      });
      const start = Date.now();
      const result = await task.cancelAndWait(1e3);
      const duration = Date.now() - start;
      (0, import_vitest.expect)(result).toBe(import_utils.TaskResult.Aborted);
      (0, import_vitest.expect)(duration).toBeLessThan(100);
      (0, import_vitest.expect)(taskCompleted).toBe(false);
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should timeout if task does not respond to cancellation", async () => {
      const task = import_utils.Task.from(async () => {
        await (0, import_utils.delay)(1e3);
      });
      try {
        await task.cancelAndWait(200);
        import_vitest.expect.fail("Task should have timed out");
      } catch (error) {
        (0, import_vitest.expect)(error).toBe(import_utils.TASK_TIMEOUT_ERROR);
      }
    });
    (0, import_vitest.it)("should handle task that completes before timeout", async () => {
      const task = import_utils.Task.from(async () => {
        await (0, import_utils.delay)(50);
      });
      await (0, import_utils.delay)(10);
      const result = await task.cancelAndWait(1e3);
      (0, import_vitest.expect)(result).toBe(import_utils.TaskResult.Completed);
      (0, import_vitest.expect)(task.done).toBe(true);
    });
    (0, import_vitest.it)("should propagate non-abort errors from cancelAndWait", async () => {
      const task = import_utils.Task.from(async () => {
        await (0, import_utils.delay)(10);
        throw new TypeError("Custom error");
      });
      try {
        await task.cancelAndWait(1e3);
        import_vitest.expect.fail("Task should have thrown");
      } catch (error) {
        (0, import_vitest.expect)(error.message).toBe("Custom error");
        (0, import_vitest.expect)(error.name).toBe("TypeError");
      }
    });
  });
  (0, import_vitest.describe)("Event", () => {
    (0, import_vitest.it)("wait resolves immediately when the event is already set", async () => {
      const event = new import_utils.Event();
      event.set();
      const result = await event.wait();
      (0, import_vitest.expect)(result).toBe(true);
    });
    (0, import_vitest.it)("wait resolves after set is called", async () => {
      const event = new import_utils.Event();
      const waiterPromise = event.wait();
      await (0, import_utils.delay)(10);
      (0, import_vitest.expect)(await (0, import_utils.isPending)(waiterPromise)).toBe(true);
      event.set();
      const result = await waiterPromise;
      (0, import_vitest.expect)(result).toBe(true);
    });
    (0, import_vitest.it)("all waiters resolve once set is called", async () => {
      const event = new import_utils.Event();
      const waiters = [event.wait(), event.wait(), event.wait()];
      await (0, import_utils.delay)(10);
      const pendings = await Promise.all(waiters.map((w) => (0, import_utils.isPending)(w)));
      (0, import_vitest.expect)(pendings).toEqual([true, true, true]);
      event.set();
      const results = await Promise.all(waiters);
      (0, import_vitest.expect)(results).toEqual([true, true, true]);
    });
    (0, import_vitest.it)("wait after 2 seconds is still pending before set", async () => {
      const event = new import_utils.Event();
      const waiter = event.wait();
      await (0, import_utils.delay)(2e3);
      (0, import_vitest.expect)(await (0, import_utils.isPending)(waiter)).toBe(true);
      event.set();
      const result = await waiter;
      (0, import_vitest.expect)(result).toBe(true);
    });
    (0, import_vitest.it)("wait after set and clear should be pending", async () => {
      const event = new import_utils.Event();
      const waiterBeforeSet = event.wait();
      event.set();
      event.clear();
      const waiterAfterSet = event.wait();
      const result = await Promise.race([
        waiterBeforeSet.then(() => "before"),
        waiterAfterSet.then(() => "after")
      ]);
      (0, import_vitest.expect)(result).toBe("before");
      (0, import_vitest.expect)(await (0, import_utils.isPending)(waiterBeforeSet)).toBe(false);
      (0, import_vitest.expect)(await (0, import_utils.isPending)(waiterAfterSet)).toBe(true);
      event.set();
      (0, import_vitest.expect)(await waiterAfterSet).toBe(true);
    });
  });
  (0, import_vitest.describe)("resampleStream", () => {
    const createAudioFrame = (sampleRate, samples, channels = 1) => {
      const data = new Int16Array(samples * channels);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(i / samples * Math.PI * 2) * 16e3;
      }
      return new import_rtc_node.AudioFrame(data, sampleRate, channels, samples);
    };
    const streamToArray = async (stream) => {
      const reader = stream.getReader();
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      return chunks;
    };
    (0, import_vitest.it)("should resample audio frames to target sample rate", async () => {
      const inputRate = 48e3;
      const outputRate = 16e3;
      const inputFrame = createAudioFrame(inputRate, 960);
      const inputStream = new import_web.ReadableStream({
        start(controller) {
          controller.enqueue(inputFrame);
          controller.close();
        }
      });
      const outputStream = (0, import_utils.resampleStream)({ stream: inputStream, outputRate });
      const outputFrames = await streamToArray(outputStream);
      (0, import_vitest.expect)(outputFrames.length).toBeGreaterThan(0);
      for (const frame of outputFrames) {
        (0, import_vitest.expect)(frame.sampleRate).toBe(outputRate);
        (0, import_vitest.expect)(frame.channels).toBe(inputFrame.channels);
      }
    });
    (0, import_vitest.it)("should handle same input and output rate", async () => {
      const sampleRate = 44100;
      const inputFrame = createAudioFrame(sampleRate, 1024);
      const inputStream = new import_web.ReadableStream({
        start(controller) {
          controller.enqueue(inputFrame);
          controller.close();
        }
      });
      const outputStream = (0, import_utils.resampleStream)({ stream: inputStream, outputRate: sampleRate });
      const outputFrames = await streamToArray(outputStream);
      (0, import_vitest.expect)(outputFrames.length).toBeGreaterThan(0);
      for (const frame of outputFrames) {
        (0, import_vitest.expect)(frame.sampleRate).toBe(sampleRate);
        (0, import_vitest.expect)(frame.channels).toBe(inputFrame.channels);
      }
    });
    (0, import_vitest.it)("should handle multiple input frames", async () => {
      const inputRate = 32e3;
      const outputRate = 48e3;
      const frame1 = createAudioFrame(inputRate, 640);
      const frame2 = createAudioFrame(inputRate, 640);
      const inputStream = new import_web.ReadableStream({
        start(controller) {
          controller.enqueue(frame1);
          controller.enqueue(frame2);
          controller.close();
        }
      });
      const outputStream = (0, import_utils.resampleStream)({ stream: inputStream, outputRate });
      const outputFrames = await streamToArray(outputStream);
      (0, import_vitest.expect)(outputFrames.length).toBeGreaterThan(0);
      for (const frame of outputFrames) {
        (0, import_vitest.expect)(frame.sampleRate).toBe(outputRate);
        (0, import_vitest.expect)(frame.channels).toBe(frame1.channels);
      }
    });
    (0, import_vitest.it)("should handle empty stream", async () => {
      const inputStream = new import_web.ReadableStream({
        start(controller) {
          controller.close();
        }
      });
      const outputStream = (0, import_utils.resampleStream)({ stream: inputStream, outputRate: 44100 });
      const outputFrames = await streamToArray(outputStream);
      (0, import_vitest.expect)(outputFrames).toEqual([]);
    });
  });
});
//# sourceMappingURL=utils.test.cjs.map