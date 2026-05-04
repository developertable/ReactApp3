// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root component — Stage 9 development view.
// Includes the AddTaskForm and the debug task list. Stage 12 will replace
// this with the proper layout.
// ─────────────────────────────────────────────────────────────────────────────

import { useTasks } from './hooks/useTasks.js'
import AddTaskForm from './components/AddTaskForm.jsx'

export default function App() {
  const { tasks, loading, error, addTask } = useTasks()

  return (
    <div style={{ padding: '1rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', margin: '1rem 0' }}>Task Logger</h1>

      {/* The form */}
      <AddTaskForm onAdd={addTask} />

      {/* The list (debug view) */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ paddingLeft: '1rem' }}>Existing tasks</h2>

        {loading && <p style={{ paddingLeft: '1rem', color: '#888' }}>Loading…</p>}
        {error   && <p style={{ paddingLeft: '1rem', color: '#c00' }}>Error: {error}</p>}

        {!loading && !error && tasks.map(task => (
          <div key={task.id} style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            margin: '0.75rem 1rem',
            background: '#fff',
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
      </div>
    </div>
  )
}