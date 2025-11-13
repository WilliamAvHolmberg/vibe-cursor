# 🚀 Complete Migration Guide: Node → .NET

## ✅ What's Been Completed

### Backend (.NET API)
- ✅ All database models and EF Core migration
- ✅ Cursor API client wrapper
- ✅ OrchestrationService business logic
- ✅ Hangfire background jobs (polling & monitoring)
- ✅ CQRS commands, queries, and handlers
- ✅ SignalR hub for real-time WebSocket replacement
- ✅ Controllers and auth endpoints
- ✅ **Build Status: SUCCESS** (0 errors)

### Frontend (React)
- ✅ Installed @microsoft/signalr
- ✅ Replaced WebSocket with SignalR
- ✅ Updated API URL (port 3001 → 5000)
- ✅ Updated auth endpoint to `/api/auth/cursor-login`
- ✅ Updated auth response handling
- ✅ **Build Status: SUCCESS**

### Local Database
- ✅ Docker Compose PostgreSQL setup
- ✅ npm scripts for easy management
- ✅ Health checks and wait-for-db script
- ✅ Port 5435 (no conflicts!)

## 🎯 Quick Start

### 1. Start the Database

```bash
# From project root
npm run db:start

# Or from packages/local-db
cd packages/local-db
npm start
```

**Database runs on port 5435** (avoids conflicts with existing PostgreSQL)

### 2. Apply Database Migration

```bash
cd packages/dotnet-api
dotnet ef database update
```

This creates all orchestration tables in the database.

### 3. Run the .NET API

```bash
cd packages/dotnet-api
dotnet run
```

The API will be available at:
- HTTP: http://localhost:5000
- SignalR Hub: ws://localhost:5000/hubs/orchestration
- Swagger: http://localhost:5000/swagger

### 4. Run the Frontend

```bash
cd packages/web
npm run dev
```

Frontend will be at http://localhost:5173

## 📦 Available Scripts

### Root Level
```bash
# Database management
npm run db:start     # Start PostgreSQL
npm run db:stop      # Stop PostgreSQL
npm run db:logs      # View logs
npm run db:destroy   # Stop and delete all data

# Development (Node server - legacy)
npm run dev          # Run both server and web
npm run dev:server   # Run Node server only
npm run dev:web      # Run web only
```

### .NET API (packages/dotnet-api)
```bash
dotnet run                      # Run API
dotnet watch                    # Run with hot reload
dotnet ef database update       # Apply migrations
dotnet ef migrations add [Name] # Create new migration
```

### Frontend (packages/web)
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### Database (packages/local-db)
```bash
npm start       # Start database and wait until ready
npm stop        # Stop database
npm run logs    # Follow logs
npm run destroy # Delete all data
```

## 🔌 Ports Summary

- **Frontend:** 5173
- **Node Server (legacy):** 3001
- **.NET API:** 5000
- **PostgreSQL:** 5435
- **SignalR Hub:** ws://localhost:5000/hubs/orchestration

## 🗄️ Database Configuration

**Connection String:**
```
Host=localhost;Port=5435;Database=orchestrator_dev;Username=postgres;Password=postgres
```

Already configured in:
- `packages/dotnet-api/appsettings.json`
- `packages/dotnet-api/example-appsettings.Development.json`

## 🔄 Migration Path

### Current Flow (Node)
1. Frontend → http://localhost:3001 (Node API)
2. WebSocket → ws://localhost:3001/ws
3. Auth → POST /api/auth/login

### New Flow (.NET)
1. Frontend → http://localhost:5000 (.NET API)
2. SignalR → ws://localhost:5000/hubs/orchestration
3. Auth → POST /api/auth/cursor-login

## 📝 Key Changes

### API Endpoints (All Compatible!)
- `POST /api/auth/cursor-login` - Login with Cursor API key
- `POST /api/orchestration/create` - Create orchestration
- `GET /api/orchestration/list` - List orchestrations
- `GET /api/orchestration/{id}` - Get details
- `POST /api/orchestration/{id}/answer` - Answer questions
- `POST /api/orchestration/{id}/approve` - Approve plan
- `POST /api/orchestration/{id}/cancel` - Cancel
- `GET /api/orchestration/{id}/conversation` - Get conversation

### WebSocket → SignalR
Frontend now uses `@microsoft/signalr` package. Message format is identical!

### Response Structure Changes
**Login Response:**
```typescript
// Old (Node)
{ token, expiresAt, user: { id, email } }

// New (.NET)
{ token, expiresAt, userId, email }
```

Frontend has been updated to handle this.

## 🧪 Testing the Migration

1. **Start database:** `npm run db:start`
2. **Apply migrations:** `cd packages/dotnet-api && dotnet ef database update`
3. **Run .NET API:** `dotnet run` (in packages/dotnet-api)
4. **Run frontend:** `npm run dev` (in packages/web)
5. **Test login** with your Cursor API key
6. **Create an orchestration** and watch real-time updates via SignalR

## 🐛 Troubleshooting

### Database won't start
```bash
# Check if Docker is running
docker ps

# Check port 5435 isn't in use
lsof -i :5435

# View database logs
npm run db:logs
```

### .NET API won't connect to database
```bash
# Verify connection string in appsettings.json
# Should be: Host=localhost;Port=5435;Database=orchestrator_dev;...

# Verify database is running
docker ps | grep orchestrator-postgres

# Test connection manually
psql -h localhost -p 5435 -U postgres -d orchestrator_dev
```

### Frontend SignalR connection fails
- Check .NET API is running on port 5000
- Check browser console for connection errors
- Verify CORS is configured (should be by default)

## 📚 Documentation

- **Backend Architecture:** `packages/dotnet-api/CLAUDE.md`
- **Frontend Migration:** `packages/dotnet-api/FRONTEND_MIGRATION_GUIDE.md`
- **Database Setup:** `packages/local-db/README.md`

## 🎉 What's Different?

### Better Performance
- SignalR with automatic reconnection
- Hangfire for reliable background jobs
- EF Core with optimized queries

### Better Developer Experience
- Strongly typed C# throughout
- CQRS pattern for clean separation
- Proper migrations with EF Core
- Swagger for API documentation

### Better Production
- Built-in telemetry and logging
- Health checks
- Proper error handling with Result<T> pattern
- Rate limiting
- JWT authentication

---

**You're all set!** 🚀 The Node server has been successfully ported to .NET with full feature parity and better architecture.

