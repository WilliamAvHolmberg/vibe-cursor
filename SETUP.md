# Cursor Agent Orchestrator - Setup Guide

## Overview

This is an Enhanced Cursor Agent Orchestrator that enables intelligent task decomposition, planning, and parallel agent execution using the Cursor Cloud Agent API.

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Cursor API key (get from https://cursor.com/settings)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend

Create `.env` file in `packages/server`:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/cursor_orchestrator?schema=public"
CURSOR_API_KEY=your_cursor_api_key_here
CURSOR_API_BASE_URL=https://api.cursor.com/v0
FRONTEND_URL=http://localhost:5173
```

### 3. Setup Database

```bash
cd packages/server
npm run db:push
```

This will create all necessary tables in your PostgreSQL database.

### 4. Configure Frontend

Create `.env` file in `packages/web`:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws
```

## Running the Application

### Development Mode

From the root directory, run both frontend and backend:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:web
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health

## How It Works

### 1. Authentication
- Users authenticate using their Cursor API key
- The system validates the key against Cursor's API
- A session is created and stored in the database

### 2. Orchestration Flow

#### Step 1: Create Orchestration
- User provides a repository URL and task description
- System creates an orchestration record and starts planning phase

#### Step 2: Planning Agent
- A specialized planning agent analyzes the request
- It either:
  - **Asks follow-up questions** if more information is needed
  - **Generates an execution plan** with tasks and optional sub-agents

#### Step 3: Follow-up Questions (if needed)
- User answers questions in the UI
- Planning agent re-runs with the new information
- Repeats until a plan can be generated

#### Step 4: Plan Review
- User reviews the generated plan including:
  - Task breakdown with complexity estimates
  - Sub-agent configuration (for complex tasks)
  - Dependencies between tasks
- User approves or cancels

#### Step 5: Execution
- System spawns agent(s) via Cursor Cloud Agent API
- For complex tasks, multiple sub-agents work in parallel
- Each sub-agent gets:
  - Specific prompt and instructions
  - Subset of tasks
  - Its own branch name
  - Auto-create PR configuration

#### Step 6: Monitoring
- Real-time status updates via WebSocket
- Agents can be in states: CREATING, RUNNING, COMPLETED, FAILED
- Pull request URLs are captured when available

### 3. Sub-Agent Strategy

The orchestrator intelligently decides when to use sub-agents based on:

- **Simple tasks** (< 5 files, single area): Single agent
- **Complex tasks** (many files, multiple areas): Multiple sub-agents

Example: Refactoring 100 files across 3 modules
- Sub-agent 1: Frontend module (35 files)
- Sub-agent 2: Backend API (40 files)  
- Sub-agent 3: Shared utilities (25 files)

Each operates independently with its own branch and PR.

## Architecture

### Backend (packages/server)

Vertical feature slice architecture:

```
src/
├── features/
│   ├── auth/              # Authentication
│   │   └── auth.routes.ts
│   ├── orchestration/     # Orchestration logic
│   │   ├── orchestration.routes.ts
│   │   ├── orchestration.service.ts
│   │   └── orchestration.prompts.ts
│   └── websocket/         # Real-time updates
│       └── websocket.service.ts
├── lib/
│   ├── prisma.ts          # Database client
│   ├── cursor-api.ts      # Cursor API wrapper
│   └── validation.ts      # Zod schemas
├── middleware/
│   └── auth.middleware.ts
└── index.ts               # Entry point
```

### Frontend (packages/web)

Vertical feature slice architecture:

```
src/
├── features/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   └── orchestration/
│       └── OrchestrationDetailPage.tsx
├── components/ui/         # Shadcn components
├── lib/
│   ├── api.ts             # API client
│   ├── auth-context.tsx   # Auth provider
│   └── use-websocket.ts   # WebSocket hook
├── App.tsx
└── main.tsx
```

## Key Technologies

- **Backend**: Express, Prisma, WebSocket, TypeScript
- **Frontend**: React, Vite, Tanstack Query, Shadcn UI, Tailwind CSS
- **Database**: PostgreSQL
- **Real-time**: WebSockets for live updates
- **API**: Cursor Cloud Agent API

## Planning Agent System Prompt

The planning agent uses a specially crafted system prompt that enforces:

- JSON-only output (no markdown, no other text)
- Specific schema validation via Zod
- Two output modes: questions or plan
- Complexity estimation for tasks
- Sub-agent decomposition for complex work
- Task dependencies

This ensures the orchestrator can reliably parse and act on agent outputs.

## Troubleshooting

### Database Connection Issues
```bash
# Check your DATABASE_URL is correct
# Ensure PostgreSQL is running
# Try regenerating Prisma client:
cd packages/server
npm run db:generate
```

### Cursor API Issues
```bash
# Verify your API key at https://cursor.com/settings
# Check CURSOR_API_KEY in server .env
# Test authentication via login page
```

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
npm install

# Rebuild
npm run build
```

## Production Deployment

1. Build both packages:
```bash
npm run build
```

2. Set production environment variables

3. Run database migrations:
```bash
cd packages/server
npm run db:push
```

4. Start server:
```bash
cd packages/server
npm start
```

5. Serve frontend build from `packages/web/dist`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Cursor API key
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Orchestration
- `POST /api/orchestration/create` - Create orchestration
- `GET /api/orchestration/list` - List orchestrations
- `GET /api/orchestration/:id` - Get details
- `POST /api/orchestration/:id/answer` - Answer questions
- `POST /api/orchestration/:id/approve` - Approve plan
- `POST /api/orchestration/:id/cancel` - Cancel

### WebSocket
- `ws://localhost:3001/ws` - Real-time updates

## Contributing

This project follows vertical slice architecture. When adding features:

1. Create feature directory in both frontend and backend
2. Keep related code together (routes, services, components)
3. Update API types if adding new endpoints
4. Add WebSocket events for real-time updates
5. Update this README with new features

## License

MIT
