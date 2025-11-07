import { Router } from "express";
import type { CursorWebhookEvent } from "../../types/cursor";
import { handleCursorWebhook } from "../../features/orchestrations/orchestration.service";
import { verifyCursorSignature } from "./verifySignature";

interface RawBodyRequest {
  rawBody?: Buffer;
}

export const cursorWebhookRouter = Router();

cursorWebhookRouter.post("/", async (req, res) => {
  const rawBody = (req as RawBodyRequest).rawBody;
  const signature = req.header("x-cursor-signature") ?? req.header("cursor-signature");

  if (!rawBody || !verifyCursorSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  try {
    const event = req.body as CursorWebhookEvent;
    await handleCursorWebhook(event);
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
