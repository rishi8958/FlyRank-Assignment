const memoryRepository = require('./memoryTaskRepository');

const repositoryType = process.env.TASKS_REPOSITORY || 'postgres';
let repository;

if (repositoryType === 'memory') {
  repository = memoryRepository;
} else {
  repository = require('./postgresTaskRepository');
}

module.exports = repository;
