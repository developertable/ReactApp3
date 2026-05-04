// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root component — temporary debug view for Stage 8.
// In Stage 12 we'll replace this with the real UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useTasks } from './hooks/useTasks.js'

export default function App() {
  const { tasks, loading, error } = useTasks()

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 800 }}>
      <h1>Task Logger — debug view</h1>

      {/* Status indicators */}
      {loading && <p style={{ color: '#888' }}>Loading tasks…</p>}
      {error   && <p style={{ color: '#c00' }}>Error: {error}</p>}

      {/* Once loaded, render a simple summary of each task */}
      {!loading && !error && (
        <>
          <p>{tasks.length} task(s) loaded.</p>
          {tasks.map(task => (
            <div key={task.id} style={{
              border: '1px solid #ddd',
              borderRadius: 6,
              padding: '0.75rem 1rem',
              marginBottom: '0.75rem',
            }}>
              <strong>{task.title}</strong>
              <span style={{ color: '#666', marginLeft: 8 }}>
                ({task.priority}, due {task.due_date || 'no date'})
              </span>
              <div style={{ fontSize: '0.9em', color: '#444', marginTop: 4 }}>
                {task.subtasks.length} subtask(s) — {task.progress_percent}% complete
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}