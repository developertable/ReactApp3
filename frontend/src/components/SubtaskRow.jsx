// src/components/SubtaskRow.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SubtaskRow — renders a single subtask with an interactive checkbox and a
// delete button. Used inside TaskCard's expanded section.
//
// Props:
//   - subtask  : the subtask object (must have id, title, scheduled_at,
//                allotted_minutes, completed)
//   - onToggle : (subtask) => void — called when the checkbox is clicked
//   - onRemove : (subtask) => void — called when delete is clicked
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers (pure, no React) ────────────────────────────────────────────────

/**
 * Format a MySQL datetime ("YYYY-MM-DD HH:MM:SS") into a friendly local
 * string like "May 5, 9:00 AM".
 *
 * Uses Intl.DateTimeFormat which respects the user's locale (e.g. uses
 * 24-hour time in regions where that's the default).
 */
function formatScheduledAt(mysqlDatetime) {
  if (!mysqlDatetime) return ''

  // Replace space with T so JS Date parses it reliably across browsers.
  const date = new Date(mysqlDatetime.replace(' ', 'T'))

  if (isNaN(date.getTime())) return mysqlDatetime  // fallback for bad data

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * Format a duration in minutes into "30m", "1h", "1h 30m", "2h", etc.
 * Keeps things compact since this displays inline next to other info.
 */
function formatDuration(minutes) {
  const m = Number(minutes) || 0
  if (m < 60) return `${m}m`
  const hours = Math.floor(m / 60)
  const mins  = m % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

// ── Component ───────────────────────────────────────────────────────────────

export default function SubtaskRow({ subtask, onToggle, onRemove }) {
  // The completed flag comes back from MySQL as 0 or 1; convert to a boolean
  // so the checkbox's `checked` prop behaves correctly.
  const isComplete = Boolean(subtask.completed)

  return (
    <div className={`subtask-row-display ${isComplete ? 'is-complete' : ''}`}>
      {/* ── Checkbox + title (clickable area) ─────────────────────── */}
      <label className="subtask-check-label">
        <input
          type="checkbox"
          checked={isComplete}
          onChange={() => onToggle(subtask)}
          className="subtask-checkbox"
          aria-label={`Mark "${subtask.title}" as ${isComplete ? 'incomplete' : 'complete'}`}
        />
        <span className="subtask-title">{subtask.title}</span>
      </label>

      {/* ── Schedule + duration info ─────────────────────────────── */}
      <span className="subtask-meta">
        <span className="subtask-meta-item">
          {formatScheduledAt(subtask.scheduled_at)}
        </span>
        <span className="subtask-meta-divider">·</span>
        <span className="subtask-meta-item">
          {formatDuration(subtask.allotted_minutes)}
        </span>
      </span>

      {/* ── Delete button ────────────────────────────────────────── */}
      <button
        type="button"
        className="subtask-delete"
        onClick={() => onRemove(subtask)}
        aria-label={`Delete subtask "${subtask.title}"`}
      >
        ×
      </button>
    </div>
  )
}