<?php
// ════════════════════════════════════════════════════════════════════════════
// subtasks.php
// ----------------------------------------------------------------------------
// SubtaskHandler class — all database logic for subtasks.
//
// Subtasks belong to a parent task (via task_id foreign key) and represent
// scheduled work blocks with a date/time and allotted duration.
// ════════════════════════════════════════════════════════════════════════════

class SubtaskHandler
{
    public function __construct(private PDO $pdo) {}

    // ─────────────────────────────────────────────────────────────────────
    // POST /tasks/{taskId}/subtasks
    // Creates a new subtask under the given parent task.
    // ─────────────────────────────────────────────────────────────────────
    public function create(int $taskId, array $body): array
    {
        // First confirm the parent task exists; otherwise the foreign key
        // would fail with an ugly database error. Better to return 404 cleanly.
        if (!$this->parentExists($taskId)) {
            http_response_code(404);
            return ['error' => "Parent task $taskId not found"];
        }

        // Pull and validate fields
        $title           = trim($body['title'] ?? '');
        $scheduledAt     = trim($body['scheduled_at'] ?? '');
        $allottedMinutes = (int) ($body['allotted_minutes'] ?? 0);
        $position        = (int) ($body['position'] ?? 0);

        // Validate: title and scheduled_at are required, allotted_minutes must be > 0
        if ($title === '') {
            http_response_code(422);
            return ['error' => 'Subtask title is required'];
        }
        if ($scheduledAt === '') {
            http_response_code(422);
            return ['error' => 'Scheduled date/time is required'];
        }
        if ($allottedMinutes <= 0) {
            http_response_code(422);
            return ['error' => 'Allotted minutes must be greater than zero'];
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO subtasks (task_id, title, scheduled_at, allotted_minutes, position)
             VALUES (:task_id, :title, :scheduled_at, :allotted_minutes, :position)'
        );
        $stmt->execute([
            'task_id'          => $taskId,
            'title'            => $title,
            'scheduled_at'     => $scheduledAt,
            'allotted_minutes' => $allottedMinutes,
            'position'         => $position,
        ]);

        $newId = (int) $this->pdo->lastInsertId();
        return $this->findOrFail($newId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PUT /subtasks/{id}
    // Updates any subset of fields on a subtask. Most common use:
    // toggling `completed` to mark a subtask done.
    // ─────────────────────────────────────────────────────────────────────
    public function update(int $id, array $body): array
    {
        $existing = $this->findOrFail($id);
        if (isset($existing['error'])) return $existing;

        // Use new value if provided, otherwise keep existing
        $title           = isset($body['title'])
            ? trim($body['title'])
            : $existing['title'];
        $scheduledAt     = isset($body['scheduled_at'])
            ? trim($body['scheduled_at'])
            : $existing['scheduled_at'];
        $allottedMinutes = isset($body['allotted_minutes'])
            ? (int) $body['allotted_minutes']
            : (int) $existing['allotted_minutes'];
        $completed       = isset($body['completed'])
            ? (int)(bool) $body['completed']  // accept true/false, 1/0, "1"/"0"
            : (int) $existing['completed'];
        $position        = isset($body['position'])
            ? (int) $body['position']
            : (int) $existing['position'];

        $stmt = $this->pdo->prepare(
            'UPDATE subtasks
             SET title = :title, scheduled_at = :scheduled_at,
                 allotted_minutes = :allotted_minutes, completed = :completed,
                 position = :position
             WHERE id = :id'
        );
        $stmt->execute([
            'title'            => $title,
            'scheduled_at'     => $scheduledAt,
            'allotted_minutes' => $allottedMinutes,
            'completed'        => $completed,
            'position'         => $position,
            'id'               => $id,
        ]);

        return $this->findOrFail($id);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE /subtasks/{id}
    // Removes a single subtask. Doesn't affect the parent task.
    // ─────────────────────────────────────────────────────────────────────
    public function delete(int $id): array
    {
        $existing = $this->findOrFail($id);
        if (isset($existing['error'])) return $existing;

        $this->pdo->prepare('DELETE FROM subtasks WHERE id = :id')
                  ->execute(['id' => $id]);

        return ['success' => true, 'id' => $id];
    }

    // ═════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═════════════════════════════════════════════════════════════════════

    /**
     * Look up a subtask by id, return error with 404 if not found.
     */
    private function findOrFail(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM subtasks WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            return ['error' => "Subtask $id not found"];
        }
        return $row;
    }

    /**
     * Check if a parent task exists. Used before creating subtasks to
     * return a clean 404 instead of a foreign key violation.
     */
    private function parentExists(int $taskId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM tasks WHERE id = :id');
        $stmt->execute(['id' => $taskId]);
        return (bool) $stmt->fetchColumn();
    }
}