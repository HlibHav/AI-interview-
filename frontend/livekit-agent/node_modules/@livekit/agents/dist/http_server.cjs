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
var http_server_exports = {};
__export(http_server_exports, {
  HTTPServer: () => HTTPServer
});
module.exports = __toCommonJS(http_server_exports);
var import_node_http = require("node:http");
var import_log = require("./log.cjs");
const healthCheck = async (res) => {
  res.writeHead(200);
  res.end("OK");
};
class HTTPServer {
  host;
  port;
  app;
  #logger = (0, import_log.log)();
  constructor(host, port, workerListener) {
    this.host = host;
    this.port = port;
    this.app = (0, import_node_http.createServer)((req, res) => {
      if (req.url === "/") {
        healthCheck(res);
      } else if (req.url === "/worker") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(workerListener()));
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    });
  }
  async run() {
    return new Promise((resolve, reject) => {
      this.app.listen(this.port, this.host, (err) => {
        if (err) reject(err);
        const address = this.app.address();
        if (typeof address !== "string") {
          this.#logger.info(`Server is listening on port ${address.port}`);
        }
        resolve();
      });
    });
  }
  async close() {
    return new Promise((resolve, reject) => {
      this.app.close((err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HTTPServer
});
//# sourceMappingURL=http_server.cjs.map