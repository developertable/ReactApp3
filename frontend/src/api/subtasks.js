// src/api/subtasks.js
// ─────────────────────────────────────────────────────────────────────────────
// API wrapper for subtask endpoints.
//
// Subtasks belong to a parent task. When creating one, we POST to
//   /api/tasks/:taskId/subtasks
// When updating or deleting an existing subtask, we use the subtask's
// own id directly:
//   /api/subtasks/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared response handler. Identical pattern to tasks.js — duplicated
 * intentionally so each api file is self-contained and easy to read.
 */
async function handle(response) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`)
  }
  return data
}

/**
 * POST /api/tasks/:taskId/subtasks
 * Create a new subtask under a parent task.
 *
 * @param {number} taskId - parent task id
 * @param {Object} body - { title, scheduled_at, allotted_minutes, position? }
 * @returns {Promise<Object>} the new subtask with its assigned id
 */
export function addSubtask(taskId, body) {
  return fetch(`/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)
}

/**
 * PUT /api/subtasks/:id
 * Update one or more fields on a subtask. The most common use is
 * toggling the `completed` flag.
 *
 * @param {number} id - subtask id
 * @param {Object} body - any subset of { title, scheduled_at,
 *                                        allotted_minutes, completed, position }
 * @returns {Promise<Object>} the updated subtask
 */
export function updateSubtask(id, body) {
  return fetch(`/api/subtasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)
}

/**
 * Convenience: toggle a subtask's completed state.
 * Wraps updateSubtask with the right body so callers don't have to
 * remember the field name or convert booleans to 0/1.
 *
 * @param {Object} subtask - the subtask object (must have id and completed)
 * @returns {Promise<Object>} the updated subtask
 */
export function toggleSubtask(subtask) {
  return updateSubtask(subtask.id, {
    completed: subtask.completed ? 0 : 1,
  })
}

/**
 * DELETE /api/subtasks/:id
 * Remove a single subtask. Doesn't affect the parent task.
 *
 * @param {number} id - subtask id
 * @returns {Promise<{success: true, id: number}>}
 */
export function deleteSubtask(id) {
  return fetch(`/api/subtasks/${id}`, { method: 'DELETE' }).then(handle)
}