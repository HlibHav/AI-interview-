class RunContext {
  constructor(session, speechHandle, functionCall) {
    this.session = session;
    this.speechHandle = speechHandle;
    this.functionCall = functionCall;
    this.initialStepIdx = speechHandle.numSteps - 1;
  }
  initialStepIdx;
  get userData() {
    return this.session.userData;
  }
  /**
   * Waits for the speech playout corresponding to this function call step.
   *
   * Unlike {@link SpeechHandle.waitForPlayout}, which waits for the full
   * assistant turn to complete (including all function tools),
   * this method only waits for the assistant's spoken response prior to running
   * this tool to finish playing.
   */
  async waitForPlayout() {
    return this.speechHandle._waitForGeneration(this.initialStepIdx);
  }
}
export {
  RunContext
};
//# sourceMappingURL=run_context.js.map