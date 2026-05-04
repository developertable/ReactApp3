// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root component for the Task Logger app.
//
// Composition:
//   - useTheme  : manages light/dark preference
//   - useTasks  : owns all task data + mutation functions
//   - Header    : title + theme toggle
//   - AddTaskForm : create new tasks (with subtasks)
//   - TaskList  : Active and Overdue columns of TaskCards
//
// App.jsx is intentionally thin — it just wires hooks to components. All
// data logic lives in hooks; all UI lives in components.
// ─────────────────────────────────────────────────────────────────────────────

import { useTasks } from './hooks/useTasks.js'
import { useTheme } from './hooks/useTheme.js'
import Header from './components/Header.jsx'
import AddTaskForm from './components/AddTaskForm.jsx'
import TaskList from './components/TaskList.jsx'

export default function App() {
  const { theme, toggleTheme } = useTheme()

  const {
    tasks,
    loading,
    error,
    addTask,
    addSubtask,
    toggleSubtask,
    removeTask,
    removeSubtask,
    updateTask,
    updateSubtask,
  } = useTasks()

  return (
    <div className="app-container">
      <Header theme={theme} onToggleTheme={toggleTheme} />

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
            onEditTask={updateTask}
            onEditSubtask={updateSubtask}
            onAddSubtask={addSubtask}
          />
        )}
      </section>
    </div>
  )
}