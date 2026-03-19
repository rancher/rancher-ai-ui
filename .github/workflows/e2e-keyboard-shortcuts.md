---
description: |
  Self-healing E2E testing agent for keyboard shortcuts in Rancher AI UI.
  The agent sets up the test environment, runs Cypress, and creates or
  fixes the spec based on results — all within a single execution.

on:
  workflow_dispatch:
    inputs:
      force_recreate:
        description: "Force the AI agent to recreate the spec from scratch"
        type: boolean
        default: false
  schedule: weekly

permissions: read-all

runtimes:
  node:
    version: "20"

network:
  allowed:
    - defaults
    - node
    - containers
    - local
    - chrome

sandbox:
  agent: false

strict: false

imports:
  - shared/cypress-rancher-ai.md

env:
  CATTLE_SERVER_URL: https://172.17.0.1
  CATTLE_BOOTSTRAP_PASSWORD: password
  KUBECONFIG_PATH: /home/runner/work/rancher-ai-ui/rancher-ai-ui/kubeconfig.yaml
  DEV_UI_URL: https://localhost:8005

safe-outputs:
  threat-detection: false
  create-issue:
    title-prefix: "[e2e-shortcuts] "
    labels: [ai-e2e, automation]
    expires: 2d
    max: 1
  create-pull-request:
    title-prefix: "[e2e-shortcuts] "
    labels: [ai-e2e, automation]
    draft: true
    protected-files: fallback-to-issue
  noop:

# ---------- Pre-steps: checkout, install deps, start infra ----------
steps:
  - name: Checkout repository
    uses: actions/checkout@v5
    with:
      fetch-depth: 1
      persist-credentials: false

  - name: Install dependencies
    run: yarn install --frozen-lockfile

  - name: Start Rancher
    run: .github/scripts/install-rancher.sh head ${{ env.CATTLE_SERVER_URL }} ${{ env.CATTLE_BOOTSTRAP_PASSWORD }}

  - name: Deploy Rancher AI charts
    run: .github/scripts/deploy-rancher-ai.sh ${{ env.KUBECONFIG_PATH }}

  - name: Start dev UI
    env:
      API: ${{ env.CATTLE_SERVER_URL }}
    run: |
      nohup yarn dev > /tmp/dev-ui.log 2>&1 &
      echo $! > /tmp/dev-ui.pid

  - name: Wait for dev UI
    run: npx wait-on ${{ env.DEV_UI_URL }} --timeout 120000

  - name: Verify services are reachable
    run: |
      echo "--- Rancher ---"
      curl -sk -o /dev/null -w "HTTP %{http_code}\n" ${{ env.CATTLE_SERVER_URL }} || echo "WARN: Rancher not reachable"
      echo "--- Dev UI ---"
      curl -sk -o /dev/null -w "HTTP %{http_code}\n" ${{ env.DEV_UI_URL }} || echo "WARN: Dev UI not reachable"

post-steps:
  - name: Tear down dev UI
    if: always()
    run: |
      if [ -f /tmp/dev-ui.pid ]; then kill "$(cat /tmp/dev-ui.pid)" || true; fi
  - name: Upload Cypress artifacts
    if: always()
    uses: actions/upload-artifact@v4
    with:
      name: e2e-results
      path: |
        cypress/screenshots/
        cypress/videos/
        /tmp/cypress-output.txt
      retention-days: 7
      if-no-files-found: ignore

tools:
  github:
    toolsets: [default]
  bash: true
  edit:

timeout-minutes: 60
---

# Self-Healing E2E — Keyboard Shortcuts

You are a **self-healing E2E testing agent** for the Rancher AI UI extension.
You manage a persistent Cypress spec file that tests keyboard shortcuts.

## Architecture

This workflow uses an **agent-driven approach**:
1. Pre-steps (deterministic) set up the full environment: Rancher, AI mock
   charts, dev UI server, and project dependencies
2. You (the AI agent) check the spec, run Cypress directly, and create or
   fix the spec based on the results

## Environment — ALREADY RUNNING

The pre-steps have already started:
- **Rancher** at `https://172.17.0.1` (user: `admin`, password: `password`)
- **Dev UI** at `https://localhost:8005`
- **Node + Yarn** are installed; `node_modules` is ready
- **kubeconfig** is at `$KUBECONFIG_PATH`

You have full network access — no sandbox firewall. You can `curl`, run
`yarn cypress:run`, etc.

## Spec File Location

**Always use this path:** `cypress/e2e/tests/features/shortcuts.spec.ts`

This file is committed to the repo and persists across runs.

## Step 1 — Determine Operating Mode

1. Check whether `cypress/e2e/tests/features/shortcuts.spec.ts` exists
2. If `${{ github.event.inputs.force_recreate }}` is `true` → **CREATE** mode
3. If the spec does **not** exist → **CREATE** mode
4. If the spec exists → run Cypress first (Step 2), then decide FIX or NOOP

## Step 2 — Run Cypress

Run the spec using bash:

```bash
cd $GITHUB_WORKSPACE
TEST_SKIP=setup \
TEST_USERNAME=admin \
TEST_PASSWORD=password \
CYPRESS_BASE_URL=https://localhost:8005 \
NODE_TLS_REJECT_UNAUTHORIZED=0 \
API=https://172.17.0.1 \
yarn cypress:run \
  --spec cypress/e2e/tests/features/shortcuts.spec.ts \
  --browser chrome \
  --config video=true,screenshotOnRunFailure=true \
  2>&1 | tee /tmp/cypress-output.txt
```

- If all tests pass → **NOOP** mode
- If tests fail → **FIX** mode (read the output to determine root cause)

## Mode: CREATE

1. Read the test plan below
2. Read the Cypress skill reference from the shared fragment
3. Study existing specs (`cypress/e2e/tests/features/chat.spec.ts`,
   `cypress/e2e/tests/features/history/chat.spec.ts`) for patterns
4. Create `cypress/e2e/tests/features/shortcuts.spec.ts`
5. **Run Cypress** to validate the spec (Step 2)
6. If tests fail, fix and re-run (up to 3 attempts)
7. Create a pull request with the spec
8. Commit message: `test(e2e): create keyboard shortcuts spec`

## Mode: FIX

1. Read `/tmp/cypress-output.txt` for failure details
2. Check screenshots in `cypress/screenshots/`
3. Read the current spec
4. Check source Vue components for changed `data-testid` selectors
5. Identify root cause (selector changed? timing? new UI layout?)
6. Update **only the broken parts** — do not rewrite the entire spec
7. **Re-run Cypress** to validate the fix
8. Repeat up to 3 times; if still failing, create an issue
9. Create a pull request with the fixed spec
10. Commit message: `test(e2e): fix keyboard shortcuts spec`

## Mode: NOOP

Spec exists and all tests passed. Use the `noop` safe-output.

## Test Plan — Keyboard Shortcuts

Each test should take at least one `cy.screenshot()` for verification.

### Test 1: Open / Close Chat Panel (Alt+K)
1. From the home page, press `Alt+K` → chat panel opens
2. Press `Alt+K` again → chat panel closes
3. Screenshots: `01-chat-opened`, `02-chat-closed`

### Test 2: New Chat (Ctrl+Shift+O)
1. Open chat, send a message, wait for AI response
2. Press `Ctrl+Shift+O` → chat resets to welcome state
3. Screenshots: `03-before-new-chat`, `04-after-new-chat`

### Test 3: Toggle History (Ctrl+Shift+S)
1. Open chat, press `Ctrl+Shift+S` → history panel opens
2. Press `Ctrl+Shift+S` again → history closes
3. Screenshots: `05-history-opened`, `06-history-closed`

### Test 4: Copy Last Response (Ctrl+Shift+C)
1. Open chat, send message, wait for response
2. Press `Ctrl+Shift+C` → no error, UI stable
3. Screenshot: `07-after-copy`

### Test 5: Delete Chat (Ctrl+Shift+Backspace)
1. Ensure active chat with messages
2. Press `Ctrl+Shift+Backspace` → delete modal appears
3. Click confirm → chat deleted
4. Screenshots: `08-delete-modal`, `09-after-delete`

### Test 6: Prompt History Navigation (ArrowUp / ArrowDown / Tab)
1. Send 3 messages, focus textarea
2. ArrowUp × 2, ArrowDown × 1, Tab to accept
3. Verify textarea has content
4. Screenshots: `10-arrow-up`, `11-arrow-up-twice`, `12-arrow-down`, `13-tab-accepted`

### Test 7: Shortcuts Popover
1. Click chat menu button → menu opens
2. Click "View Keyboard Shortcuts" → popover visible
3. Screenshots: `14-menu-opened`, `15-shortcuts-popover`

## Spec Conventions

```typescript
// Imports
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';

// Setup
before(() => cy.login());
beforeEach(() => { cy.login(); HomePagePo.goTo(); });
afterEach(() => cy.cleanChatHistory());

// Platform detection
const isMac = Cypress.platform === 'darwin';

// Keyboard shortcuts
cy.get('body').type(isMac ? '{meta}{shift}k' : '{alt}k');  // Open/close chat
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type(isMac ? '{meta}{shift}o' : '{ctrl}{shift}o');       // New chat

// Mock AI responses before sending messages
cy.enqueueLLMResponse({ text: 'Hello from AI.' });
chat.sendMessage('Hello');
```

## Important Rules

- **Never delete the spec file** — always update it in place.
- If fixing, make **minimal changes** — don't rewrite working tests.
- **Always run Cypress** after creating or editing the spec to validate.
- Maximum 3 fix attempts. If still failing after 3 tries, create an issue
  reporting the failure with details and commit whatever progress was made.
- Screenshots go to `cypress/screenshots/` and videos to `cypress/videos/`.
