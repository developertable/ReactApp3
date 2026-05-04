// src/components/TaskList.jsx
// ─────────────────────────────────────────────────────────────────────────────
// TaskList — renders all tasks split into two columns:
//   - Active   : tasks not yet overdue (or with no due date)
//   - Overdue  : tasks past their due date
//
// On wide screens the two columns sit side by side. On narrow screens they
// stack vertically (overdue first, since it's more attention-worthy).
//
// Props:
//   - tasks            : the full array of tasks from useTasks
//   - onToggleSubtask  : passed straight through to each TaskCard
//   - onRemoveSubtask  : passed straight through to each TaskCard
//   - onRemoveTask     : passed straight through to each TaskCard
// ─────────────────────────────────────────────────────────────────────────────

import TaskCard from './TaskCard.jsx'
import { groupTasks } from '../utils/taskSorting.js'

export default function TaskList({
  tasks,
  onToggleSubtask,
  onRemoveSubtask,
  onRemoveTask,
}) {
  // Split into the two buckets. groupTasks is pure, so this runs every
  // render but it's cheap (just one pass through tasks plus two sorts).
  const { active, overdue } = groupTasks(tasks)

  return (
    <div className="task-list-columns">
      {/* ── ACTIVE COLUMN ─────────────────────────────────────────── */}
      <section className="task-column">
        <header className="column-header">
          <h2 className="column-title">Active</h2>
          <span className="column-count">{active.length}</span>
        </header>

        {active.length === 0 ? (
          <p className="muted">No active tasks. Nice — nothing on the plate.</p>
        ) : (
          active.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleSubtask={onToggleSubtask}
              onRemoveSubtask={onRemoveSubtask}
              onRemoveTask={onRemoveTask}
            />
          ))
        )}
      </section>

      {/* ── OVERDUE COLUMN ────────────────────────────────────────── */}
      <section className="task-column task-column-overdue">
        <header className="column-header">
          <h2 className="column-title">Overdue</h2>
          <span className="column-count column-count-overdue">{overdue.length}</span>
        </header>

        {overdue.length === 0 ? (
          <p className="muted">No overdue tasks.</p>
        ) : (
          overdue.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleSubtask={onToggleSubtask}
              onRemoveSubtask={onRemoveSubtask}
              onRemoveTask={onRemoveTask}
            />
          ))
        )}
      </section>
    </div>
  )
}