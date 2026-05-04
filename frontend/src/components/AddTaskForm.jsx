// src/components/AddTaskForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// AddTaskForm — controlled form for creating a main task with optional
// subtasks. Demonstrates the controlled-component pattern from Ch.7–9.
//
// Features:
//   - Required main task title, optional description / priority / due date
//   - Dynamic list of subtask rows (add and remove on the fly)
//   - Each subtask has title, scheduled date+time, and allotted minutes
//   - Inline validation before submit
//   - Form resets on successful submit
//   - Submit button is disabled while the network call is in flight
//
// Receives one prop:
//   - onAdd(taskBody): async function from the useTasks hook that does the
//                      actual API call. We don't know or care about HTTP here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a "blank subtask row" with sensible defaults.
 * Each subtask row gets a unique `key` (a millisecond timestamp + random
 * tail) so React can track it across re-renders. This key never goes to
 * the server — it's purely for React's reconciler.
 */
function makeBlankSubtask() {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    scheduled_at: '',
    allotted_minutes: 30,
  }
}

/**
 * Convert a YYYY-MM-DD date into the "max" value for a datetime-local input.
 * The result represents the very end of that day (23:59) so users can still
 * schedule subtasks late on the due date itself.
 *
 * Returns empty string if no due date is set, which means "no max" (input
 * accepts any future date).
 */
function dueDateToMaxDatetime(dueDate) {
  if (!dueDate) return ''
  // datetime-local format: "YYYY-MM-DDTHH:MM"
  return `${dueDate}T23:59`
}

/**
 * Normalize a datetime-local input value (e.g. "2026-05-05T09:00")
 * into the format MySQL expects ("2026-05-05 09:00:00").
 */
function toMysqlDatetime(value) {
  if (!value) return ''
  // datetime-local gives "YYYY-MM-DDTHH:MM" — replace T with space, add :00
  return value.replace('T', ' ') + ':00'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AddTaskForm({ onAdd }) {
  // ── Main task fields ───────────────────────────────────────────────────
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority]       = useState('medium')
  const [dueDate, setDueDate]         = useState('')

  // ── Subtask rows (an array, can be empty) ──────────────────────────────
  const [subtasks, setSubtasks] = useState([])

  // ── UI state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)  // disable submit button while saving
  const [formError, setFormError]   = useState('')     // shown above the submit button

  // ─────────────────────────────────────────────────────────────────────
  // Subtask row management
  // ─────────────────────────────────────────────────────────────────────

  /** Append a new blank subtask row. */
  function handleAddSubtaskRow() {
    setSubtasks(prev => [...prev, makeBlankSubtask()])
  }

  /** Remove a subtask row by its key. */
  function handleRemoveSubtaskRow(key) {
    setSubtasks(prev => prev.filter(st => st.key !== key))
  }

  /** Update one field of one subtask row. */
  function handleSubtaskChange(key, field, value) {
    setSubtasks(prev =>
      prev.map(st => (st.key === key ? { ...st, [field]: value } : st))
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // Form reset
  // ─────────────────────────────────────────────────────────────────────
  function resetForm() {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setSubtasks([])
    setFormError('')
  }

  // ─────────────────────────────────────────────────────────────────────
  // Submit handler
  // ─────────────────────────────────────────────────────────────────────
  async function handleSubmit(event) {
    // Prevent the browser's default form behavior (page reload). Always
    // the first line of any React form submit handler.
    event.preventDefault()
    setFormError('')

    // ── Validation ────────────────────────────────────────────────────
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setFormError('Task title is required')
      return
    }

    // Validate each subtask row that exists
    for (let i = 0; i < subtasks.length; i++) {
      const st = subtasks[i]
      if (!st.title.trim()) {
        setFormError(`Subtask ${i + 1}: title is required`)
        return
      }
      if (!st.scheduled_at) {
        setFormError(`Subtask ${i + 1}: scheduled date/time is required`)
        return
      }
      if (!st.allotted_minutes || st.allotted_minutes <= 0) {
        setFormError(`Subtask ${i + 1}: allotted minutes must be greater than 0`)
        return
      }
      // Subtask cannot be scheduled later than the main task's due date.
      // (Only enforced if the user set a due date.)
      if (dueDate && st.scheduled_at > `${dueDate}T23:59`) {
        setFormError(
          `Subtask ${i + 1}: scheduled date is after the main task's due date (${dueDate})`
        )
        return
      }
    }

    // ── Build the request body ────────────────────────────────────────
    const body = {
      title: trimmedTitle,
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      subtasks: subtasks.map(st => ({
        title: st.title.trim(),
        scheduled_at: toMysqlDatetime(st.scheduled_at),
        allotted_minutes: Number(st.allotted_minutes),
      })),
    }

    // ── Submit ────────────────────────────────────────────────────────
    setSubmitting(true)
    try {
      await onAdd(body)
      resetForm()
    } catch (err) {
      // The hook's addTask re-throws on failure so we can surface it here
      setFormError(err.message || 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="add-task-form">
      <h2>Add a new task</h2>

      {/* Main task title — required */}
      <label className="form-row">
        <span>Title <em>*</em></span>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What do you want to accomplish?"
          maxLength={255}
          required
        />
      </label>

      {/* Description — optional */}
      <label className="form-row">
        <span>Description</span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional notes"
          rows={2}
        />
      </label>

      {/* Priority and due date side by side on desktop, stacked on mobile */}
      <div className="form-row-group">
        <label className="form-row">
          <span>Priority</span>
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="form-row">
          <span>Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </label>
      </div>

      {/* ── Subtasks section ──────────────────────────────────────────── */}
      <div className="subtasks-section">
        <div className="subtasks-header">
          <h3>Subtasks</h3>
          <button
            type="button"
            onClick={handleAddSubtaskRow}
            className="btn btn-secondary"
          >
            + Add subtask
          </button>
        </div>

        {/* Empty state */}
        {subtasks.length === 0 && (
          <p className="muted">
            No subtasks yet. You can submit without any, or add some above.
          </p>
        )}

        {/* List of subtask rows */}
        {subtasks.map((st, index) => (
          <div key={st.key} className="subtask-row">
            <div className="subtask-row-header">
              <strong>Subtask {index + 1}</strong>
              <button
                type="button"
                onClick={() => handleRemoveSubtaskRow(st.key)}
                className="btn-link-danger"
                aria-label={`Remove subtask ${index + 1}`}
              >
                Remove
              </button>
            </div>

            <label className="form-row">
              <span>What needs to be done?</span>
              <input
                type="text"
                value={st.title}
                onChange={e => handleSubtaskChange(st.key, 'title', e.target.value)}
                placeholder="e.g. Read chapter 3"
                maxLength={255}
              />
            </label>

            <div className="form-row-group">
              <label className="form-row">
                <span>When</span>
                <input
                  type="datetime-local"
                  value={st.scheduled_at}
                  onChange={e => handleSubtaskChange(st.key, 'scheduled_at', e.target.value)}
                  max={dueDateToMaxDatetime(dueDate)}
                />
              </label>

              <label className="form-row">
                <span>Minutes</span>
                <input
                  type="number"
                  value={st.allotted_minutes}
                  onChange={e => handleSubtaskChange(st.key, 'allotted_minutes', e.target.value)}
                  min={1}
                  step={1}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Form-level error message */}
      {formError && <p className="form-error">{formError}</p>}

      {/* Submit */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Create task'}
        </button>
      </div>
    </form>
  )
}