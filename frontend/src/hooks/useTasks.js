// src/hooks/useTasks.js
// ─────────────────────────────────────────────────────────────────────────────
// useTasks — custom React hook that manages all task-related state and
// operations for the Task Logger app.
//
// Components consume this hook to get:
//   - tasks       : the array of tasks (with subtasks nested + progress)
//   - loading     : true while the initial fetch is in flight
//   - error       : null normally, or an Error message string if anything failed
//   - addTask     : create a new main task (with optional subtasks)
//   - addSubtask  : add a subtask to an existing task
//   - toggleSubtask: flip a subtask's completed flag
//   - removeTask  : delete a main task (cascades subtasks on the backend)
//   - removeSubtask: delete a single subtask
//   - reload      : manually re-fetch tasks from the server
//
// All mutation functions update local state optimistically when possible,
// and roll back if the server call fails.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import * as taskApi from '../api/tasks.js'
import * as subtaskApi from '../api/subtasks.js'

export function useTasks() {
  // ── State ───────────────────────────────────────────────────────────────
  const [tasks, setTasks]     = useState([])    // array of task objects
  const [loading, setLoading] = useState(true)  // true during initial fetch
  const [error, setError]     = useState(null)  // null or error message string

  // ── Load all tasks from the server ──────────────────────────────────────
  // Wrapped in useCallback so its identity is stable across renders. This
  // matters for the useEffect below, and lets us safely expose `reload`
  // to consumers without causing infinite re-renders.
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await taskApi.getTasks()
      setTasks(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Run the initial load when the hook mounts ──────────────────────────
  // The empty dependency array would normally be the right call here, but
  // since `reload` is stable (thanks to useCallback), depending on it is
  // both correct and what the React ESLint rules expect.
  useEffect(() => {
    reload()
  }, [reload])

  // ─────────────────────────────────────────────────────────────────────
  // MUTATIONS — functions that change data on the server AND in local state
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Create a new main task. If the body includes a `subtasks` array, each
   * subtask is created in sequence after the parent task succeeds.
   *
   * Why sequentially instead of parallel? Two reasons:
   *   1. Subtasks need the parent task's id, which we only have after the
   *      first call returns.
   *   2. Sequential means we preserve the user's intended order even if
   *      the network is slow.
   *
   * After all calls succeed we reload from the server. This is simpler and
   * more correct than trying to splice in the new task locally — the
   * server-computed progress_percent is the source of truth.
   *
   * @param {Object} body - { title, description?, priority?, due_date?,
   *                          subtasks?: [{ title, scheduled_at, allotted_minutes }] }
   * @returns {Promise<Object>} the created task (after reload)
   */
  const addTask = useCallback(async (body) => {
    const { subtasks = [], ...taskFields } = body
    try {
      // 1. Create the main task
      const createdTask = await taskApi.createTask(taskFields)

      // 2. Create each subtask under it, in order
      for (let i = 0; i < subtasks.length; i++) {
        await subtaskApi.addSubtask(createdTask.id, {
          ...subtasks[i],
          position: i,
        })
      }

      // 3. Reload everything so the UI shows the new task with subtasks
      //    and the correct progress_percent
      await reload()
      return createdTask
    } catch (err) {
      setError(err.message)
      throw err  // re-throw so the form component can show its own error
    }
  }, [reload])

  /**
   * Add a subtask to an existing task.
   *
   * @param {number} taskId - parent task id
   * @param {Object} subtaskBody - { title, scheduled_at, allotted_minutes }
   */
  const addSubtask = useCallback(async (taskId, subtaskBody) => {
    try {
      await subtaskApi.addSubtask(taskId, subtaskBody)
      await reload()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [reload])

  /**
   * Toggle a subtask's completed state.
   *
   * Uses an "optimistic update": we update local state immediately, then
   * call the API. If the API call fails, we roll back. This makes the UI
   * feel instant even on slow networks — clicking a checkbox shouldn't
   * have a visible delay.
   *
   * @param {Object} subtask - the subtask object (must have id, completed, task_id)
   */
  const toggleSubtask = useCallback(async (subtask) => {
    // Snapshot the previous state in case we need to roll back
    const previousTasks = tasks

    // Optimistically update local state
    setTasks(currentTasks =>
      currentTasks.map(task => {
        if (task.id !== subtask.task_id) return task

        const updatedSubtasks = task.subtasks.map(st =>
          st.id === subtask.id
            ? { ...st, completed: st.completed ? 0 : 1 }
            : st
        )

        // Recompute progress locally so the progress bar updates instantly
        const completedCount = updatedSubtasks.filter(st => st.completed).length
        const newProgress = updatedSubtasks.length > 0
          ? Math.round((completedCount / updatedSubtasks.length) * 100)
          : 0

        return {
          ...task,
          subtasks: updatedSubtasks,
          progress_percent: newProgress,
        }
      })
    )

    // Now make the actual API call
    try {
      await subtaskApi.toggleSubtask(subtask)
    } catch (err) {
      // Roll back on failure
      setTasks(previousTasks)
      setError(err.message)
    }
  }, [tasks])

  /**
   * Delete a main task. Subtasks cascade automatically on the backend.
   *
   * @param {number} taskId
   */
  const removeTask = useCallback(async (taskId) => {
    const previousTasks = tasks
    // Optimistic: remove from local state immediately
    setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId))

    try {
      await taskApi.deleteTask(taskId)
    } catch (err) {
      setTasks(previousTasks)
      setError(err.message)
    }
  }, [tasks])

  /**
   * Delete a single subtask. The parent task remains.
   *
   * @param {Object} subtask - the subtask object
   */
  const removeSubtask = useCallback(async (subtask) => {
    const previousTasks = tasks

    // Optimistic update with progress recalculation
    setTasks(currentTasks =>
      currentTasks.map(task => {
        if (task.id !== subtask.task_id) return task

        const updatedSubtasks = task.subtasks.filter(st => st.id !== subtask.id)
        const completedCount = updatedSubtasks.filter(st => st.completed).length
        const newProgress = updatedSubtasks.length > 0
          ? Math.round((completedCount / updatedSubtasks.length) * 100)
          : 0

        return {
          ...task,
          subtasks: updatedSubtasks,
          progress_percent: newProgress,
        }
      })
    )

    try {
      await subtaskApi.deleteSubtask(subtask.id)
    } catch (err) {
      setTasks(previousTasks)
      setError(err.message)
    }
  }, [tasks])

  /**
   * Update fields on an existing task.
   *
   * Optimistic: applies the changes to local state immediately, then sends
   * the API call. On failure, rolls back to the previous state and exposes
   * the error.
   *
   * Note: the backend may reject the update (e.g. moving due_date earlier
   * would orphan subtasks). When that happens we re-throw so the caller —
   * typically EditTaskForm — can surface the error message in its UI.
   *
   * @param {number} id   - task id
   * @param {Object} body - any subset of { title, description, priority, due_date }
   */
  const updateTaskFields = useCallback(async (id, body) => {
    const previousTasks = tasks

    // Optimistic local update — merge new fields into the matching task
    setTasks(currentTasks =>
      currentTasks.map(task =>
        task.id === id ? { ...task, ...body } : task
      )
    )

    try {
      // Server returns the canonical updated task with subtasks + progress.
      // Replace our optimistic version with the authoritative one.
      const updated = await taskApi.updateTask(id, body)
      setTasks(currentTasks =>
        currentTasks.map(task => (task.id === id ? updated : task))
      )
      return updated
    } catch (err) {
      // Roll back, propagate, set error
      setTasks(previousTasks)
      setError(err.message)
      throw err
    }
  }, [tasks])

  /**
   * Update fields on an existing subtask.
   *
   * Optimistic: applies changes to local state, recomputes progress on the
   * parent task, then sends the API call. Rolls back on failure.
   *
   * @param {Object} subtask - the existing subtask (must have id, task_id)
   * @param {Object} body    - any subset of { title, scheduled_at,
   *                                          allotted_minutes, completed }
   */
  const updateSubtaskFields = useCallback(async (subtask, body) => {
    const previousTasks = tasks

    // Optimistic update with progress recalculation on the parent
    setTasks(currentTasks =>
      currentTasks.map(task => {
        if (task.id !== subtask.task_id) return task

        const updatedSubtasks = task.subtasks.map(st =>
          st.id === subtask.id ? { ...st, ...body } : st
        )

        const completedCount = updatedSubtasks.filter(st => st.completed).length
        const newProgress = updatedSubtasks.length > 0
          ? Math.round((completedCount / updatedSubtasks.length) * 100)
          : 0

        return {
          ...task,
          subtasks: updatedSubtasks,
          progress_percent: newProgress,
        }
      })
    )

    try {
      const updated = await subtaskApi.updateSubtask(subtask.id, body)
      // Splice the canonical server response into local state
      setTasks(currentTasks =>
        currentTasks.map(task => {
          if (task.id !== subtask.task_id) return task
          return {
            ...task,
            subtasks: task.subtasks.map(st =>
              st.id === subtask.id ? updated : st
            ),
          }
        })
      )
      return updated
    } catch (err) {
      setTasks(previousTasks)
      setError(err.message)
      throw err
    }
  }, [tasks])

  // ── What the hook returns ───────────────────────────────────────────────
  return {
    tasks,
    loading,
    error,
    addTask,
    addSubtask,
    toggleSubtask,
    removeTask,
    removeSubtask,
    updateTask: updateTaskFields,
    updateSubtask: updateSubtaskFields,
    reload,
  }
}