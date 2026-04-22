---
description: |
  Agentic workflow that reads a test plan from a PR and executes the tests
  using MCP Playwright directly - no spec file is created. The AI agent
  drives Playwright to interact with the Rancher AI UI and verifies each
  test case from the plan.

on:
  workflow_dispatch:
    inputs:
      feature_area:
        description: "Feature area to test"
        required: true
        type: string
      pr_number:
        description: "PR number containing the test plan"
        required: false
        type: string
        default: ""
      attempt:
        description: "Attempt number for the test loop"
        required: false
        type: string
        default: "1"

permissions: read-all

network:
  allowed:
    - defaults
    - playwright
    - node
    - local
    - "172.17.0.1"
    - "stgregistry.suse.com"

checkout:
  fetch: ["*"]
  fetch-depth: 0

imports:
  - shared/playwright-rancher-ai.md

env:
  RANCHER_VERSION: head
  CATTLE_SERVER_URL: https://172.17.0.1
  CATTLE_BOOTSTRAP_PASSWORD: password
  KUBECONFIG_PATH: ${{ github.workspace }}/kubeconfig.yaml
  DEV_UI_URL: https://localhost:8005

steps:
  - name: Setup Node env
    uses: ./.github/actions/setup

  - name: Start Rancher
    run: .github/scripts/install-rancher.sh ${{ env.RANCHER_VERSION }} ${{ env.CATTLE_SERVER_URL }} ${{ env.CATTLE_BOOTSTRAP_PASSWORD }}

  - name: Deploy Rancher AI charts
    run: .github/scripts/deploy-rancher-ai.sh ${{ env.KUBECONFIG_PATH }}

  - name: Start dev UI
    env:
      API: ${{ env.CATTLE_SERVER_URL }}
    run: |
      nohup yarn dev > dev.log 2>&1 & echo $! > dev.pid

  - name: Wait for dev UI to be ready
    run: |
      npx wait-on ${{ env.DEV_UI_URL }}

  - name: Free port 80 for MCP Gateway
    run: |
      # Rancher Docker binds port 80 (HTTP redirect) but we only need 443.
      # The MCP Gateway needs port 80, so kill any process bound to it.
      # The docker-proxy process holds the port even after iptables cleanup.
      sudo fuser -k 80/tcp || true
      sleep 2
      # Verify port 80 is now free
      if sudo fuser 80/tcp 2>/dev/null; then
        echo "ERROR: Port 80 is still in use!"
        sudo fuser -v 80/tcp
        exit 1
      fi
      echo "Port 80 is now free for MCP Gateway"

  - name: Prepare Playwright output directory
    run: |
      # The Playwright Docker container runs as a non-root user (pwuser).
      # The MCP Gateway creates the output dir as the runner user, so the
      # container can't write videos/screenshots to it. Fix permissions.
      mkdir -p /tmp/gh-aw/mcp-logs/playwright
      chmod 777 /tmp/gh-aw/mcp-logs/playwright

safe-outputs:
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
  add-labels:
    target: "*"
  dispatch-workflow: [e2e-mcp-automation-plan-verifier]
  noop:

tools:
  playwright:
    args: ["--ignore-https-errors", "--caps=devtools", "--isolated"]
  web-fetch:
  github:
    toolsets: [all]
  repo-memory:
    branch-name: memory/default
    max-file-size: 102400
    max-patch-size: 102400
    file-glob: ["*.md"]

timeout-minutes: 120
---

# E2E MCP Automation Runner

You are an **E2E test runner agent** for the Rancher AI UI extension. Your
job is to read a test plan from the PR branch and execute each test case
using **Playwright** browser automation. You do NOT create spec files - you
ARE the test runner.

The application is already running at `https://localhost:8005` with a
Rancher instance and the AI service deployed. The LLM mock service is
available at `http://localhost:1080`.

**Feature area**: `${{ github.event.inputs.feature_area }}`
**Attempt**: `${{ github.event.inputs.attempt }}`

## Step 0 - Read Learnings

Read each learnings file if it exists. These contain hard-won knowledge from
previous runs — **trust them over your own assumptions**.

```bash
echo "=== Anti-Patterns ==="
cat /tmp/gh-aw/repo-memory/default/anti-patterns.md 2>/dev/null || echo "(none)"
echo ""
echo "=== Patterns ==="
cat /tmp/gh-aw/repo-memory/default/patterns.md 2>/dev/null || echo "(none)"
echo ""
echo "=== Selectors ==="
cat /tmp/gh-aw/repo-memory/default/selectors.md 2>/dev/null || echo "(none)"
```

## Step 1 - Find the PR and Read the Test Plan

If `${{ github.event.inputs.pr_number }}` is provided, use that.

Otherwise, auto-detect:
```bash
gh pr list --repo "$GITHUB_REPOSITORY" \
  --label bot/e2e-mcp-automation \
  --state open \
  --json number,headRefName \
  --jq '.[] | select(.headRefName | startswith("test/e2e-mcp-${{ github.event.inputs.feature_area }}")) | .number' \
  | head -1
```

Then checkout and read the plan:
```bash
PR_DATA=$(gh pr view $PR_NUMBER --json headRefName)
BRANCH=$(echo "$PR_DATA" | jq -r '.headRefName')
git checkout "$BRANCH"
PLAN_FILE=$(find cypress/e2e -name "mcp-test-plan-${{ github.event.inputs.feature_area }}*" -type f)
cat "$PLAN_FILE"
```

Parse the test plan carefully. You will execute each test case using Playwright.

## Step 2 - Login to Rancher

Before running any tests, authenticate:

1. Navigate to `https://localhost:8005` (accept self-signed certificate)
2. Wait for the login page to load
3. Enter the password `password` into the password field
4. Click the "Log In" button
5. Wait for the Rancher Dashboard to load
6. Take a screenshot with filename `/tmp/gh-aw/mcp-logs/playwright/login-success.png`

**IMPORTANT**: Configure Playwright to ignore HTTPS errors.

## Step 2.5 - Start Video Recording

Start recording the entire test session:

1. Call `browser_start_video` with filename `/tmp/gh-aw/mcp-logs/playwright/e2e-${{ github.event.inputs.feature_area }}-attempt-${{ github.event.inputs.attempt }}.webm`
2. This records everything from login through all test cases
3. After calling `browser_start_video`, verify the recording started by checking the tool response

**IMPORTANT**: Always use absolute paths starting with `/tmp/gh-aw/mcp-logs/playwright/`
for video filenames and screenshot filenames. This ensures files are saved to the
mounted volume and included in the workflow artifacts.

**CRITICAL**: If `browser_start_video` fails or returns an error, log the error
but continue with the tests — screenshots are still valuable without video.

## Step 3 - Execute Test Cases

For each test case in the test plan:

### Before each test case:
1. Call `browser_video_chapter` with the test case name as the title
2. If mock LLM responses are needed, set them up:
   ```bash
   curl -X PUT "http://localhost:1080/mockserver/expectation" \
     -H "Content-Type: application/json" \
     -d '<mock-body-from-test-plan>'
   ```
2. Navigate to the starting page
3. Wait for the page to be ready

### During each test case:
1. Follow each step from the test plan exactly
2. Use the selectors specified in the test plan
3. After each major interaction, wait for the expected result
4. Take a screenshot after key assertions (use absolute path: `/tmp/gh-aw/mcp-logs/playwright/<name>.png`)
5. Verify each assertion from the test plan

### After each test case:
1. Record the result: PASSED or FAILED
2. If FAILED, record which step failed, what was expected vs actual, and take a failure screenshot (save to `/tmp/gh-aw/mcp-logs/playwright/`)
3. Clean up if needed (close chat panel, clear history)

### Tips:
- Wait for elements before interacting
- Use `data-testid` selectors (e.g., `[data-testid="rancher-ai-ui-chat-panel-ready"]`)
- After opening the chat, always wait for the panel-ready indicator
- After keyboard shortcuts, wait ~500ms for animations

## Step 4 - Stop Video Recording

After all test cases are complete:

1. Call `browser_stop_video` to finalize the recording
2. The video file is saved to `/tmp/gh-aw/mcp-logs/playwright/`
3. Verify files were captured:
```bash
echo "=== Captured Playwright artifacts ==="
find /tmp/gh-aw/mcp-logs/playwright -type f -exec ls -lh {} \;
echo "=== Total size ==="
du -sh /tmp/gh-aw/mcp-logs/playwright/
```
4. If no video file exists but screenshots do, that's OK — the screenshots
   are the most important evidence. Log a warning and continue.

## Step 5 - Compile Results

After all test cases, compile a results summary.

First, list all captured evidence:
```bash
echo "=== All captured evidence files ==="
find /tmp/gh-aw/mcp-logs/playwright -type f -name '*.png' -o -name '*.webm' -o -name '*.json' | sort
```

Then compile the report:

```
## MCP E2E Test Results - <feature_area>

**Attempt**: <N>
**Total Tests**: <N> | **Passed**: <N> | **Failed**: <N>

| # | Test Name | Status | Screenshot | Notes |
|---|-----------|--------|------------|-------|
| 1 | <name> | PASSED/FAILED | <filename>.png | <notes> |

### Evidence Files
- Video: `e2e-<feature>-attempt-<N>.webm` (if captured)
- Screenshots: list all .png files captured during the run

### Failure Details (if any)
...
```

**IMPORTANT**: Always include the list of captured screenshot filenames in the
results summary. This helps reviewers know what evidence is available in the
artifacts.

## Step 6 - Comment on PR

Post the full results as a PR comment using `add-comment`.

## Step 7 - Decision

### ALL tests passed
1. Add label `bot/e2e-mcp-automation/passed`
2. Include celebration message in the comment

### ANY test failed
1. Include failure details in the comment
2. Dispatch `e2e-mcp-automation-plan-verifier` with:
   - `feature_area`, `pr_number`, `attempt`: current + 1

## Step 8 - Update Learnings (failures only)

**Skip this step entirely if all tests passed.** The PR comment already
records success. Only write learnings when something failed or required a
non-obvious workaround.

Update the appropriate file(s) under `/tmp/gh-aw/repo-memory/default/`:

| File | What to write | Example |
|---|---|---|
| `anti-patterns.md` | Interactions that **don't work** and what to do instead | "`.type('{uparrow}')` doesn't fire Vue keydown — use `.trigger('keydown', {...})` instead" |
| `patterns.md` | Reusable interaction patterns that **do work** | "CDP bypass for HTTPS: `Security.setIgnoreCertificateErrors`", "Mock consumption: push N+1 mocks (welcome msg consumes one)" |
| `selectors.md` | Selectors that were **wrong in the plan** and the correct one | "`rancher-ai-ui-delete-chat-confirm-button` does NOT exist — use `prompt-remove-confirm-button`" |

### Rules for writing learnings

1. **Do NOT record per-test pass/fail results** — the PR comment has that.
2. **Do NOT record PR numbers, dates, or attempt counts** — they have no
   future value.
3. **Each entry must be actionable** — a future agent should be able to read
   it and change its behavior.
4. **Before appending, check if the insight already exists** — do not
   duplicate.
5. **Size cap**: if any file exceeds 80 lines, remove the least-actionable
   entries (vague notes, outdated info) before appending.

After writing, call `push_repo_memory`.

## Rules

- Execute EVERY test case in the plan, even if earlier ones fail
- Always take screenshots for evidence — at minimum: after login, before each test, after each test, and on any failure
- **EVERY screenshot MUST use an absolute path**: `/tmp/gh-aw/mcp-logs/playwright/<descriptive-name>.png`
- Be patient with waits - the app may load slowly
- Use `data-testid` selectors whenever possible
- Accept self-signed certificates
- Mock LLM responses BEFORE sending messages
- After all tests, ALWAYS run `find /tmp/gh-aw/mcp-logs/playwright -type f` to verify evidence files exist
- If `browser_screenshot` fails, retry once with a different filename before moving on
