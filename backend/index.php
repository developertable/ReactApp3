<?php
// ════════════════════════════════════════════════════════════════════════════
// index.php
// ----------------------------------------------------------------------------
// Entry point for the REST API. Every request goes through this file.
//
// Responsibilities:
//   1. Set CORS headers (so the React app at port 5173 can call us)
//   2. Parse the URL path
//   3. Route to the right handler method based on HTTP method
//
// Routes:
//   GET    /tasks                       → TaskHandler::getAll
//   GET    /tasks/{id}                  → TaskHandler::getOne
//   POST   /tasks                       → TaskHandler::create
//   PUT    /tasks/{id}                  → TaskHandler::update
//   DELETE /tasks/{id}                  → TaskHandler::delete
//   POST   /tasks/{taskId}/subtasks     → SubtaskHandler::create
//   PUT    /subtasks/{id}               → SubtaskHandler::update
//   DELETE /subtasks/{id}               → SubtaskHandler::delete
// ════════════════════════════════════════════════════════════════════════════

// ── CORS headers ──────────────────────────────────────────────────────────
// Allow the Vite dev server (port 5173) to call this API. In production,
// you'd lock this down to your real domain.
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Browsers send a preflight OPTIONS request before any non-simple request
// (anything with a JSON body, custom headers, etc.). We need to respond 200
// to it without doing any actual work.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ── Load dependencies ─────────────────────────────────────────────────────
require_once 'db.php';        // creates $pdo
require_once 'tasks.php';     // TaskHandler class
require_once 'subtasks.php';  // SubtaskHandler class

// ── Parse the request ─────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip leading /api prefix if present (Vite proxy adds it in dev).
// This way both `/tasks` (direct) and `/api/tasks` (via Vite proxy) work.
$uri = preg_replace('#^/api#', '', $uri);

// Get the JSON body for POST/PUT (no-op for GET/DELETE)
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Route dispatching ─────────────────────────────────────────────────────
// Try each route pattern in order. The first match wins.

// Route: POST /tasks/{taskId}/subtasks  (create a subtask under a task)
if (preg_match('#^/tasks/(\d+)/subtasks$#', $uri, $matches)) {
    $taskId  = (int) $matches[1];
    $handler = new SubtaskHandler($pdo);

    if ($method === 'POST') {
        echo json_encode($handler->create($taskId, $body));
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
    exit();
}

// Route: PUT/DELETE /subtasks/{id}  (update or delete an individual subtask)
if (preg_match('#^/subtasks/(\d+)$#', $uri, $matches)) {
    $id      = (int) $matches[1];
    $handler = new SubtaskHandler($pdo);

    switch ($method) {
        case 'PUT':
            echo json_encode($handler->update($id, $body));
            break;
        case 'DELETE':
            echo json_encode($handler->delete($id));
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    exit();
}

// Route: /tasks  or  /tasks/{id}  (main tasks)
if (preg_match('#^/tasks(/(\d+))?$#', $uri, $matches)) {
    $id      = isset($matches[2]) ? (int) $matches[2] : null;
    $handler = new TaskHandler($pdo);

    switch ($method) {
        case 'GET':
            echo json_encode($id ? $handler->getOne($id) : $handler->getAll());
            break;
        case 'POST':
            echo json_encode($handler->create($body));
            break;
        case 'PUT':
            echo json_encode($handler->update($id, $body));
            break;
        case 'DELETE':
            echo json_encode($handler->delete($id));
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    exit();
}

// ── No route matched: 404 ─────────────────────────────────────────────────
http_response_code(404);
echo json_encode(['error' => 'Route not found: ' . $method . ' ' . $uri]);