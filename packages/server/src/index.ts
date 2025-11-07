import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { setupWebSocketHandlers } from './features/websocket/websocket.service.js';
import { authRouter } from './features/auth/auth.routes.js';
import { orchestrationRouter } from './features/orchestration/orchestration.routes.js';
import { prisma } from './lib/prisma.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/orchestration', orchestrationRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocketHandlers(wss);

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server available at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});

start();
