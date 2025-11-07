import http from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { createWebSocketHub } from "./ws/hub";

const app = createApp();
const server = http.createServer(app);
const wsHub = createWebSocketHub(server);

const shutdown = (signal: NodeJS.Signals) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  wsHub.close();
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
};

server.listen(env.PORT, () => {
  logger.info("Server listening", { port: env.PORT });
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
