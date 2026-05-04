// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root component — Stage 10 development view.
// Renders the AddTaskForm and a list of TaskCards. Stage 11 will introduce
// the proper Active/Overdue column layout and replace the bare list.
// ─────────────────────────────────────────────────────────────────────────────

import { useTasks } from './hooks/useTasks.js'
import AddTaskForm from './components/AddTaskForm.jsx'
import TaskCard from './components/TaskCard.jsx'

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
        <h2 className="section-title">Existing tasks</h2>

        {loading && <p className="muted">Loading…</p>}
        {error   && <p className="form-error">Error: {error}</p>}

        {!loading && !error && tasks.length === 0 && (
          <p className="muted">No tasks yet. Create your first one above!</p>
        )}

        {!loading && !error && tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleSubtask={toggleSubtask}
            onRemoveSubtask={removeSubtask}
            onRemoveTask={removeTask}
          />
        ))}
      </section>
    </div>
  )
}