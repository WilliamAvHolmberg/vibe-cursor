import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/validation.js';

export interface AuthRequest extends Request {
  userId?: string;
  cursorApiKey?: string;
}

export async function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing or invalid authorization header');
    }
    
    const token = authHeader.substring(7);
    
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      throw new ApiError(401, 'Invalid or expired session');
    }
    
    req.userId = session.userId;
    req.cursorApiKey = session.user.cursorApiKey;
    
    next();
  } catch (error) {
    next(error);
  }
}
