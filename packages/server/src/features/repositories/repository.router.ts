import { Router } from "express";
import { z } from "zod";
import { requireUser } from "../../middleware/requireUser";
import { listRepositoriesForUser, upsertRepositoryForUser } from "./repository.service";

const createRepositorySchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  defaultBranch: z.string().optional(),
  cloneUrl: z.string().url().optional(),
  alias: z.string().optional(),
});

export const repositoryRouter = Router();

repositoryRouter.use(requireUser);

repositoryRouter.get("/", async (req, res) => {
  const repositories = await listRepositoriesForUser(req.currentUser!.id);
  res.json({ repositories });
});

repositoryRouter.post("/", async (req, res) => {
  const parseResult = createRepositorySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten().fieldErrors });
    return;
  }

  const repository = await upsertRepositoryForUser({
    userId: req.currentUser!.id,
    ...parseResult.data,
  });

  res.status(201).json({ repository });
});
