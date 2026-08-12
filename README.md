# Task API with Postgres Persistence

This repository now runs the Task API against a real Postgres database in Docker.
The storage layer is isolated behind a repository interface, so the service and the HTTP routes do not need to change when the backing database changes.

## What changed

- added `docker-compose.yml` to start the app and Postgres together
- added `Dockerfile` so `docker compose up --build` builds the Node app image
- moved storage access into `taskRepository.js`
- implemented a Postgres repository in `postgresTaskRepository.js`
- added `init.sql` to create the `tasks` table when Postgres starts
- added `.env.example` so local connection settings are documented and the real `.env` stays ignored

## Run the full stack

1. Copy `.env.example` to `.env`
2. Start the stack:

```bash
docker compose up --build
```

The app will be available at http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env`, then edit if needed.

`.env.example` contains:

```text
DATABASE_URL=postgres://postgres:postgres@db:5432/tasks
```

## Persistence proof

1. Start the stack:

```bash
docker compose up --build -d
```

2. Create tasks:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Persisted task"}'
```

3. Confirm the task exists:

```bash
curl http://localhost:3000/tasks
```

4. Restart the stack:

```bash
docker compose down
```
```bash
docker compose up -d
```

5. Confirm the task still exists:

```bash
curl http://localhost:3000/tasks
```

The same task remains after the Postgres container restarts because the database uses a named Docker volume (`db-data`).

## API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/` | Hello server message | 200 |
| GET | `/health` | Health check | 200 |
| GET | `/info` | API information | 200 |
| GET | `/tasks` | List all tasks | 200 |
| GET | `/tasks/:id` | Get single task | 200, 404 |
| POST | `/tasks` | Create new task | 201, 400 |
| PUT | `/tasks/:id` | Update task | 200, 400, 404 |
| DELETE | `/tasks/:id` | Delete task | 204, 404 |

## Storage layering

The HTTP service code in `server.js` uses `taskRepository.js` for all CRUD operations.
By default that module loads `postgresTaskRepository.js`, so the service and routes do not know the storage details.

If you want to run an in-memory repository instead, set:

```bash
TASKS_REPOSITORY=memory
```

## Project structure

```text
.
├── Dockerfile
├── README.md
├── docker-compose.yml
├── init.sql
├── openapi.json
├── package.json
├── .env.example
├── .dockerignore
├── server-builtin.js
├── server.js
├── taskRepository.js
├── postgresTaskRepository.js
└── memoryTaskRepository.js
```

## Notes

- The app uses `DATABASE_URL` from `.env` to connect to Postgres.
- The Docker Compose file keeps Postgres data in `db-data` so rows survive container restarts.
- The Postgres initialization SQL is in `init.sql`.
