import { Router } from "express";
import { z } from "zod";
import { requireUser } from "../../middleware/requireUser";
import { prisma } from "../../lib/prisma";
import { createSession, clearCursorCredential } from "./auth.service";

const createSessionSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  cursorApiKey: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/session", async (req, res) => {
  const parseResult = createSessionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten().fieldErrors });
    return;
  }

  const session = await createSession(parseResult.data);
  res.status(201).json(session);
});

authRouter.get("/session", requireUser, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.currentUser!.id },
    include: { credential: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    hasCursorApiKey: Boolean(user.credential),
  });
});

authRouter.delete("/session", requireUser, async (req, res) => {
  await clearCursorCredential(req.currentUser!.id);
  res.status(204).send();
});
