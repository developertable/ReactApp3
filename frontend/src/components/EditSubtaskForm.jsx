// src/components/EditSubtaskForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// EditSubtaskForm — inline form for editing an existing subtask.
//
// Pre-fills with the subtask's current values. On Save, calls onSave(body)
// which the parent (SubtaskRow) wires to the hook's updateSubtask. Closes
// the form via onCancel on success.
//
// The parent's due_date is used to constrain the date picker — a subtask
// can never be scheduled later than its parent task's due date.
//
// Props:
//   - subtask    : the subtask being edited (used to pre-fill)
//   - parentTask : the parent task (used for the date max constraint)
//   - onSave     : async (body) => updatedSubtask — called on Save click
//   - onCancel   : () => void — called on Cancel click
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert a MySQL datetime ("YYYY-MM-DD HH:MM:SS") into the format that
 * <input type="datetime-local"> expects ("YYYY-MM-DDTHH:MM").
 *
 * The seconds are dropped because the input doesn't accept them.
 */
function mysqlToInputValue(mysqlDatetime) {
  if (!mysqlDatetime) return ''
  // "2026-05-05 09:00:00" → "2026-05-05T09:00"
  return mysqlDatetime.slice(0, 16).replace(' ', 'T')
}

/**
 * Convert an <input type="datetime-local"> value back to MySQL format.
 * "2026-05-05T09:00" → "2026-05-05 09:00:00"
 */
function inputValueToMysql(inputValue) {
  if (!inputValue) return ''
  return inputValue.replace('T', ' ') + ':00'
}

/**
 * Build the `max` attribute for the datetime-local input from the parent
 * task's due_date (a YYYY-MM-DD string). Subtasks can be scheduled up to
 * the end of the due-date day (23:59).
 */
function dueDateToMaxDatetime(dueDate) {
  if (!dueDate) return ''
  return `${dueDate}T23:59`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EditSubtaskForm({ subtask = {}, parentTask, onSave, onCancel, mode = 'edit' }) {
  const [title, setTitle]                     = useState(subtask.title ?? '')
  const [scheduledAt, setScheduledAt]         = useState(mysqlToInputValue(subtask.scheduled_at))
  const [allottedMinutes, setAllottedMinutes] = useState(subtask.allotted_minutes ?? 30)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    // Validation
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setFormError('Title is required')
      return
    }
    if (!scheduledAt) {
      setFormError('Scheduled date/time is required')
      return
    }
    const minutes = Number(allottedMinutes)
    if (!minutes || minutes <= 0) {
      setFormError('Allotted minutes must be greater than 0')
      return
    }
    // Frontend mirror of the backend check: scheduled_at <= parent due_date
    if (parentTask.due_date && scheduledAt > `${parentTask.due_date}T23:59`) {
      setFormError(
        `Scheduled date is after the parent task's due date (${parentTask.due_date})`
      )
      return
    }

    const body = {
      title: trimmedTitle,
      scheduled_at: inputValueToMysql(scheduledAt),
      allotted_minutes: minutes,
    }

    setSubmitting(true)
    try {
      await onSave(body)
      // success — parent will close the form
    } catch (err) {
      setFormError(err.message || 'Failed to save subtask')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="edit-subtask-form">
      {/* Title */}
      <label className="form-row">
        <span>What needs to be done?</span>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={255}
          autoFocus
          required
        />
      </label>

      {/* When + duration side by side */}
      <div className="form-row-group">
        <label className="form-row">
          <span>When</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            max={dueDateToMaxDatetime(parentTask.due_date)}
          />
        </label>

        <label className="form-row">
          <span>Minutes</span>
          <input
            type="number"
            value={allottedMinutes}
            onChange={e => setAllottedMinutes(e.target.value)}
            min={1}
            step={1}
          />
        </label>
      </div>

      {/* Error */}
      {formError && <p className="form-error">{formError}</p>}

      {/* Actions */}
      <div className="edit-form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : (mode === 'add' ? 'Add subtask' : 'Save')}
        </button>
      </div>
    </form>
  )
}