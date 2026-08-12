require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const taskRepository = require('./taskRepository');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

function sendJSON(res, status, data) {
  return res.status(status).json(data);
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get('/', (req, res) => {
  res.json({ message: 'Hello, server!' });
});

app.get('/info', (req, res) => {
  sendJSON(res, 200, {
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks'],
  });
});

app.get('/health', (req, res) => {
  sendJSON(res, 200, { status: 'ok' });
});

app.get('/tasks', asyncHandler(async (req, res) => {
  sendJSON(res, 200, await taskRepository.getAllTasks());
}));

app.get('/tasks/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await taskRepository.getTaskById(id);

  if (!task) {
    return sendJSON(res, 404, { error: `Task ${id} not found` });
  }

  sendJSON(res, 200, task);
}));

app.post('/tasks', asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return sendJSON(res, 400, { error: 'Title is required and must not be empty' });
  }

  const newTask = await taskRepository.createTask(title.trim());
  sendJSON(res, 201, newTask);
}));

app.put('/tasks/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existingTask = await taskRepository.getTaskById(id);

  if (!existingTask) {
    return sendJSON(res, 404, { error: `Task ${id} not found` });
  }

  const { title, done } = req.body;
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return sendJSON(res, 400, { error: 'Title must not be empty' });
  }

  const updatedTask = await taskRepository.updateTask(id, {
    title: title !== undefined ? title.trim() : undefined,
    done: done !== undefined ? Boolean(done) : undefined,
  });

  sendJSON(res, 200, updatedTask);
}));

app.delete('/tasks/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await taskRepository.deleteTask(id);

  if (!deleted) {
    return sendJSON(res, 404, { error: `Task ${id} not found` });
  }

  res.status(204).send();
}));

app.get('/docs', (req, res) => {
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
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHTML);
});

app.get('/openapi.json', (req, res) => {
  const openapi = fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8');
  res.setHeader('Content-Type', 'application/json');
  res.send(openapi);
});

app.use((err, req, res, next) => {
  console.error(err);
  sendJSON(res, 500, { error: 'Internal server error' });
});

async function main() {
  await taskRepository.initialize();
  app.listen(PORT, () => {
    console.log(`✓ Task API running on http://localhost:${PORT}`);
    console.log(`✓ Using repository: ${process.env.TASKS_REPOSITORY || 'postgres'}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
