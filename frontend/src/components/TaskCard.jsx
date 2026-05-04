// src/components/TaskCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// TaskCard — displays a single main task as a card.
//
// Shows:
//   - Task title and priority badge
//   - Days-left badge (or "no due date" if none set)
//   - Progress bar (computed from completed subtasks)
//   - Subtask count summary
//   - Expand/collapse toggle to reveal subtasks
//   - Delete button (with confirmation)
//
// Subtask rendering is delegated to a child <SubtaskRow /> per subtask.
// We're deferring the actual SubtaskRow component to Stage 11; for now,
// each subtask is rendered as a placeholder div.
//
// Props:
//   - task           : the task object (with subtasks nested + progress_percent)
//   - onToggleSubtask: (subtask) => void — called when a subtask checkbox is clicked
//   - onRemoveSubtask: (subtask) => void — called when a subtask delete is clicked
//   - onRemoveTask   : (taskId)  => void — called when the task delete is clicked
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import SubtaskRow from './SubtaskRow.jsx'
import EditTaskForm from './EditTaskForm.jsx'
import EditSubtaskForm from './EditSubtaskForm.jsx'


function daysUntil(dueDate) {
  if (!dueDate) return null

  // Today at local midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Due date at local midnight (parse as YYYY-MM-DD into Y/M/D parts)
  const [y, m, d] = dueDate.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  due.setHours(0, 0, 0, 0)

  // Difference in milliseconds → days
  const diffMs = due.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Format the days-left value into a human-readable label.
 * Examples:
 *   null → "No due date"
 *     0  → "Due today"
 *     1  → "1 day left"
 *     5  → "5 days left"
 *    -1  → "1 day overdue"
 *    -7  → "7 days overdue"
 */
function formatDaysLeft(days) {
  if (days === null) return 'No due date'
  if (days === 0)    return 'Due today'
  if (days === 1)    return '1 day left'
  if (days === -1)   return '1 day overdue'
  if (days > 0)      return `${days} days left`
  return `${Math.abs(days)} days overdue`
}

/**
 * Pick a CSS class for the days-left badge based on urgency.
 * Used for color coding without using bright reds (per design direction).
 */
function daysLeftClass(days) {
  if (days === null) return 'badge-neutral'
  if (days < 0)      return 'badge-overdue'   // brown/amber tone
  if (days <= 2)     return 'badge-soon'      // muted attention
  return 'badge-ok'                           // calm green-gray
}

// ── Component ───────────────────────────────────────────────────────────────

export default function TaskCard({
  task,
  onToggleSubtask,
  onRemoveSubtask,
  onRemoveTask,
  onEditTask,
  onEditSubtask,
  onAddSubtask,
}) {

  const [expanded, setExpanded] = useState(task.subtasks.length > 0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)

  const days       = daysUntil(task.due_date)
  const daysLabel  = formatDaysLeft(days)
  const daysCss    = daysLeftClass(days)

  const completedCount = task.subtasks.filter(st => st.completed).length
  const totalCount     = task.subtasks.length

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleDeleteClick() {
    if (!confirmDelete) {
      // First click: enter confirm mode
      setConfirmDelete(true)
      // Auto-reset after 4 seconds so the button doesn't stay armed forever
      setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    // Second click: actually delete
    onRemoveTask(task.id)
  }

  /**
   * Save handler — calls the parent's onEditTask, closes the form on success.
   * The form catches and displays errors, so we re-throw here so it can.
   */
  async function handleSaveEdit(body) {
    try {
      await onEditTask(task.id, body)
      setEditing(false)  // close edit mode on success
    } catch (err) {
      // Re-throw so EditTaskForm can show the error message
      throw err
    }
  }

  /**
   * Save handler for adding a brand-new subtask. Calls the parent's
   * onAddSubtask, closes the form on success.
   */
  async function handleSaveNewSubtask(body) {
    try {
      await onAddSubtask(task.id, body)
      setAddingSubtask(false)
    } catch (err) {
      throw err  // re-throw so EditSubtaskForm shows the error inline
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <article className="task-card">

      {editing ? (
        // ── EDIT MODE ─────────────────────────────────────────────────
        <EditTaskForm
          task={task}
          onSave={handleSaveEdit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {/* ── Header row: title + priority + due date badge ──────── */}
          <header className="task-card-header">
            <div className="task-card-title-block">
              <h3 className="task-card-title">{task.title}</h3>
              {task.description && (
                <p className="task-card-description">{task.description}</p>
              )}
            </div>

            <div className="task-card-meta">
              <span className={`badge badge-priority badge-priority-${task.priority}`}>
                {task.priority}
              </span>
              <span className={`badge ${daysCss}`}>{daysLabel}</span>
            </div>
          </header>

          {/* ── Progress bar ────────────────────────────────────────── */}
          <div className="task-card-progress">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${task.progress_percent}%` }}
                role="progressbar"
                aria-valuenow={task.progress_percent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="progress-bar-label">
              {task.progress_percent}% · {completedCount}/{totalCount} subtasks
            </span>
          </div>

          {/* ── Expand/collapse + edit + delete row ─────────────────── */}
          <div className="task-card-actions">
            <button
              type="button"
              className="btn-link"
              onClick={() => setExpanded(prev => !prev)}
              aria-expanded={expanded}
            >
              {expanded ? '▾ Hide subtasks' : '▸ Show subtasks'}
              {totalCount > 0 && ` (${totalCount})`}
            </button>

            <div className="task-card-action-group">
              <button
                type="button"
                className="btn-link"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className={confirmDelete ? 'btn-link-danger-active' : 'btn-link-danger'}
                onClick={handleDeleteClick}
              >
                {confirmDelete ? 'Confirm delete?' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Subtasks (visible only when expanded) ──────────────────── */}
      {expanded && (
        <div className="task-card-subtasks">
          {totalCount === 0 ? (
            <p className="muted">No subtasks for this task.</p>
          ) : (
            task.subtasks.map(subtask => (
              <SubtaskRow
                key={subtask.id}
                subtask={subtask}
                parentTask={task}
                onToggle={onToggleSubtask}
                onRemove={onRemoveSubtask}
                onEdit={onEditSubtask}
              />
            ))
          )}

          {/* ── Add-subtask affordance ─────────────────────────────────── */}
          {addingSubtask ? (
            <div className="subtask-row-display subtask-row-editing">
              <EditSubtaskForm
                mode="add"
                parentTask={task}
                onSave={handleSaveNewSubtask}
                onCancel={() => setAddingSubtask(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              className="add-subtask-button"
              onClick={() => setAddingSubtask(true)}
            >
              + Add subtask
            </button>
          )}
        </div>
      )}
    </article>
  )
}