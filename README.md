# Cursor Agent Orchestrator

An intelligent orchestration system for Cursor Cloud Agents with planning capabilities, sub-agent spawning, and real-time monitoring.

## 🎯 Features

- **🤖 Intelligent Planning Agent**: Analyzes tasks and creates execution plans
- **❓ Follow-up Questions**: Asks for clarification before execution
- **🔄 Sub-Agent Spawning**: Automatically splits complex tasks across multiple agents
- **📊 Real-time Updates**: WebSocket-based live status monitoring
- **🔐 Cursor Authentication**: Secure login with Cursor API keys
- **💾 PostgreSQL + Prisma**: Persistent data storage
- **🎨 Modern UI**: Built with React, Shadcn, and Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Cursor API key (from [cursor.com/settings](https://cursor.com/settings))

### Installation

```bash
# Clone and install
git clone <repository>
cd cursor-agent-orchestrator
npm install

# Setup database
cd packages/server
npm run db:push

# Create .env files (see SETUP.md for details)
cp packages/server/.env.example packages/server/.env
cp packages/web/.env.example packages/web/.env
# Edit .env files with your configuration

# Start development servers
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

## 📖 How It Works

### 1. Create Orchestration
Provide a repository URL and describe what you want to build.

### 2. Planning Phase
The planning agent either:
- **Asks questions** if it needs clarification
- **Generates a plan** with tasks and sub-agents

### 3. Review & Approve
Review the execution plan including:
- Task breakdown with complexity
- Sub-agent configuration (for complex tasks)
- Dependencies

### 4. Execution
- Agents are spawned via Cursor Cloud Agent API
- Complex tasks use multiple sub-agents in parallel
- Each creates its own branch and PR

### 5. Monitor
Watch real-time progress with WebSocket updates.

## 🏗️ Architecture

### Monorepo Structure

```
cursor-agent-orchestrator/
├── packages/
│   ├── server/          # Express + Prisma + WebSockets
│   │   ├── src/
│   │   │   ├── features/      # Vertical slices
│   │   │   │   ├── auth/
│   │   │   │   ├── orchestration/
│   │   │   │   └── websocket/
│   │   │   ├── lib/           # Shared utilities
│   │   │   └── middleware/
│   │   └── prisma/schema.prisma
│   └── web/             # React + Vite + Tailwind
│       └── src/
│           ├── features/      # Vertical slices
│           │   ├── auth/
│           │   ├── dashboard/
│           │   └── orchestration/
│           ├── components/ui/ # Shadcn components
│           └── lib/           # API client, hooks
├── package.json         # Root workspace
└── SETUP.md            # Detailed setup guide
```

### Tech Stack

**Backend:**
- Express.js (API server)
- Prisma (ORM)
- PostgreSQL (Database)
- WebSockets (Real-time)
- TypeScript

**Frontend:**
- React 18
- Vite
- Tanstack Query
- Shadcn UI
- Tailwind CSS
- TypeScript

## 🎯 Use Cases

### Simple Task
"Add a README file with installation instructions"
→ Single agent handles everything

### Complex Task
"Refactor authentication across 50 files in 3 modules"
→ 3 sub-agents work in parallel:
1. Frontend auth components
2. Backend API endpoints
3. Shared utilities

### Iterative Planning
Agent asks questions like:
- "What authentication method should be used?"
- "Should we keep backwards compatibility?"

You answer, agent creates an accurate plan.

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Cursor API key
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Orchestration
- `POST /api/orchestration/create` - Start new orchestration
- `GET /api/orchestration/list` - List all orchestrations
- `GET /api/orchestration/:id` - Get details
- `POST /api/orchestration/:id/answer` - Answer follow-up questions
- `POST /api/orchestration/:id/approve` - Approve execution plan
- `POST /api/orchestration/:id/cancel` - Cancel orchestration

### WebSocket
- `ws://localhost:3001/ws` - Real-time updates

Subscribe to orchestration:
```json
{
  "type": "subscribe",
  "orchestrationId": "clxxx..."
}
```

## 🔧 Development

```bash
# Run both frontend and backend
npm run dev

# Run separately
npm run dev:server  # Backend on :3001
npm run dev:web     # Frontend on :5173

# Build for production
npm run build

# Database operations
cd packages/server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
```

## 📝 Environment Variables

**Backend (`packages/server/.env`):**
```env
PORT=3001
DATABASE_URL="postgresql://..."
CURSOR_API_BASE_URL=https://api.cursor.com/v0
FRONTEND_URL=http://localhost:5173
```

**Frontend (`packages/web/.env`):**
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws
```

## 🗄️ Database Schema

Key models:
- **User** - Authentication and API keys
- **Session** - User sessions
- **Orchestration** - Main orchestration records
- **Agent** - Individual Cursor agents (supports hierarchy)
- **FollowUpMessage** - Question/answer pairs
- **OrchestrationEvent** - Audit trail

See `packages/server/prisma/schema.prisma` for full schema.

## 🎨 UI Components

Built with Shadcn UI:
- Button, Card, Input, Textarea
- Label, Toast notifications
- Fully customizable with Tailwind

Dark mode support included.

## 🔐 Security

- API keys stored encrypted
- Session-based authentication
- CORS protection
- Input validation with Zod
- SQL injection protection via Prisma

## 🚢 Deployment

See [SETUP.md](./SETUP.md) for production deployment guide.

Key steps:
1. Build both packages
2. Configure production database
3. Set environment variables
4. Run migrations
5. Start server and serve frontend

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Cursor API Docs](https://cursor.com/docs/cloud-agent/api/endpoints) - Cursor Cloud Agent API

## 🤝 Contributing

This project uses vertical slice architecture. Each feature is self-contained:

1. Create feature directory in `src/features/`
2. Include routes, services, and types together
3. Update API types if adding endpoints
4. Add real-time events for new actions
5. Update documentation

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with [Cursor](https://cursor.com)
- UI components from [Shadcn](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

---

**Made with ❤️ by the Cursor Agent Orchestrator Team**
