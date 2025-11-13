# Local Database Package

PostgreSQL database for local development of the orchestrator service.

## Quick Start

```bash
# Start the database
npm start

# Stop the database
npm stop

# Restart the database
npm restart

# View logs
npm run logs

# Stop and remove all data (fresh start)
npm run destroy
```

## Database Configuration

- **Host:** localhost
- **Port:** 5435
- **User:** postgres
- **Password:** postgres
- **Database:** orchestrator_dev

## Connection String

```
Host=localhost;Port=5435;Database=orchestrator_dev;Username=postgres;Password=postgres
```

## What's Included

- PostgreSQL 16 (Alpine Linux)
- Persistent volume for data
- Health checks
- Automatic restart policy

## Requirements

- Docker Desktop or Docker Engine
- Docker Compose

## Scripts

- `npm start` - Start PostgreSQL container and wait until it's ready
- `npm stop` - Stop the container
- `npm restart` - Restart the container
- `npm run logs` - Follow container logs
- `npm run destroy` - Stop container and delete all data
- `npm run wait-for-db` - Wait for database to be ready (used by start)

## Notes

- Data persists between restarts in a Docker volume
- Container restarts automatically unless manually stopped
- Health checks ensure the database is ready before returning

