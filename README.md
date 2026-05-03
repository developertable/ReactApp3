# ReactApp3 — Task Logger

A full-stack task management app built for **MWD4C (React) — Assignment 3** at triOS College.

Users can create main tasks, break them into scheduled subtasks (each with a date/time and allotted duration), mark them complete, and track progress visually.

## Stack

| Layer    | Tech                                |
|----------|-------------------------------------|
| Frontend | React 18 + Vite 5                   |
| Backend  | PHP 8 (REST API)                    |
| Database | MySQL / MariaDB (via XAMPP)         |

## Features

- Create main tasks with title, description, priority, and due date
- Add scheduled subtasks with date/time and allotted duration
- Mark subtasks as complete
- Auto-calculated progress bar on each main task
- Delete tasks (cascades to subtasks) or individual subtasks
- Mobile-responsive UI

## Quick start

### 1. Database

Start MySQL through XAMPP, then import the schema:

```bash
/Applications/XAMPP/xamppfiles/bin/mysql -u root < backend/schema.sql
```

### 2. Backend

```bash
cd backend
/Applications/XAMPP/xamppfiles/bin/php -S localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Author

Rahul Kurra · triOS College · Mobile Web Development Diploma