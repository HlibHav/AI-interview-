import { Event, Future, shortuuid } from "../utils.js";
import { asyncLocalStorage } from "./agent.js";
class SpeechHandle {
  constructor(_id, _allowInterruptions, _stepIndex, parent) {
    this._id = _id;
    this._allowInterruptions = _allowInterruptions;
    this._stepIndex = _stepIndex;
    this.parent = parent;
    this.doneFut.await.finally(() => {
      for (const callback of this.doneCallbacks) {
        callback(this);
      }
    });
  }
  /** Priority for messages that should be played after all other messages in the queue */
  static SPEECH_PRIORITY_LOW = 0;
  /** Every speech generates by the VoiceAgent defaults to this priority. */
  static SPEECH_PRIORITY_NORMAL = 5;
  /** Priority for important messages that should be played before others. */
  static SPEECH_PRIORITY_HIGH = 10;
  interruptFut = new Future();
  authorizedEvent = new Event();
  scheduledFut = new Future();
  doneFut = new Future();
  generations = [];
  /** @internal */
  _tasks = [];
  _chatItems = [];
  _numSteps = 1;
  itemAddedCallbacks = /* @__PURE__ */ new Set();
  doneCallbacks = /* @__PURE__ */ new Set();
  static create(options) {
    const { allowInterruptions = true, stepIndex = 0, parent } = options ?? {};
    return new SpeechHandle(shortuuid("speech_"), allowInterruptions, stepIndex, parent);
  }
  get interrupted() {
    return this.interruptFut.done;
  }
  get numSteps() {
    return this._numSteps;
  }
  get id() {
    return this._id;
  }
  get scheduled() {
    return this.scheduledFut.done;
  }
  get allowInterruptions() {
    return this._allowInterruptions;
  }
  /**
   * Allow or disallow interruptions on this SpeechHandle.
   *
   * When set to false, the SpeechHandle will no longer accept any incoming
   * interruption requests until re-enabled. If the handle is already
   * interrupted, clearing interruptions is not allowed.
   *
   * @param value - true to allow interruptions, false to disallow
   * @throws Error If attempting to disable interruptions when already interrupted
   */
  set allowInterruptions(value) {
    if (this.interrupted && !value) {
      throw new Error(
        "Cannot set allow_interruptions to False, the SpeechHandle is already interrupted"
      );
    }
    this._allowInterruptions = value;
  }
  done() {
    return this.doneFut.done;
  }
  get chatItems() {
    return this._chatItems;
  }
  /**
   * Interrupt the current speech generation.
   *
   * @throws Error If this speech handle does not allow interruptions.
   *
   * @returns The same speech handle that was interrupted.
   */
  interrupt(force = false) {
    if (!force && !this.allowInterruptions) {
      throw new Error("This generation handle does not allow interruptions");
    }
    this._cancel();
    return this;
  }
  /**
   * Waits for the entire assistant turn to complete playback.
   *
   * This method waits until the assistant has fully finished speaking,
   * including any finalization steps beyond initial response generation.
   * This is appropriate to call when you want to ensure the speech output
   * has entirely played out, including any tool calls and response follow-ups.
   */
  async waitForPlayout() {
    const store = asyncLocalStorage.getStore();
    if (store && (store == null ? void 0 : store.functionCall)) {
      throw new Error(
        `Cannot call 'SpeechHandle.waitForPlayout()' from inside the function tool '${store.functionCall.name}'. This creates a circular wait: the speech handle is waiting for the function tool to complete, while the function tool is simultaneously waiting for the speech handle.
To wait for the assistant's spoken response prior to running this tool, use RunContext.wait_for_playout() instead.`
      );
    }
    await this.doneFut.await;
  }
  async waitIfNotInterrupted(aw) {
    const allTasksPromise = Promise.all(aw);
    const fs = [allTasksPromise, this.interruptFut.await];
    await Promise.race(fs);
  }
  addDoneCallback(callback) {
    this.doneCallbacks.add(callback);
  }
  removeDoneCallback(callback) {
    this.doneCallbacks.delete(callback);
  }
  /** @internal */
  _cancel() {
    if (this.done()) {
      return this;
    }
    if (!this.interruptFut.done) {
      this.interruptFut.resolve();
    }
    return this;
  }
  /** @internal */
  _authorizeGeneration() {
    const fut = new Future();
    this.generations.push(fut);
    this.authorizedEvent.set();
  }
  /** @internal */
  _clearAuthorization() {
    this.authorizedEvent.clear();
  }
  /** @internal */
  async _waitForAuthorization() {
    await this.authorizedEvent.wait();
  }
  /** @internal */
  async _waitForGeneration(stepIdx = -1) {
    if (this.generations.length === 0) {
      throw new Error("cannot use wait_for_generation: no active generation is running.");
    }
    const index = stepIdx === -1 ? this.generations.length - 1 : stepIdx;
    const generation = this.generations[index];
    if (!generation) {
      throw new Error(`Generation at index ${index} not found.`);
    }
    return generation.await;
  }
  /** @internal */
  async _waitForScheduled() {
    return this.scheduledFut.await;
  }
  /** @internal */
  _markGenerationDone() {
    if (this.generations.length === 0) {
      throw new Error("cannot use mark_generation_done: no active generation is running.");
    }
    const lastGeneration = this.generations[this.generations.length - 1];
    if (lastGeneration && !lastGeneration.done) {
      lastGeneration.resolve();
    }
  }
  /** @internal */
  _markDone() {
    if (!this.doneFut.done) {
      this.doneFut.resolve();
      if (this.generations.length > 0) {
        this._markGenerationDone();
      }
    }
  }
  /** @internal */
  _markScheduled() {
    if (!this.scheduledFut.done) {
      this.scheduledFut.resolve();
    }
  }
  /** @internal */
  _addItemAddedCallback(callback) {
    this.itemAddedCallbacks.add(callback);
  }
  /** @internal */
  _removeItemAddedCallback(callback) {
    this.itemAddedCallbacks.delete(callback);
  }
  /** @internal */
  _itemAdded(items) {
    for (const item of items) {
      for (const cb of this.itemAddedCallbacks) {
        cb(item);
      }
      this._chatItems.push(item);
    }
  }
}
export {
  SpeechHandle
};
//# sourceMappingURL=speech_handle.js.map