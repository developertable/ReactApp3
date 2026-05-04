// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root component — Stage 11 development view.
// Uses TaskList to render Active and Overdue columns.
// Stage 12 will clean this up further (extracting a header, etc.).
// ─────────────────────────────────────────────────────────────────────────────

import { useTasks } from './hooks/useTasks.js'
import AddTaskForm from './components/AddTaskForm.jsx'
import TaskList from './components/TaskList.jsx'

export default function App() {
  const {
    tasks,
    loading,
    error,
    addTask,
    toggleSubtask,
    removeTask,
    removeSubtask,
  } = useTasks()

  return (
    <div className="app-container">
      <h1 className="app-title">Task Logger</h1>

      <AddTaskForm onAdd={addTask} />

      <section className="task-list-section">
        {loading && <p className="muted">Loading…</p>}
        {error   && <p className="form-error">Error: {error}</p>}

        {!loading && !error && tasks.length === 0 && (
          <p className="muted">No tasks yet. Create your first one above!</p>
        )}

        {!loading && !error && tasks.length > 0 && (
          <TaskList
            tasks={tasks}
            onToggleSubtask={toggleSubtask}
            onRemoveSubtask={removeSubtask}
            onRemoveTask={removeTask}
          />
        )}
      </section>
    </div>
  )
}