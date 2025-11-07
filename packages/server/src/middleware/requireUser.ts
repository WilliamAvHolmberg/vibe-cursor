import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        displayName?: string | null;
        encryptedCursorApiKey?: string | null;
      };
    }
  }
}

export const requireUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.header("x-user-id");
  if (!userId) {
    res.status(401).json({ error: "Missing user context" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { credential: true },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.currentUser = {
    id: user.id,
    displayName: user.displayName,
    encryptedCursorApiKey: user.credential?.encryptedApiKey ?? null,
  };

  next();
};
