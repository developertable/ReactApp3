// src/api/tasks.js
// ─────────────────────────────────────────────────────────────────────────────
// API wrapper for main task endpoints.
//
// All HTTP calls to /api/tasks live here. Components never call fetch()
// directly — they import these functions instead. This keeps components
// focused on UI and centralizes the network layer in one file.
//
// All functions return promises that resolve to parsed JSON, or throw
// an Error if the response was not ok (so callers can use try/catch).
// ─────────────────────────────────────────────────────────────────────────────

// Base URL for all task endpoints. The leading /api is the prefix that
// Vite's proxy intercepts and forwards to the PHP backend during dev.
const BASE = '/api/tasks'

/**
 * Shared response handler. Parses JSON and throws on non-2xx responses.
 *
 * Why throw instead of returning the error?
 *   - Lets callers use try/catch for error handling
 *   - Prevents silent bugs where a failed call returns "undefined"
 *   - Matches how async/await is conventionally used
 */
async function handle(response) {
  const data = await response.json()
  if (!response.ok) {
    // The PHP API returns errors as { error: "message" }
    throw new Error(data.error || `Request failed: ${response.status}`)
  }
  return data
}

/**
 * GET /api/tasks
 * Fetch all tasks (with their subtasks nested and progress_percent computed).
 *
 * @returns {Promise<Array>} array of task objects
 */
export function getTasks() {
  return fetch(BASE).then(handle)
}

/**
 * GET /api/tasks/:id
 * Fetch a single task by id.
 *
 * @param {number} id - task id
 * @returns {Promise<Object>} task object with subtasks nested
 */
export function getTask(id) {
  return fetch(`${BASE}/${id}`).then(handle)
}

/**
 * POST /api/tasks
 * Create a new main task. Subtasks are added separately after the task
 * is created (see addSubtask in subtasks.js).
 *
 * @param {Object} body - { title, description?, priority?, due_date? }
 * @returns {Promise<Object>} the new task with its assigned id
 */
export function createTask(body) {
  return fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)
}

/**
 * PUT /api/tasks/:id
 * Update one or more fields on an existing task.
 *
 * @param {number} id - task id
 * @param {Object} body - any subset of { title, description, priority, due_date }
 * @returns {Promise<Object>} the updated task
 */
export function updateTask(id, body) {
  return fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)
}

/**
 * DELETE /api/tasks/:id
 * Delete a task. The PHP backend cascades the delete to all its subtasks
 * via the foreign key constraint, so we don't need to delete subtasks
 * manually before this call.
 *
 * @param {number} id - task id
 * @returns {Promise<{success: true, id: number}>}
 */
export function deleteTask(id) {
  return fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(handle)
}