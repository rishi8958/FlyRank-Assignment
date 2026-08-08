const express = require('express');
const app = express();

app.use(express.json());

const PORT = 3000;

// In-memory task storage
const tasks = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Read a book", done: false },
  { id: 3, title: "Write code", done: true }
];

let nextId = 4;

// ===== Stage 0: Hello Server =====
app.get('/', (req, res) => {
  res.json({ message: "Hello, server!" });
});

// ===== Stage 1: Root and Health Endpoints =====
app.get('/info', (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

// ===== Stage 2: Read Endpoints =====
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  
  res.json(task);
});

// ===== Stage 3: Create =====
app.post('/tasks', (req, res) => {
  const { title } = req.body;
  
  // Validation
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: "Title is required and must not be empty" });
  }
  
  const newTask = {
    id: nextId++,
    title: title.trim(),
    done: false
  };
  
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// ===== Stage 4: Update & Delete =====
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  
  const { title, done } = req.body;
  
  // Validation: at least one field must be provided
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ error: "Title must not be empty" });
  }
  
  if (title !== undefined) {
    task.title = title.trim();
  }
  
  if (done !== undefined) {
    task.done = Boolean(done);
  }
  
  res.json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  
  tasks.splice(index, 1);
  res.status(204).send();
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Task API running on http://localhost:${PORT}`);
  console.log(`✓ Swagger UI at http://localhost:${PORT}/docs`);
});
