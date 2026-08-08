# Task API - Complete CRUD Implementation

A simple, in-memory CRUD (Create, Read, Update, Delete) API for managing tasks, built with Node.js using only built-in HTTP module.

## Quick Start

```bash
npm start
```

Server starts on **http://localhost:3000**

### First Time Setup
```bash
# No npm dependencies needed! Just start the server
node server-builtin.js
```

## Features

✅ Full CRUD operations on an in-memory task list  
✅ Proper HTTP status codes (200, 201, 204, 400, 404)  
✅ Input validation (title required, non-empty)  
✅ Swagger UI at `/docs` for interactive testing  
✅ OpenAPI 3.0 specification  
✅ No external dependencies (built-in Node.js modules only)

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

## Example Requests

### Get all tasks
```bash
curl -i http://localhost:3000/tasks
```

**Response (200):**
```json
[
  {"id": 1, "title": "Buy milk", "done": false},
  {"id": 2, "title": "Read a book", "done": false},
  {"id": 3, "title": "Write code", "done": true}
]
```

### Create a new task
```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Node.js"}'
```

**Response (201):**
```json
{"id": 4, "title": "Learn Node.js", "done": false}
```

### Get single task
```bash
curl -i http://localhost:3000/tasks/1
```

**Response (200):**
```json
{"id": 1, "title": "Buy milk", "done": false}
```

**Response (404) when task doesn't exist:**
```json
{"error": "Task 99 not found"}
```

### Update a task
```bash
curl -i -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```

**Response (200):**
```json
{"id": 1, "title": "Buy milk", "done": true}
```

### Delete a task
```bash
curl -i -X DELETE http://localhost:3000/tasks/1
```

**Response (204):** No content

## Swagger UI

Visit **http://localhost:3000/docs** to try all endpoints interactively with the "Try it out" button.

![Swagger UI Screenshot]

The Swagger UI provides:
- Interactive documentation for every endpoint
- "Try it out" button to send real requests
- Request/response examples
- Status code documentation

## Testing

### Full CRUD Cycle via curl

```bash
# Start the server
npm start

# In another terminal:

# 1. Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries"}'
# Response: {"id":4,"title":"Buy groceries","done":false}

# 2. List all tasks
curl http://localhost:3000/tasks
# Response: [... all tasks ...]

# 3. Update the task
curl -X PUT http://localhost:3000/tasks/4 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
# Response: {"id":4,"title":"Buy groceries","done":true}

# 4. Delete the task
curl -X DELETE http://localhost:3000/tasks/4
# Response: 204 No Content

# 5. Verify deletion
curl http://localhost:3000/tasks
# Response: [... task 4 is gone ...]
```

### Testing via Swagger UI

1. Open http://localhost:3000/docs
2. For each endpoint, click "Try it out"
3. Fill in the request details (optional for GET)
4. Click "Execute"
5. View the response, status code, and headers

## Data Structure

Each task is a JSON object:
```json
{
  "id": 1,
  "title": "Task title",
  "done": false
}
```

- **id**: Unique integer identifier (auto-generated)
- **title**: String describing the task (required, non-empty)
- **done**: Boolean indicating completion status

## Error Handling

### 400 Bad Request
Returned when POST/PUT request is invalid:
- Missing `title` field
- Empty or whitespace-only `title`

```json
{"error": "Title is required and must not be empty"}
```

### 404 Not Found
Returned when requesting a task ID that doesn't exist:
```json
{"error": "Task 99 not found"}
```

## In-Memory Storage

⚠️ **Important**: All data is stored in memory. When the server restarts, all tasks are reset to the 3 default examples.

This is intentional for Week 2. Next week (Week 3) we'll add a real database to persist data.

```javascript
const tasks = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Read a book", done: false },
  { id: 3, title: "Write code", done: true }
];
```

## Implementation Notes

### Technology Stack
- **Language**: Node.js (no version restrictions, v24+ tested)
- **Framework**: None - built with Node.js built-in `http` module
- **Dependencies**: Zero (no npm packages required)
- **Database**: In-memory array

### Why no Express?
This implementation uses Node.js built-in modules to show how HTTP routing, JSON parsing, and status codes work under the hood. Perfect for learning! In production, Express or similar frameworks provide useful middleware and are strongly recommended.

### File Structure
```
.
├── server-builtin.js    # Main server (uses only Node.js built-ins)
├── openapi.json         # OpenAPI 3.0 specification
├── package.json         # npm metadata
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Stages Completed

- ✅ Stage 0: Hello server
- ✅ Stage 1: Root and health endpoints
- ✅ Stage 2: Read endpoints with 404 handling
- ✅ Stage 3: Create endpoint with validation
- ✅ Stage 4: Update and Delete endpoints
- ✅ Stage 5: Swagger UI and OpenAPI documentation

## What Happens on Restart?

When you stop and restart the server (`npm start`), the task list reverts to 3 default examples:
```
1. Buy milk (done: false)
2. Read a book (done: false)
3. Write code (done: true)
```

Any tasks you created or modified are **lost**. This teaches an important lesson: **in-memory data is ephemeral**. Next week we'll learn how databases solve this problem.

## Next Steps

Future improvements (Week 3+):
- Add a persistent database (PostgreSQL, MongoDB, SQLite)
- Add user authentication
- Add filtering and search
- Add pagination
- Deploy to production

## Author

Built as part of FlyRank W2 A1 assignment
