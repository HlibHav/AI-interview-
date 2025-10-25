import { pino } from "pino";
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
  logger = pino(
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
export {
  initializeLogger,
  log,
  loggerOptions
};
//# sourceMappingURL=log.js.map