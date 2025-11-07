import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { validateSchema, ApiError } from '../../lib/validation.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';

const router = Router();

const loginSchema = z.object({
  cursorApiKey: z.string().min(1, 'Cursor API key is required'),
  email: z.string().email().optional()
});

router.post('/login', async (req, res, next) => {
  try {
    const { cursorApiKey, email } = validateSchema(loginSchema, req.body);
    
    const testResponse = await fetch('https://api.cursor.com/v0/agents', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cursorApiKey}`
      }
    });
    
    if (!testResponse.ok) {
      throw new ApiError(401, 'Invalid Cursor API key');
    }
    
    let user = await prisma.user.findFirst({
      where: { cursorApiKey }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          cursorApiKey,
          email
        }
      });
    } else if (email && user.email !== email) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email }
      });
    }
    
    const token = Buffer.from(`${user.id}_${Date.now()}_${Math.random()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });
    
    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticateUser, async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    
    if (token) {
      await prisma.session.deleteMany({
        where: { token }
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateUser, async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, createdAt: true }
    });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
