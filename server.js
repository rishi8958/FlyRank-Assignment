require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient');
const requireAuth = require('./middleware/auth');
const taskRepository = require('./taskRepository');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

function send(res, status, data) {
  return res.status(status).json(data);
}

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── Stage 0: health ──────────────────────────────────────────────────────────
app.get('/', (req, res) => send(res, 200, { message: 'Hello, server!' }));
app.get('/health', (req, res) => send(res, 200, { status: 'ok' }));
app.get('/info', (req, res) =>
  send(res, 200, { name: 'Task API', version: '2.0', endpoints: ['/tasks', '/auth', '/public', '/protected'] })
);

// ── Stage 1: signup & login ───────────────────────────────────────────────────
app.post('/auth/signup', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return send(res, 400, { error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return send(res, 400, { error: error.message });

  send(res, 201, { user: data.user });
}));

app.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return send(res, 400, { error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return send(res, 401, { error: 'Invalid login credentials' });

  send(res, 200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}));

// ── Stage 2 & 4: logout (protected) ──────────────────────────────────────────
app.post('/auth/logout', requireAuth, wrap(async (req, res) => {
  const token = req.headers['authorization'].slice(7);
  await supabase.auth.admin.signOut(token).catch(() => null);
  res.status(204).send();
}));

// ── Stage 2: public route ─────────────────────────────────────────────────────
app.get('/public/info', (req, res) =>
  send(res, 200, { message: 'Welcome stranger! This info is public.' })
);

// ── Stage 3 & 4: protected routes (middleware applied) ───────────────────────
app.get('/protected/profile', requireAuth, (req, res) => {
  const { id, email, created_at } = req.user;
  send(res, 200, { id, email, created_at });
});

app.get('/protected/dashboard', requireAuth, (req, res) => {
  send(res, 200, { message: `Welcome to your dashboard, ${req.user.email}` });
});

// ── Existing task routes ──────────────────────────────────────────────────────
app.get('/tasks', wrap(async (req, res) => send(res, 200, await taskRepository.getAllTasks())));

app.get('/tasks/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const task = await taskRepository.getTaskById(id);
  if (!task) return send(res, 404, { error: `Task ${id} not found` });
  send(res, 200, task);
}));

app.post('/tasks', wrap(async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return send(res, 400, { error: 'Title is required and must not be empty' });
  }
  send(res, 201, await taskRepository.createTask(title.trim()));
}));

app.put('/tasks/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const task = await taskRepository.getTaskById(id);
  if (!task) return send(res, 404, { error: `Task ${id} not found` });

  const { title, done } = req.body;
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return send(res, 400, { error: 'Title must not be empty' });
  }
  send(res, 200, await taskRepository.updateTask(id, {
    title: title !== undefined ? title.trim() : undefined,
    done: done !== undefined ? Boolean(done) : undefined,
  }));
}));

app.delete('/tasks/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!await taskRepository.deleteTask(id)) {
    return send(res, 404, { error: `Task ${id} not found` });
  }
  res.status(204).send();
}));

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.get('/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Task API</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
      });
    </script>
  </body>
</html>`);
});

app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8'));
});

app.use((err, req, res, next) => {
  console.error(err);
  send(res, 500, { error: 'Internal server error' });
});

async function main() {
  await taskRepository.initialize();
  app.listen(PORT, () => {
    console.log(`✓ Task API running on http://localhost:${PORT}`);
    console.log(`✓ Server running and connected to Supabase`);
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
