const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
app.use(express.json());

const PORT = 3000;

function getDatabasePath() {
  const preferredPath = path.join(__dirname, 'tasks.db');
  try {
    fs.accessSync(__dirname, fs.constants.W_OK);
    fs.writeFileSync(preferredPath, '');
    fs.unlinkSync(preferredPath);
    return preferredPath;
  } catch (error) {
    const fallbackDir = path.join(os.tmpdir(), 'flyrank-task-api');
    fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, 'tasks.db');
  }
}

const DB_PATH = getDatabasePath();
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`);

const existingCount = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
if (existingCount === 0) {
  const seedTasks = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  seedTasks.run('Buy milk', 0);
  seedTasks.run('Read a book', 0);
  seedTasks.run('Write code', 1);
}

function mapTask(row) {
  return row ? { id: row.id, title: row.title, done: Boolean(row.done) } : null;
}

function getTaskById(id) {
  const row = db.prepare('SELECT id, title, done FROM tasks WHERE id = ?').get(id);
  return mapTask(row);
}

function getAllTasks() {
  const rows = db.prepare('SELECT id, title, done FROM tasks ORDER BY id').all();
  return rows.map(mapTask);
}

// ===== Stage 0: Hello Server =====
app.get('/', (req, res) => {
  res.json({ message: 'Hello, server!' });
});

// ===== Stage 1: Root and Health Endpoints =====
app.get('/info', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== Stage 2: Read Endpoints =====
app.get('/tasks', (req, res) => {
  res.json(getAllTasks());
});

app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = getTaskById(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(task);
});

// ===== Stage 3: Create =====
app.post('/tasks', (req, res) => {
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and must not be empty' });
  }

  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  const result = insert.run(title.trim(), 0);
  const newTask = getTaskById(Number(result.lastInsertRowid));
  res.status(201).json(newTask);
});

// ===== Stage 4: Update & Delete =====
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existingTask = getTaskById(id);

  if (!existingTask) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ error: 'Title must not be empty' });
  }

  if (title !== undefined) {
    db.prepare('UPDATE tasks SET title = ? WHERE id = ?').run(title.trim(), id);
  }

  if (done !== undefined) {
    db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(Boolean(done) ? 1 : 0, id);
  }

  res.json(getTaskById(id));
});

app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`✓ Task API running on http://localhost:${PORT}`);
  console.log(`✓ Database file: ${DB_PATH}`);
  console.log(`✓ Swagger UI at http://localhost:${PORT}/docs`);
});
