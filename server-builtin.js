const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// In-memory task storage
const tasks = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Read a book", done: false },
  { id: 3, title: "Write code", done: true }
];

let nextId = 4;

// Helper to parse JSON body
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      callback(body ? JSON.parse(body) : {});
    } catch (e) {
      callback(null);
    }
  });
}

// Helper to send JSON response
function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // === Swagger UI ===
  if (pathname === '/docs' && method === 'GET') {
    const swaggerHTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>Task API - Swagger UI</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
    <script>
      const ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      })
    </script>
  </body>
</html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(swaggerHTML);
    return;
  }

  // === OpenAPI Spec ===
  if (pathname === '/openapi.json' && method === 'GET') {
    const openapi = fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(openapi);
    return;
  }

  // === Stage 1: Info & Health ===
  if (pathname === '/info' && method === 'GET') {
    return sendJSON(res, 200, {
      name: "Task API",
      version: "1.0",
      endpoints: ["/tasks"]
    });
  }

  if (pathname === '/health' && method === 'GET') {
    return sendJSON(res, 200, { status: "ok" });
  }

  // === Stage 2: List Tasks ===
  if (pathname === '/tasks' && method === 'GET') {
    return sendJSON(res, 200, tasks);
  }

  // === Stage 2: Get Single Task ===
  const taskIdMatch = pathname.match(/^\/tasks\/(\d+)$/);
  if (taskIdMatch && method === 'GET') {
    const id = parseInt(taskIdMatch[1]);
    const task = tasks.find(t => t.id === id);
    if (!task) {
      return sendJSON(res, 404, { error: `Task ${id} not found` });
    }
    return sendJSON(res, 200, task);
  }

  // === Stage 3: Create Task ===
  if (pathname === '/tasks' && method === 'POST') {
    return parseBody(req, (body) => {
      if (!body || !body.title || typeof body.title !== 'string' || body.title.trim() === '') {
        return sendJSON(res, 400, { error: "Title is required and must not be empty" });
      }
      const newTask = {
        id: nextId++,
        title: body.title.trim(),
        done: false
      };
      tasks.push(newTask);
      return sendJSON(res, 201, newTask);
    });
  }

  // === Stage 4: Update Task ===
  if (taskIdMatch && method === 'PUT') {
    const id = parseInt(taskIdMatch[1]);
    const task = tasks.find(t => t.id === id);
    if (!task) {
      return sendJSON(res, 404, { error: `Task ${id} not found` });
    }
    return parseBody(req, (body) => {
      if (!body) {
        return sendJSON(res, 400, { error: "Invalid request body" });
      }
      if (body.title !== undefined) {
        if (typeof body.title !== 'string' || body.title.trim() === '') {
          return sendJSON(res, 400, { error: "Title must not be empty" });
        }
        task.title = body.title.trim();
      }
      if (body.done !== undefined) {
        task.done = Boolean(body.done);
      }
      return sendJSON(res, 200, task);
    });
  }

  // === Stage 4: Delete Task ===
  if (taskIdMatch && method === 'DELETE') {
    const id = parseInt(taskIdMatch[1]);
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return sendJSON(res, 404, { error: `Task ${id} not found` });
    }
    tasks.splice(index, 1);
    res.writeHead(204);
    res.end();
    return;
  }

  // 404
  return sendJSON(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`✓ Task API running on http://localhost:${PORT}`);
  console.log(`✓ GET  http://localhost:${PORT}/`);
  console.log(`✓ GET  http://localhost:${PORT}/health`);
  console.log(`✓ GET  http://localhost:${PORT}/tasks`);
  console.log(`✓ POST http://localhost:${PORT}/tasks`);
  console.log(`✓ PUT  http://localhost:${PORT}/tasks/:id`);
  console.log(`✓ DELETE http://localhost:${PORT}/tasks/:id`);
});
