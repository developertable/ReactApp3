<?php
// ════════════════════════════════════════════════════════════════════════════
// tasks.php
// ----------------------------------------------------------------------------
// TaskHandler class — all database logic for main tasks.
//
// Responsibilities:
//   - getAll()    : fetch all tasks with their subtasks nested + progress %
//   - getOne($id) : fetch a single task with its subtasks
//   - create()    : insert a new task (subtasks added separately)
//   - update()    : update an existing task's fields
//   - delete()    : delete a task (subtasks cascade automatically)
// ════════════════════════════════════════════════════════════════════════════

class TaskHandler
{
    /**
     * Constructor uses PHP 8 constructor property promotion to declare
     * and assign $pdo in one line. $pdo holds the database connection
     * that gets passed in from index.php.
     */
    public function __construct(private PDO $pdo) {}

    // ─────────────────────────────────────────────────────────────────────
    // GET /tasks
    // Returns an array of all tasks, each with its subtasks nested inside,
    // plus a computed `progress_percent` field.
    //
    // Strategy: rather than running 1 + N queries (one for tasks, one per
    // task for subtasks — known as the "N+1 problem"), we run just TWO
    // queries: one for all tasks, one for ALL subtasks across all tasks,
    // then group them in PHP. Far more efficient.
    // ─────────────────────────────────────────────────────────────────────
    public function getAll(): array
    {
        // Query 1: all tasks, newest first
        $tasks = $this->pdo
            ->query('SELECT * FROM tasks ORDER BY created_at DESC')
            ->fetchAll();

        if (empty($tasks)) {
            return [];
        }

        // Query 2: all subtasks across all tasks, ordered by parent then position
        $subtasks = $this->pdo
            ->query('SELECT * FROM subtasks ORDER BY task_id, position ASC')
            ->fetchAll();

        // Group subtasks by their task_id so we can attach them efficiently.
        // Result: $subtasksByTask[task_id] = [subtask, subtask, ...]
        $subtasksByTask = [];
        foreach ($subtasks as $st) {
            $subtasksByTask[$st['task_id']][] = $st;
        }

        // Attach subtasks to each task and compute progress
        foreach ($tasks as &$task) {
            $taskSubtasks = $subtasksByTask[$task['id']] ?? [];
            $task['subtasks'] = $taskSubtasks;
            $task['progress_percent'] = $this->calculateProgress($taskSubtasks);
        }
        unset($task); // break the reference, good practice after foreach by ref

        return $tasks;
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /tasks/{id}
    // Same as getAll but for one specific task.
    // ─────────────────────────────────────────────────────────────────────
    public function getOne(int $id): array
    {
        $task = $this->findOrFail($id);
        if (isset($task['error'])) return $task;

        // Fetch subtasks for this one task
        $stmt = $this->pdo->prepare(
            'SELECT * FROM subtasks WHERE task_id = :task_id ORDER BY position ASC'
        );
        $stmt->execute(['task_id' => $id]);
        $subtasks = $stmt->fetchAll();

        $task['subtasks'] = $subtasks;
        $task['progress_percent'] = $this->calculateProgress($subtasks);

        return $task;
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /tasks
    // Creates a new main task. Subtasks are added via separate API calls
    // after the parent task is created (the frontend will chain these).
    // ─────────────────────────────────────────────────────────────────────
    public function create(array $body): array
    {
        // Pull and trim each field from the request body, with sensible defaults
        $title       = trim($body['title'] ?? '');
        $description = trim($body['description'] ?? '');

        // Whitelist priority — only allow these three values, default to medium
        $priority = in_array($body['priority'] ?? '', ['low', 'medium', 'high'], true)
            ? $body['priority']
            : 'medium';

        // due_date is optional; null if not provided or empty string
        $dueDate = !empty($body['due_date']) ? $body['due_date'] : null;

        // Validation: title is required
        if ($title === '') {
            http_response_code(422);
            return ['error' => 'Title is required'];
        }

        // Insert using a prepared statement (prevents SQL injection)
        $stmt = $this->pdo->prepare(
            'INSERT INTO tasks (title, description, priority, due_date)
             VALUES (:title, :description, :priority, :due_date)'
        );
        $stmt->execute([
            'title'       => $title,
            'description' => $description,
            'priority'    => $priority,
            'due_date'    => $dueDate,
        ]);

        // Return the freshly created row (with its new auto-generated id)
        $newId = (int) $this->pdo->lastInsertId();
        return $this->getOne($newId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PUT /tasks/{id}
    // Updates one or more fields on an existing task.
    // Any field not in the request body is left unchanged.
    // ─────────────────────────────────────────────────────────────────────
    public function update(int $id, array $body): array
    {
        // First, make sure the task exists. findOrFail returns an error array
        // if not, which we pass straight through to the caller.
        $existing = $this->findOrFail($id);
        if (isset($existing['error'])) return $existing;

        // For each field, use the new value if provided, otherwise keep existing
        $title       = isset($body['title'])       ? trim($body['title'])       : $existing['title'];
        $description = isset($body['description']) ? trim($body['description']) : $existing['description'];
        $priority = in_array($body['priority'] ?? '', ['low', 'medium', 'high'], true)
            ? $body['priority']
            : $existing['priority'];
        $dueDate = array_key_exists('due_date', $body)
            ? (!empty($body['due_date']) ? $body['due_date'] : null)
            : $existing['due_date'];

        $stmt = $this->pdo->prepare(
            'UPDATE tasks
             SET title = :title, description = :description,
                 priority = :priority, due_date = :due_date
             WHERE id = :id'
        );
        $stmt->execute([
            'title'       => $title,
            'description' => $description,
            'priority'    => $priority,
            'due_date'    => $dueDate,
            'id'          => $id,
        ]);

        return $this->getOne($id);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE /tasks/{id}
    // Deletes a task. Subtasks are removed automatically via the
    // ON DELETE CASCADE foreign key — we don't need to delete them manually.
    // ─────────────────────────────────────────────────────────────────────
    public function delete(int $id): array
    {
        $existing = $this->findOrFail($id);
        if (isset($existing['error'])) return $existing;

        $this->pdo->prepare('DELETE FROM tasks WHERE id = :id')
                  ->execute(['id' => $id]);

        return ['success' => true, 'id' => $id];
    }

    // ═════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═════════════════════════════════════════════════════════════════════

    /**
     * Look up a task by id. Returns the task row on success, or an error
     * array with a 404 status code if not found. Caller is expected to
     * check for `isset($result['error'])`.
     */
    private function findOrFail(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM tasks WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            return ['error' => "Task $id not found"];
        }
        return $row;
    }

    /**
     * Compute progress percentage from a list of subtasks.
     *   - 0 subtasks  → 0% (nothing to do means no progress to make)
     *   - N subtasks  → (completed / total) * 100, rounded to nearest int
     */
    private function calculateProgress(array $subtasks): int
    {
        $total = count($subtasks);
        if ($total === 0) return 0;

        $completed = 0;
        foreach ($subtasks as $st) {
            if ((int) $st['completed'] === 1) $completed++;
        }

        return (int) round(($completed / $total) * 100);
    }
}