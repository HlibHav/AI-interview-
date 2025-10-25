"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var job_executor_exports = {};
__export(job_executor_exports, {
  JobStatus: () => JobStatus
});
module.exports = __toCommonJS(job_executor_exports);
var JobStatus = /* @__PURE__ */ ((JobStatus2) => {
  JobStatus2[JobStatus2["RUNNING"] = 0] = "RUNNING";
  JobStatus2[JobStatus2["FAILED"] = 1] = "FAILED";
  JobStatus2[JobStatus2["SUCCESS"] = 2] = "SUCCESS";
  return JobStatus2;
})(JobStatus || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JobStatus
});
//# sourceMappingURL=job_executor.cjs.map