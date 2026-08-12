let tasks = [];
let nextId = 1;

async function initialize() {
  tasks = [];
  nextId = 1;
}

async function getAllTasks() {
  return tasks.map((task) => ({ ...task }));
}

async function getTaskById(id) {
  const task = tasks.find((item) => item.id === id);
  return task ? { ...task } : null;
}

async function createTask(title) {
  const task = { id: nextId++, title, done: false };
  tasks.push(task);
  return { ...task };
}

async function updateTask(id, updates) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) {
    return null;
  }

  const existing = tasks[index];
  const updated = {
    ...existing,
    title: updates.title !== undefined ? updates.title : existing.title,
    done: updates.done !== undefined ? updates.done : existing.done,
  };

  tasks[index] = updated;
  return { ...updated };
}

async function deleteTask(id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) {
    return false;
  }

  tasks.splice(index, 1);
  return true;
}

module.exports = {
  initialize,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
