// src/utils/taskSorting.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure utilities for sorting and grouping tasks.
//
// Used by TaskList to split tasks into "Active" (not yet overdue) and
// "Overdue" buckets, each sorted appropriately.
//
// Sort rules:
//   ACTIVE BUCKET (today or future, or no due date)
//     - Tasks with NO due date come first
//     - Then tasks with due dates, in ascending order (closest first)
//     - Ties broken by created_at descending (newest first)
//
//   OVERDUE BUCKET (due date is before today)
//     - Most overdue first (oldest due date at top)
//     - Ties broken by created_at descending
//
// All functions are pure — same input always produces same output, no
// side effects, easy to test.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute days-until-due for a task. Returns:
 *   - null if no due date
 *   - integer (positive = future, 0 = today, negative = overdue)
 *
 * Uses local-midnight comparison so "today" doesn't flip to "overdue" at
 * midnight UTC for users not on UTC.
 */
export function daysUntilDue(dueDate) {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [y, m, d] = dueDate.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  due.setHours(0, 0, 0, 0)

  const diffMs = due.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Predicate: is this task overdue?
 * A task is overdue if its due_date is strictly before today.
 * Tasks with no due_date are NEVER overdue.
 */
export function isOverdue(task) {
  const days = daysUntilDue(task.due_date)
  return days !== null && days < 0
}

/**
 * Sort comparator for the active bucket.
 * Tasks with no due date come first, then earliest due date first.
 * Ties broken by newer created_at first.
 */
function compareActive(a, b) {
  const aHasDate = a.due_date !== null && a.due_date !== ''
  const bHasDate = b.due_date !== null && b.due_date !== ''

  // No-date tasks come before dated tasks
  if (!aHasDate && bHasDate)  return -1
  if (aHasDate  && !bHasDate) return  1

  // Both have no date → newer first
  if (!aHasDate && !bHasDate) {
    return b.created_at.localeCompare(a.created_at)
  }

  // Both have dates → earlier date first
  if (a.due_date !== b.due_date) {
    return a.due_date.localeCompare(b.due_date)
  }

  // Same date → newer first
  return b.created_at.localeCompare(a.created_at)
}

/**
 * Sort comparator for the overdue bucket.
 * Most overdue (oldest due_date) first.
 * Ties broken by newer created_at first.
 */
function compareOverdue(a, b) {
  // Earlier due_date = more overdue = comes first
  if (a.due_date !== b.due_date) {
    return a.due_date.localeCompare(b.due_date)
  }
  return b.created_at.localeCompare(a.created_at)
}

/**
 * Split tasks into active and overdue buckets, each sorted per its rules.
 *
 * @param {Array} tasks - array of task objects
 * @returns {{ active: Array, overdue: Array }}
 */
export function groupTasks(tasks) {
  const overdue = []
  const active  = []

  for (const task of tasks) {
    if (isOverdue(task)) {
      overdue.push(task)
    } else {
      active.push(task)
    }
  }

  active.sort(compareActive)
  overdue.sort(compareOverdue)

  return { active, overdue }
}