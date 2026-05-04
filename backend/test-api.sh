#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# test-api.sh
# ----------------------------------------------------------------------------
# Automated end-to-end tests for the Task Logger REST API.
#
# Usage:
#   1. Make sure XAMPP MySQL is running
#   2. Reset seed data: mysql -u root < schema.sql
#   3. Start the API:   php -S localhost:8000
#   4. Run this script: ./test-api.sh
#
# Exits 0 if all tests pass, 1 if any fail.
# ════════════════════════════════════════════════════════════════════════════

# Configuration
BASE_URL="http://localhost:8000"
PASS_COUNT=0
FAIL_COUNT=0

# ── Color codes for terminal output ──────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # no color

# ── Helper: print a pretty section header ────────────────────────────────────
section() {
    echo ""
    echo -e "${YELLOW}━━━ $1 ━━━${NC}"
}

# ── Helper: assert that an HTTP response matches what we expect ──────────────
# Args:
#   $1: test name (for output)
#   $2: expected HTTP status code
#   $3: actual HTTP status code
#   $4: response body (for grep checks)
#   $5: optional grep pattern that must be present in the body
assert_response() {
    local name="$1"
    local expected_status="$2"
    local actual_status="$3"
    local body="$4"
    local grep_pattern="$5"

    # Check status code
    if [ "$actual_status" != "$expected_status" ]; then
        echo -e "  ${RED}✗${NC} $name"
        echo -e "    Expected status $expected_status, got $actual_status"
        echo -e "    Body: $body"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi

    # If a grep pattern was provided, check the body contains it
    if [ -n "$grep_pattern" ]; then
        if ! echo "$body" | grep -q "$grep_pattern"; then
            echo -e "  ${RED}✗${NC} $name"
            echo -e "    Status was $actual_status (expected) but body missing pattern: $grep_pattern"
            echo -e "    Body: $body"
            FAIL_COUNT=$((FAIL_COUNT + 1))
            return 1
        fi
    fi

    echo -e "  ${GREEN}✓${NC} $name"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
}

# ── Helper: make a request and split out body and status code ───────────────
# Sets globals $RESP_BODY and $RESP_STATUS for the caller to inspect.
request() {
    local method="$1"
    local path="$2"
    local data="$3"

    if [ -n "$data" ]; then
        # POST/PUT with a JSON body
        local response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        # GET/DELETE with no body
        local response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path")
    fi

    # The response is the body followed by a newline and the status code.
    # Split them apart.
    RESP_STATUS=$(echo "$response" | tail -n1)
    RESP_BODY=$(echo "$response" | sed '$d')
}

# ════════════════════════════════════════════════════════════════════════════
# Test suite begins
# ════════════════════════════════════════════════════════════════════════════

echo "Running API tests against $BASE_URL"
echo "Make sure schema.sql has been freshly loaded for predictable results."

# ── GET /tasks ──────────────────────────────────────────────────────────────
section "GET /tasks"

request GET /tasks
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Body is a JSON array"     200 "$RESP_STATUS" "$RESP_BODY" '^\['
assert_response "Includes seed task 1"     200 "$RESP_STATUS" "$RESP_BODY" 'Launch personal portfolio'
assert_response "Each task has subtasks"   200 "$RESP_STATUS" "$RESP_BODY" '"subtasks":'
assert_response "Each task has progress"   200 "$RESP_STATUS" "$RESP_BODY" '"progress_percent":'

# ── GET /tasks/1 ────────────────────────────────────────────────────────────
section "GET /tasks/1"

request GET /tasks/1
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Returns the right task"   200 "$RESP_STATUS" "$RESP_BODY" 'Launch personal portfolio'
assert_response "Progress is 40%"          200 "$RESP_STATUS" "$RESP_BODY" '"progress_percent":40'

# ── GET /tasks/9999 (not found) ─────────────────────────────────────────────
section "GET /tasks/9999 (404)"

request GET /tasks/9999
assert_response "Returns 404"              404 "$RESP_STATUS" "$RESP_BODY"
assert_response "Has error message"        404 "$RESP_STATUS" "$RESP_BODY" 'not found'

# ── POST /tasks (create) ────────────────────────────────────────────────────
section "POST /tasks"

request POST /tasks '{"title":"Test task","priority":"low","due_date":"2026-06-01"}'
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Task title set"           200 "$RESP_STATUS" "$RESP_BODY" '"title":"Test task"'
assert_response "Priority set"             200 "$RESP_STATUS" "$RESP_BODY" '"priority":"low"'
assert_response "Has empty subtasks array" 200 "$RESP_STATUS" "$RESP_BODY" '"subtasks":\[\]'

# Capture the new task ID for later tests. Uses a quick grep + cut.
NEW_TASK_ID=$(echo "$RESP_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "    (captured new task id: $NEW_TASK_ID)"

# ── POST /tasks (validation: missing title) ─────────────────────────────────
section "POST /tasks (validation)"

request POST /tasks '{}'
assert_response "Returns 422"              422 "$RESP_STATUS" "$RESP_BODY"
assert_response "Has validation error"     422 "$RESP_STATUS" "$RESP_BODY" 'Title is required'

# ── POST /tasks/{id}/subtasks ───────────────────────────────────────────────
section "POST /tasks/$NEW_TASK_ID/subtasks"

request POST "/tasks/$NEW_TASK_ID/subtasks" \
    '{"title":"Test subtask","scheduled_at":"2026-06-01 10:00:00","allotted_minutes":45}'
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Subtask title set"        200 "$RESP_STATUS" "$RESP_BODY" '"title":"Test subtask"'
assert_response "Allotted minutes set"     200 "$RESP_STATUS" "$RESP_BODY" '"allotted_minutes":45'
assert_response "Linked to parent task"    200 "$RESP_STATUS" "$RESP_BODY" "\"task_id\":$NEW_TASK_ID"

NEW_SUBTASK_ID=$(echo "$RESP_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "    (captured new subtask id: $NEW_SUBTASK_ID)"

# ── POST subtask under non-existent parent ──────────────────────────────────
section "POST /tasks/9999/subtasks (parent not found)"

request POST "/tasks/9999/subtasks" \
    '{"title":"Orphan","scheduled_at":"2026-06-01 10:00:00","allotted_minutes":30}'
assert_response "Returns 404"              404 "$RESP_STATUS" "$RESP_BODY"
assert_response "Says parent not found"    404 "$RESP_STATUS" "$RESP_BODY" 'Parent task'

# ── POST subtask validation (missing allotted_minutes) ──────────────────────
section "POST subtask validation"

request POST "/tasks/$NEW_TASK_ID/subtasks" \
    '{"title":"Bad subtask","scheduled_at":"2026-06-01 10:00:00"}'
assert_response "Returns 422"              422 "$RESP_STATUS" "$RESP_BODY"
assert_response "Says minutes required"    422 "$RESP_STATUS" "$RESP_BODY" 'Allotted minutes'

# ── POST subtask scheduled after parent due_date ────────────────────────────
section "POST subtask after parent due date"

# Task 1's due_date is 2026-05-31. Try to schedule a subtask for June.
request POST "/tasks/1/subtasks" \
    '{"title":"Too late","scheduled_at":"2026-06-15 10:00:00","allotted_minutes":30}'
assert_response "Returns 422"              422 "$RESP_STATUS" "$RESP_BODY"
assert_response "Mentions parent due date" 422 "$RESP_STATUS" "$RESP_BODY" 'after the parent'

# Same date as due_date should be allowed (same-day work is fine)
request POST "/tasks/1/subtasks" \
    '{"title":"Just in time","scheduled_at":"2026-05-31 23:00:00","allotted_minutes":30}'
assert_response "Same-day allowed"         200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Subtask created"          200 "$RESP_STATUS" "$RESP_BODY" '"title":"Just in time"'

# ── PUT /subtasks/{id} (toggle complete) ────────────────────────────────────
section "PUT /subtasks/$NEW_SUBTASK_ID (mark complete)"

request PUT "/subtasks/$NEW_SUBTASK_ID" '{"completed":1}'
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Completed flag is 1"      200 "$RESP_STATUS" "$RESP_BODY" '"completed":1'

# ── Verify progress updated on parent task ──────────────────────────────────
section "GET /tasks/$NEW_TASK_ID (verify progress)"

request GET "/tasks/$NEW_TASK_ID"
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Progress is now 100%"     200 "$RESP_STATUS" "$RESP_BODY" '"progress_percent":100'

# ── PUT /tasks/{id} (update task) ───────────────────────────────────────────
section "PUT /tasks/$NEW_TASK_ID"

request PUT "/tasks/$NEW_TASK_ID" '{"title":"Updated title","priority":"high"}'
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Title updated"            200 "$RESP_STATUS" "$RESP_BODY" '"title":"Updated title"'
assert_response "Priority updated"         200 "$RESP_STATUS" "$RESP_BODY" '"priority":"high"'

# ── DELETE /tasks/{id} (cascade test) ───────────────────────────────────────
section "DELETE /tasks/$NEW_TASK_ID (cascade)"

request DELETE "/tasks/$NEW_TASK_ID"
assert_response "Returns 200 OK"           200 "$RESP_STATUS" "$RESP_BODY"
assert_response "Returns success"          200 "$RESP_STATUS" "$RESP_BODY" '"success":true'

# Confirm the parent is gone
request GET "/tasks/$NEW_TASK_ID"
assert_response "Parent now gives 404"     404 "$RESP_STATUS" "$RESP_BODY"

# Confirm the subtask was cascade-deleted (not directly accessible, but
# we can check that updating it now returns 404)
request PUT "/subtasks/$NEW_SUBTASK_ID" '{"completed":0}'
assert_response "Subtask cascaded away"    404 "$RESP_STATUS" "$RESP_BODY"

# ── Unknown route ───────────────────────────────────────────────────────────
section "Unknown route"

request GET /nonsense
assert_response "Returns 404"              404 "$RESP_STATUS" "$RESP_BODY"
assert_response "Has route not found msg"  404 "$RESP_STATUS" "$RESP_BODY" 'Route not found'

# ════════════════════════════════════════════════════════════════════════════
# Final report
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}All $TOTAL tests passed ✓${NC}"
    exit 0
else
    echo -e "${RED}$FAIL_COUNT of $TOTAL tests failed ✗${NC}"
    echo -e "${GREEN}$PASS_COUNT of $TOTAL passed${NC}"
    exit 1
fi