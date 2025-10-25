class InferenceRunner {
  static registeredRunners = {};
  static registerRunner(method, importPath) {
    if (InferenceRunner.registeredRunners[method]) {
      throw new Error(`Inference runner ${method} already registered`);
    }
    InferenceRunner.registeredRunners[method] = importPath;
  }
}
export {
  InferenceRunner
};
//# sourceMappingURL=inference_runner.js.map