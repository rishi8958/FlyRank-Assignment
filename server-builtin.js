const http = require('http');
const url = require('url');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

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

function sendJSON(res, status, data) {
 res.writeHead(status, { 'Content-Type': 'application/json' });
 res.end(JSON.stringify(data));
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

const server = http.createServer((req, res) => {
 const parsedUrl = url.parse(req.url, true);
 const pathname = parsedUrl.pathname;
 const method = req.method;

 res.setHeader('Content-Type', 'application/json');
 res.setHeader('Access-Control-Allow-Origin', '*');
 res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

 if (method === 'OPTIONS') {
   res.writeHead(200);
   res.end();
   return;
 }

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

 if (pathname === '/openapi.json' && method === 'GET') {
   const openapi = fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8');
   res.writeHead(200, { 'Content-Type': 'application/json' });
   res.end(openapi);
   return;
 }

 if (pathname === '/info' && method === 'GET') {
   return sendJSON(res, 200, {
     name: 'Task API',
     version: '1.0',
     endpoints: ['/tasks']
   });
 }

 if (pathname === '/health' && method === 'GET') {
   return sendJSON(res, 200, { status: 'ok' });
 }

 if (pathname === '/tasks' && method === 'GET') {
   return sendJSON(res, 200, getAllTasks());
 }

 const taskIdMatch = pathname.match(/^\/tasks\/(\d+)$/);
 if (taskIdMatch && method === 'GET') {
   const id = parseInt(taskIdMatch[1], 10);
   const task = getTaskById(id);
   if (!task) {
     return sendJSON(res, 404, { error: `Task ${id} not found` });
   }
   return sendJSON(res, 200, task);
  }

 if (pathname === '/tasks' && method === 'POST') {
   return parseBody(req, (body) => {
     if (!body || !body.title || typeof body.title !== 'string' || body.title.trim() === '') {
       return sendJSON(res, 400, { error: 'Title is required and must not be empty' });
     }

     const title = body.title.trim();
     const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
     const result = insert.run(title, 0);
     const newTask = getTaskById(Number(result.lastInsertRowid));
     return sendJSON(res, 201, newTask);
   });
 }

 if (taskIdMatch && method === 'PUT') {
   const id = parseInt(taskIdMatch[1], 10);
   const existingTask = getTaskById(id);
   if (!existingTask) {
     return sendJSON(res, 404, { error: `Task ${id} not found` });
   }

   return parseBody(req, (body) => {
     if (!body) {
       return sendJSON(res, 400, { error: 'Invalid request body' });
     }

     if (body.title !== undefined) {
       if (typeof body.title !== 'string' || body.title.trim() === '') {
         return sendJSON(res, 400, { error: 'Title must not be empty' });
       }
       db.prepare('UPDATE tasks SET title = ? WHERE id = ?').run(body.title.trim(), id);
     }

     if (body.done !== undefined) {
       db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(Boolean(body.done) ? 1 : 0, id);
     }

     return sendJSON(res, 200, getTaskById(id));
   });
 }

 if (taskIdMatch && method === 'DELETE') {
   const id = parseInt(taskIdMatch[1], 10);
   const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
   if (result.changes === 0) {
     return sendJSON(res, 404, { error: `Task ${id} not found` });
   }
   res.writeHead(204);
   res.end();
   return;
 }

 return sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
 console.log(`✓ Task API running on http://localhost:${PORT}`);
 console.log(`✓ Database file: ${DB_PATH}`);
 console.log(`✓ GET  http://localhost:${PORT}/`);
 console.log(`✓ GET  http://localhost:${PORT}/health`);
 console.log(`✓ GET  http://localhost:${PORT}/tasks`);
 console.log(`✓ POST http://localhost:${PORT}/tasks`);
 console.log(`✓ PUT  http://localhost:${PORT}/tasks/:id`);
 console.log(`✓ DELETE http://localhost:${PORT}/tasks/:id`);
});
