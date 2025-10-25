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
var log_exports = {};
__export(log_exports, {
  initializeLogger: () => initializeLogger,
  log: () => log,
  loggerOptions: () => loggerOptions
});
module.exports = __toCommonJS(log_exports);
var import_pino = require("pino");
let loggerOptions;
let logger = void 0;
const log = () => {
  if (!logger) {
    throw new TypeError("logger not initialized. did you forget to run initializeLogger()?");
  }
  return logger;
};
const initializeLogger = ({ pretty, level }) => {
  loggerOptions = { pretty, level };
  logger = (0, import_pino.pino)(
    pretty ? {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true
        }
      }
    } : {}
  );
  if (level) {
    logger.level = level;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  initializeLogger,
  log,
  loggerOptions
});
//# sourceMappingURL=log.cjs.map