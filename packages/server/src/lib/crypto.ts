import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const key = Buffer.from(env.ORCHESTRATOR_CRYPTO_KEY, "hex");

if (key.length !== 32) {
  throw new Error("ORCHESTRATOR_CRYPTO_KEY must be 32 bytes (64 hex characters)");
}

export const encrypt = (plaintext: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

export const decrypt = (ciphertext: string) => {
  const payload = Buffer.from(ciphertext, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const data = payload.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
};
