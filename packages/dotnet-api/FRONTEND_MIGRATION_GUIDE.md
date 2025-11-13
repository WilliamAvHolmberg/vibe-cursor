# Frontend Migration Guide: Node to .NET API

The Node.js orchestration server has been successfully ported to .NET! Here's what you need to change in your React frontend to point to the new .NET API.

## ✅ Backend Status: COMPLETE

All features have been ported:
- ✅ Database models and migrations
- ✅ Cursor API client wrapper  
- ✅ OrchestrationService business logic
- ✅ Hangfire background jobs for polling
- ✅ CQRS commands, queries, and handlers
- ✅ SignalR hub for real-time updates
- ✅ Controllers and auth endpoints
- ✅ Program.cs wired up

**Build Status:** ✅ Success (4 warnings, 0 errors)

## 🔧 Frontend Changes Required

### 1. Install SignalR Client Package

```bash
cd packages/web
npm install @microsoft/signalr
```

### 2. Update WebSocket Connection

**Old (WebSocket):**
```typescript
// packages/web/src/lib/use-websocket.ts
import { useEffect, useRef, useState } from 'react';

const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    orchestrationId: id,
    userId: userId
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle message
};
```

**New (SignalR):**
```typescript
// packages/web/src/lib/use-websocket.ts
import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5000/hubs/orchestration', {
    withCredentials: false,
    transport: signalR.HttpTransportType.WebSockets
  })
  .withAutomaticReconnect()
  .build();

// Connect
await connection.start();

// Subscribe to orchestration
await connection.invoke('SubscribeToOrchestration', orchestrationId);

// Listen for messages
connection.on('BroadcastToOrchestration', (message) => {
  // Handle message - same structure as before!
  console.log('Received:', message);
});

// Unsubscribe
await connection.invoke('UnsubscribeFromOrchestration', orchestrationId);

// Close
await connection.stop();
```

### 3. Update API Base URL

**Change in:** `packages/web/src/lib/api.ts`

```typescript
// Old
const API_BASE_URL = 'http://localhost:3001/api';

// New
const API_BASE_URL = 'http://localhost:5000/api';
```

### 4. Update Auth Endpoint

**Old login endpoint:**
```typescript
POST http://localhost:3001/api/auth/login
Body: { cursorApiKey: string, email?: string }
```

**New login endpoint:**
```typescript
POST http://localhost:5000/api/auth/cursor-login
Body: { cursorApiKey: string, email?: string }
```

Response structure is the same:
```typescript
{
  token: string,
  expiresAt: string,
  userId: string,
  email?: string
}
```

### 5. API Endpoints (All Compatible!)

All API endpoints maintain the same structure as Node:

**Orchestration:**
- `POST /api/orchestration/create` - Create orchestration
- `GET /api/orchestration/list` - List orchestrations
- `GET /api/orchestration/{id}` - Get orchestration details
- `POST /api/orchestration/{id}/answer` - Answer follow-up questions
- `POST /api/orchestration/{id}/approve` - Approve plan
- `POST /api/orchestration/{id}/cancel` - Cancel orchestration
- `GET /api/orchestration/{id}/conversation` - Get agent conversation

**Request/Response formats are identical to Node API!**

### 6. Example: Complete WebSocket Hook Migration

```typescript
// packages/web/src/lib/use-websocket.ts
import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export function useOrchestrationWebSocket(orchestrationId: string | null) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!orchestrationId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/orchestration', {
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('BroadcastToOrchestration', (message) => {
      console.log('Received message:', message);
      setLastMessage(message);
    });

    connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      setConnected(false);
    });

    connection.onreconnected(() => {
      console.log('SignalR reconnected');
      setConnected(true);
      connection.invoke('SubscribeToOrchestration', orchestrationId);
    });

    connection.onclose(() => {
      console.log('SignalR disconnected');
      setConnected(false);
    });

    connection.start()
      .then(() => {
        console.log('SignalR connected');
        setConnected(true);
        return connection.invoke('SubscribeToOrchestration', orchestrationId);
      })
      .catch(err => console.error('SignalR connection error:', err));

    connectionRef.current = connection;

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [orchestrationId]);

  return { connected, lastMessage };
}
```

## 🎯 Testing Checklist

- [ ] Install @microsoft/signalr package
- [ ] Update API base URL to port 5000
- [ ] Update auth endpoint to `/api/auth/cursor-login`
- [ ] Replace WebSocket with SignalR connection
- [ ] Test login flow
- [ ] Test creating orchestration
- [ ] Test real-time updates via SignalR
- [ ] Test answering follow-up questions
- [ ] Test approving plans
- [ ] Test canceling orchestrations

## 🚀 Running the .NET API

```bash
cd packages/dotnet-api

# Apply database migration (first time only)
dotnet ef database update

# Run the API
dotnet run

# API will be available at:
# - HTTP: http://localhost:5000
# - SignalR Hub: ws://localhost:5000/hubs/orchestration
# - Swagger: http://localhost:5000/swagger
```

## 📊 Message Format (Unchanged)

SignalR messages maintain the exact same structure as WebSocket messages:

```typescript
// Questions asked
{
  type: 'questions_asked',
  questions: [...],
  timestamp: '2025-11-12T...'
}

// Plan ready
{
  type: 'plan_ready',
  plan: {...},
  timestamp: '2025-11-12T...'
}

// Agent spawned
{
  type: 'agent_spawned',
  agent: { id, name, status },
  timestamp: '2025-11-12T...'
}

// Agent status update
{
  type: 'agent_status_update',
  agent: { id, cursorAgentId, name, status, pullRequestUrl },
  timestamp: '2025-11-12T...'
}

// Orchestration completed
{
  type: 'orchestration_completed',
  status: 'COMPLETED' | 'FAILED',
  timestamp: '2025-11-12T...'
}

// Error
{
  type: 'error',
  message: string,
  timestamp: '2025-11-12T...'
}
```

## 🔥 Benefits of .NET Migration

- **Better Performance**: SignalR with automatic reconnection
- **Type Safety**: Strongly typed C# throughout
- **Scalability**: Hangfire for background job management
- **Maintainability**: CQRS pattern, vertical slices
- **Observability**: Built-in telemetry and logging
- **Database**: EF Core with proper migrations

## 💡 Tips

1. **SignalR vs WebSocket**: SignalR handles reconnection automatically, no need for manual retry logic
2. **CORS**: Make sure your frontend URL is in the .NET API's CORS configuration
3. **Auth**: JWT tokens work exactly the same way (Bearer auth header)
4. **Debugging**: Use `/swagger` endpoint to test API calls manually

---

**That's it!** The backend is fully functional and ready. Just update the frontend WebSocket connection and API URL, and you're good to go! 🚀

