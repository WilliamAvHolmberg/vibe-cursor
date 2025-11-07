import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireUser } from "../../middleware/requireUser";
import {
  acceptPlan,
  answerFollowUpQuestions,
  createOrchestration,
  getOrchestrationDetail,
} from "./orchestration.service";

const createOrchestrationSchema = z.object({
  repositoryId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  branch: z.string().optional(),
});

const answerSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(1),
});

export const orchestrationRouter = Router();

orchestrationRouter.use(requireUser);

orchestrationRouter.get("/", async (req, res) => {
  const orchestrations = await prisma.orchestration.findMany({
    where: { userId: req.currentUser!.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      planAccepted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ orchestrations });
});

orchestrationRouter.post("/", async (req, res) => {
  const parseResult = createOrchestrationSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten().fieldErrors });
    return;
  }

  try {
    const orchestration = await createOrchestration({
      userId: req.currentUser!.id,
      ...parseResult.data,
    });
    res.status(201).json({ orchestration });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

orchestrationRouter.get("/:id", async (req, res) => {
  const orchestration = await getOrchestrationDetail(req.params.id, req.currentUser!.id);
  if (!orchestration) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ orchestration });
});

orchestrationRouter.post("/:id/answers", async (req, res) => {
  const parseResult = answerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten().fieldErrors });
    return;
  }

  try {
    await answerFollowUpQuestions(req.params.id, req.currentUser!.id, parseResult.data.answers);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

orchestrationRouter.post("/:id/accept-plan", async (req, res) => {
  try {
    const orchestration = await acceptPlan(req.params.id, req.currentUser!.id);
    res.json({ orchestration });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
