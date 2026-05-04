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

// ── Helpers (pure functions, no React) ──────────────────────────────────────

/**
 * Compute how many days are left until a due date (relative to today).
 * Returns:
 *   - null if there's no due date
 *   - 0 if the due date is today
 *   - positive integer for future dates ("3 days left")
 *   - negative integer for past dates ("-2" means 2 days overdue)
 *
 * Uses just the date portion (no time of day) to avoid edge cases where
 * "due today" flips to "overdue" at midnight.
 */
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
}) {
  // Whether the subtasks section is expanded. Default open if the task has
  // any subtasks — the user is most likely to want to see them.
  const [expanded, setExpanded] = useState(task.subtasks.length > 0)

  // Confirm-before-deleting state. First click sets this true and changes
  // the button label to "Confirm delete?". Second click actually deletes.
  // Resets after a few seconds if the user doesn't follow through.
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <article className="task-card">
      {/* ── Header row: title + priority + due date badge + delete ──── */}
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

      {/* ── Progress bar ────────────────────────────────────────────── */}
      <div className="task-card-progress">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${task.progress_percent}%` }}
            // ARIA attributes for screen readers
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

      {/* ── Expand / collapse + delete row ─────────────────────────── */}
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

        <button
          type="button"
          className={confirmDelete ? 'btn-link-danger-active' : 'btn-link-danger'}
          onClick={handleDeleteClick}
        >
          {confirmDelete ? 'Confirm delete?' : 'Delete'}
        </button>
      </div>

      {/* ── Subtasks (visible only when expanded) ──────────────────── */}
      {expanded && (
        <div className="task-card-subtasks">
          {totalCount === 0 ? (
            <p className="muted">No subtasks for this task.</p>
          ) : (
            // Stage 11 will replace these placeholders with <SubtaskRow />
            task.subtasks.map(subtask => (
              <div key={subtask.id} className="subtask-placeholder">
                <span>
                  {subtask.completed ? '✓' : '○'} {subtask.title}
                </span>
                <span className="muted" style={{ fontSize: '0.85em' }}>
                  {subtask.scheduled_at} · {subtask.allotted_minutes} min
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </article>
  )
}