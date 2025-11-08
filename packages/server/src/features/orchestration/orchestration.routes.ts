import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, AuthRequest } from '../../middleware/auth.middleware.js';
import { validateSchema } from '../../lib/validation.js';
import { OrchestrationService } from './orchestration.service.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();

router.use(authenticateUser);

const createOrchestrationSchema = z.object({
  repository: z.string().url('Must be a valid repository URL'),
  ref: z.string().default('main'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters')
});

router.post('/create', async (req: AuthRequest, res, next) => {
  try {
    const { repository, ref, prompt } = validateSchema(createOrchestrationSchema, req.body);
    
    if (!req.cursorApiKey || !req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const service = new OrchestrationService(req.cursorApiKey);
    
    const orchestration = await service.createOrchestration({
      userId: req.userId,
      repository,
      ref,
      initialPrompt: prompt
    });
    
    res.json(orchestration);
  } catch (error) {
    next(error);
  }
});

router.get('/list', async (req: AuthRequest, res, next) => {
  try {
    const orchestrations = await prisma.orchestration.findMany({
      where: { userId: req.userId },
      include: {
        agents: true,
        _count: {
          select: {
            agents: true,
            followUpMessages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(orchestrations);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const orchestration = await prisma.orchestration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        agents: {
          include: {
            statusUpdates: {
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        },
        followUpMessages: {
          orderBy: { createdAt: 'asc' }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });
    
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }
    
    if (req.cursorApiKey) {
      const service = new OrchestrationService(req.cursorApiKey);
      await service.resumeOrchestrationIfNeeded(req.params.id);
    }
    
    res.json(orchestration);
  } catch (error) {
    next(error);
  }
});

const answerQuestionsSchema = z.object({
  answers: z.record(z.string(), z.string())
});

router.post('/:id/answer', async (req: AuthRequest, res, next) => {
  try {
    const { answers } = validateSchema(answerQuestionsSchema, req.body);
    
    if (!req.cursorApiKey || !req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const orchestration = await prisma.orchestration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }
    
    const service = new OrchestrationService(req.cursorApiKey);
    await service.answerFollowUpQuestions(req.params.id, answers);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve', async (req: AuthRequest, res, next) => {
  try {
    if (!req.cursorApiKey || !req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const orchestration = await prisma.orchestration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }
    
    const service = new OrchestrationService(req.cursorApiKey);
    await service.approvePlan(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    if (!req.cursorApiKey || !req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const orchestration = await prisma.orchestration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: { agents: true }
    });
    
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }
    
    await prisma.orchestration.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });
    
    const service = new OrchestrationService(req.cursorApiKey);
    
    for (const agent of orchestration.agents) {
      if (agent.cursorAgentId && agent.status === 'RUNNING') {
        try {
          await new (require('../../lib/cursor-api.js').CursorApiClient)(req.cursorApiKey)
            .cancelAgent(agent.cursorAgentId);
        } catch (error) {
          console.error(`Failed to cancel agent ${agent.id}:`, error);
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/conversation', async (req: AuthRequest, res, next) => {
  try {
    if (!req.cursorApiKey || !req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const orchestration = await prisma.orchestration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }

    if (!orchestration.planningAgentId) {
      return res.json({ messages: [] });
    }
    
    const service = new OrchestrationService(req.cursorApiKey);
    const conversation = await service.getAgentConversation(orchestration.planningAgentId);
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

export { router as orchestrationRouter };
