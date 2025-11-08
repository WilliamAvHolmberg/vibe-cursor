import { WebSocketServer, WebSocket } from 'ws';

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  orchestrationId?: string;
  userId?: string;
}

const clients = new Map<string, Set<WebSocketClient>>();

export function setupWebSocketHandlers(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocketClient) => {
    ws.isAlive = true;
    console.log('WebSocket client connected');

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribe' && message.orchestrationId) {
          ws.orchestrationId = message.orchestrationId;
          ws.userId = message.userId;
          
          if (!clients.has(message.orchestrationId)) {
            clients.set(message.orchestrationId, new Set());
          }
          clients.get(message.orchestrationId)!.add(ws);
          
          ws.send(JSON.stringify({
            type: 'subscribed',
            orchestrationId: message.orchestrationId
          }));
          
          console.log(`Client subscribed to orchestration ${message.orchestrationId}`);
        } else if (message.type === 'unsubscribe' && ws.orchestrationId) {
          const orchestrationClients = clients.get(ws.orchestrationId);
          if (orchestrationClients) {
            orchestrationClients.delete(ws);
            if (orchestrationClients.size === 0) {
              clients.delete(ws.orchestrationId);
            }
          }
          ws.orchestrationId = undefined;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      if (ws.orchestrationId) {
        const orchestrationClients = clients.get(ws.orchestrationId);
        if (orchestrationClients) {
          orchestrationClients.delete(ws);
          if (orchestrationClients.size === 0) {
            clients.delete(ws.orchestrationId);
          }
        }
      }
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WebSocketClient;
      if (!client.isAlive) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });
}

export function broadcastToOrchestration(orchestrationId: string, message: any) {
  const orchestrationClients = clients.get(orchestrationId);
  
  if (!orchestrationClients || orchestrationClients.size === 0) {
    return;
  }

  const payload = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString()
  });

  orchestrationClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
  
  console.log(`Broadcast to ${orchestrationClients.size} clients for orchestration ${orchestrationId}`);
}
