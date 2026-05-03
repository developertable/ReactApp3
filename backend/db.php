<?php
// ════════════════════════════════════════════════════════════════════════════
// db.php
// ----------------------------------------------------------------------------
// Opens a PDO connection to the MySQL database and exposes it as $pdo.
// All other backend files require this and use $pdo to talk to the database.
//
// PDO (PHP Data Objects) is the modern, secure way to talk to MySQL from PHP.
// It supports prepared statements (which prevent SQL injection) and is
// database-agnostic (the same code works with PostgreSQL, SQLite, etc.).
//
// If you ever change DB credentials or move databases, change them here only.
// ════════════════════════════════════════════════════════════════════════════

// ── Database connection settings ──────────────────────────────────────────
// XAMPP defaults: root user, no password, localhost on port 3306.
// In a real production app, these would come from environment variables.
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'task_logger');
define('DB_USER', 'root');
define('DB_PASS', '');

try {
    // Build the DSN (Data Source Name) string and create the PDO instance.
    // charset=utf8mb4 ensures we can store emojis and full Unicode.
    $pdo = new PDO(
        sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            DB_HOST, DB_PORT, DB_NAME
        ),
        DB_USER,
        DB_PASS,
        [
            // Throw exceptions on errors instead of silently failing.
            // This makes bugs obvious during development.
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,

            // Return rows as associative arrays (e.g. $row['title']),
            // not numeric arrays. Cleaner JSON output.
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

            // Use real prepared statements at the database level rather
            // than emulating them in PHP. More secure, slightly faster.
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    // If the connection fails, return a 500 error as JSON so the frontend
    // gets a useful message rather than a blank page.
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit();
}