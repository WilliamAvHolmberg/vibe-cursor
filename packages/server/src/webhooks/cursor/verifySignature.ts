import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";

export const verifyCursorSignature = (payload: Buffer, signature: string | undefined) => {
  if (!signature) {
    return false;
  }

  const computed = createHmac("sha256", env.CURSOR_WEBHOOK_SECRET).update(payload).digest("hex");
  const safeSignature = Buffer.from(signature, "hex");
  const safeComputed = Buffer.from(computed, "hex");

  if (safeSignature.length !== safeComputed.length) {
    return false;
  }

  return timingSafeEqual(safeSignature, safeComputed);
};
