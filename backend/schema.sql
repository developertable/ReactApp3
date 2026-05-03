-- ════════════════════════════════════════════════════════════════════════════
-- schema.sql
-- ----------------------------------------------------------------------------
-- Database schema for ReactApp3 — Task Logger
--
-- Run this once to set up the database from scratch:
--   /Applications/XAMPP/xamppfiles/bin/mysql -u root < backend/schema.sql
--
-- Re-running this file will DROP and recreate the database. Useful during
-- development when the schema changes; never run on production data.
-- ════════════════════════════════════════════════════════════════════════════

-- Drop and recreate the database to ensure a clean slate every time.
DROP DATABASE IF EXISTS task_logger;
CREATE DATABASE task_logger
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE task_logger;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: tasks
-- ----------------------------------------------------------------------------
-- The "main task" — the high-level thing the user wants to accomplish.
-- A task is considered complete when ALL its subtasks are complete (we
-- compute this on the fly in PHP, so there's no `completed` column here).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255)                        NOT NULL,
    description TEXT                                NULL,
    priority    ENUM('low', 'medium', 'high')       NOT NULL DEFAULT 'medium',
    due_date    DATE                                NULL,
    created_at  TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                             ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: subtasks
-- ----------------------------------------------------------------------------
-- A scheduled work block belonging to a parent task. Each subtask has:
--   - a scheduled date/time when the user plans to do it
--   - an allotted duration in minutes
--   - a completed flag
--   - a position for ordering within the parent task
--
-- ON DELETE CASCADE: if the parent task is deleted, MySQL automatically
-- deletes all its subtasks. No PHP code needed for this — it happens at
-- the database level. Prevents orphaned rows.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE subtasks (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id          INT UNSIGNED                  NOT NULL,
    title            VARCHAR(255)                  NOT NULL,
    scheduled_at     DATETIME                      NOT NULL,
    allotted_minutes INT UNSIGNED                  NOT NULL DEFAULT 30,
    completed        TINYINT(1)                    NOT NULL DEFAULT 0,
    position         INT UNSIGNED                  NOT NULL DEFAULT 0,
    created_at       TIMESTAMP                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP                     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                            ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign key to tasks table; cascade on delete so removing a parent
    -- task automatically removes all its subtasks.
    CONSTRAINT fk_subtasks_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Index on task_id for fast lookup of "all subtasks for task X"
    INDEX idx_subtasks_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ----------------------------------------------------------------------------
-- A few realistic tasks so the app has something to show on first run.
-- These reflect the kinds of things the app is actually designed for.
-- ════════════════════════════════════════════════════════════════════════════

-- Main task 1: a multi-step project
INSERT INTO tasks (id, title, description, priority, due_date) VALUES
(1, 'Launch personal portfolio site',
    'Build and deploy a portfolio site to showcase triOS coursework',
    'high', '2026-05-31');

INSERT INTO subtasks (task_id, title, scheduled_at, allotted_minutes, completed, position) VALUES
(1, 'Sketch wireframes',          '2026-05-05 09:00:00',  60, 1, 0),
(1, 'Set up React + Vite project', '2026-05-05 14:00:00',  30, 1, 1),
(1, 'Build hero section',         '2026-05-06 10:00:00',  90, 0, 2),
(1, 'Build projects gallery',     '2026-05-07 10:00:00', 120, 0, 3),
(1, 'Deploy to Netlify',          '2026-05-08 15:00:00',  45, 0, 4);

-- Main task 2: a study session
INSERT INTO tasks (id, title, description, priority, due_date) VALUES
(2, 'Study for FSRA mortgage exam',
    'Cover all topics for the licensing exam',
    'high', '2026-05-20');

INSERT INTO subtasks (task_id, title, scheduled_at, allotted_minutes, completed, position) VALUES
(2, 'Review compliance module',   '2026-05-04 19:00:00', 90, 0, 0),
(2, 'Practice exam questions',    '2026-05-05 19:00:00', 60, 0, 1),
(2, 'Mock exam, timed',           '2026-05-06 19:00:00', 90, 0, 2);

-- Main task 3: a quick task with no subtasks yet (to test the empty state)
INSERT INTO tasks (id, title, description, priority, due_date) VALUES
(3, 'Plan cricket coaching website',
    'Outline structure for cricketcoach.ca',
    'medium', '2026-05-15');

-- (No subtasks for task 3 — this lets us verify the UI handles 0% progress)