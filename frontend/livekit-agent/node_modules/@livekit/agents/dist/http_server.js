import { createServer } from "node:http";
import { log } from "./log.js";
const healthCheck = async (res) => {
  res.writeHead(200);
  res.end("OK");
};
class HTTPServer {
  host;
  port;
  app;
  #logger = log();
  constructor(host, port, workerListener) {
    this.host = host;
    this.port = port;
    this.app = createServer((req, res) => {
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
export {
  HTTPServer
};
//# sourceMappingURL=http_server.js.map