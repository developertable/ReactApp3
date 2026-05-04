// src/components/EditTaskForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// EditTaskForm — inline form for editing an existing main task's fields.
//
// Pre-fills with the task's current values. On Save, calls onSave(body) and
// closes via onCancel on success. The parent component (TaskCard) controls
// whether this form is shown vs. the read-only display.
//
// Backend may reject the update (e.g. due date too early for existing
// subtasks). When that happens, the error is caught and shown inline so
// the user knows exactly what to fix.
//
// Props:
//   - task     : the task being edited (used to pre-fill the form)
//   - onSave   : async (body) => updatedTask — called on Save click
//   - onCancel : () => void — called on Cancel click
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

export default function EditTaskForm({ task, onSave, onCancel }) {
  // ── Form fields, pre-filled from the task ──────────────────────────────
  // The `?? ''` fallbacks ensure inputs are always controlled (never undefined).
  const [title, setTitle]             = useState(task.title ?? '')
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority]       = useState(task.priority ?? 'medium')
  const [dueDate, setDueDate]         = useState(task.due_date ?? '')

  // ── UI state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  // ─────────────────────────────────────────────────────────────────────
  // Submit handler
  // ─────────────────────────────────────────────────────────────────────
  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setFormError('Task title is required')
      return
    }

    // Build the request body. We send all four fields every time — even
    // unchanged ones — so the backend gets a full snapshot. Simpler than
    // tracking which ones changed.
    const body = {
      title: trimmedTitle,
      description: description.trim(),
      priority,
      due_date: dueDate || null,  // empty string → null, clearing the field
    }

    setSubmitting(true)
    try {
      await onSave(body)
      // onSave succeeded → parent will switch back to display view.
      // (We don't call onCancel here because that's a "give up" semantic;
      // the parent decides what to do after a successful save.)
    } catch (err) {
      // Most likely a 422 from the cascade validation. Show the message.
      setFormError(err.message || 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="edit-task-form">
      <h3 className="edit-form-heading">Edit task</h3>

      {/* Title */}
      <label className="form-row">
        <span>Title <em>*</em></span>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={255}
          autoFocus
          required
        />
      </label>

      {/* Description */}
      <label className="form-row">
        <span>Description</span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
      </label>

      {/* Priority + due date side by side */}
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

      {/* Error message — typically the cascade error from the backend */}
      {formError && <p className="form-error">{formError}</p>}

      {/* Action buttons */}
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
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}