# Task API — Auth, Postgres & Docker

A Node.js/Express REST API with Supabase JWT authentication, Postgres persistence, and Swagger UI.

## Stack

- **Express** — HTTP server
- **Supabase Auth** — Identity Provider (signup, login, JWT issuance & verification)
- **Postgres** (Docker) — persistent task storage
- **Swagger UI** — interactive API docs at `/docs`

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/rishi8958/FlyRank-Assignment
cd FlyRank-Assignment
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-anon-public-key
DATABASE_URL=postgres://postgres:postgres@db:5432/tasks
PORT=3000
```

Get `SUPABASE_URL` and `SUPABASE_KEY` from your Supabase Dashboard → Project Settings → API.

### 3. Run with Docker (app + Postgres)

```bash
docker compose up --build
```

### 4. Run locally (without Docker, memory repo)

```bash
TASKS_REPOSITORY=memory npm start
```

## API reference

| Method | Endpoint | Auth required | Description | Success |
|--------|----------|:---:|-------------|---------|
| POST | `/auth/signup` | ✗ | Create account | 201 |
| POST | `/auth/login` | ✗ | Login, returns JWT | 200 |
| POST | `/auth/logout` | ✓ | Invalidate session | 204 |
| GET | `/public/info` | ✗ | Public message | 200 |
| GET | `/protected/profile` | ✓ | Authenticated user info | 200 |
| GET | `/protected/dashboard` | ✓ | User dashboard | 200 |
| GET | `/tasks` | ✗ | List all tasks | 200 |
| GET | `/tasks/:id` | ✗ | Get task by ID | 200 |
| POST | `/tasks` | ✗ | Create task | 201 |
| PUT | `/tasks/:id` | ✗ | Update task | 200 |
| DELETE | `/tasks/:id` | ✗ | Delete task | 204 |
| GET | `/health` | ✗ | Health check | 200 |

**Status codes:** `201` signup/create · `200` read/login · `204` logout/delete · `400` bad input · `401` missing/invalid token · `404` not found

## Auth flow

```
Client                    Backend                  Supabase
  |                          |                        |
  |-- POST /auth/signup ----->|-- signUp() ----------->|
  |<-- 201 { user } ---------|<-- user object ---------|
  |                          |                        |
  |-- POST /auth/login ------>|-- signInWithPassword()->|
  |<-- 200 { access_token } --|<-- session ------------|
  |                          |                        |
  |-- GET /protected/profile  |                        |
  |   Authorization: Bearer <token>                    |
  |-------------------------->|-- getUser(token) ------>|
  |<-- 200 { id, email } -----|<-- user object ---------|
```

## Swagger UI

Visit `http://localhost:3000/docs`, click **Authorize**, paste your `access_token` from `/auth/login`, then use **Try it out** on any protected route.

![Swagger UI showing lock icons on protected routes](./swagger-screenshot.png)

## Persistence proof

```bash
docker compose up --build -d
curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Persisted task"}'
curl http://localhost:3000/tasks          # task appears
docker compose down
docker compose up -d
curl http://localhost:3000/tasks          # task still there
```

Data survives restarts because Postgres uses a named Docker volume (`db-data`).

## Project structure

```
.
├── server.js                  # Express app — all routes
├── supabaseClient.js          # Supabase singleton
├── middleware/
│   └── auth.js                # requireAuth middleware
├── taskRepository.js          # selects memory or postgres
├── postgresTaskRepository.js  # Postgres implementation
├── memoryTaskRepository.js    # In-memory implementation
├── init.sql                   # CREATE TABLE tasks
├── openapi.json               # OpenAPI 3.0 spec
├── docker-compose.yml         # app + db
├── Dockerfile
├── .env.example               # committed template
└── .env                       # gitignored — your secrets
```
