const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to use the Postgres repository');
}

const pool = new Pool({ connectionString });

async function waitForDatabase() {
  const maxAttempts = 10;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Postgres is not available after ${maxAttempts} attempts: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function mapTask(row) {
  return row ? { id: row.id, title: row.title, done: row.done } : null;
}

async function initialize() {
  await waitForDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
}

async function getAllTasks() {
  const result = await pool.query('SELECT id, title, done FROM tasks ORDER BY id');
  return result.rows.map(mapTask);
}

async function getTaskById(id) {
  const result = await pool.query('SELECT id, title, done FROM tasks WHERE id = $1', [id]);
  return mapTask(result.rows[0]);
}

async function createTask(title) {
  const result = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, FALSE) RETURNING id, title, done',
    [title]
  );
  return mapTask(result.rows[0]);
}

async function updateTask(id, updates) {
  const setClauses = [];
  const values = [];

  if (updates.title !== undefined) {
    values.push(updates.title);
    setClauses.push(`title = $${values.length}`);
  }
  if (updates.done !== undefined) {
    values.push(updates.done);
    setClauses.push(`done = $${values.length}`);
  }

  if (setClauses.length === 0) return getTaskById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING id, title, done`,
    values
  );
  return mapTask(result.rows[0]);
}

async function deleteTask(id) {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

module.exports = {
  initialize,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
