import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "./config/env";
import { authRouter } from "./features/auth/auth.router";
import { repositoryRouter } from "./features/repositories/repository.router";
import { orchestrationRouter } from "./features/orchestrations/orchestration.router";
import { cursorWebhookRouter } from "./webhooks/cursor/webhook.router";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: [env.APP_BASE_URL, process.env.NODE_ENV === "development" ? "http://localhost:5173" : env.APP_BASE_URL],
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/repositories", repositoryRouter);
  app.use("/api/orchestrations", orchestrationRouter);
  app.use("/api/webhooks/cursor", cursorWebhookRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return app;
};
