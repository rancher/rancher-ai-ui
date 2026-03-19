---
description: |
  Self-healing E2E testing agent for keyboard shortcuts in Rancher AI UI.
  Uses a hybrid approach: a regular GH Actions job runs Cypress tests first,
  then the AI agent analyzes results and creates/fixes the spec as needed.

on:
  workflow_dispatch:
    inputs:
      force_recreate:
        description: "Force the AI agent to recreate the spec from scratch"
        type: boolean
        default: false
  schedule: weekly

permissions: read-all

network:
  allowed:
    - defaults
    - node

imports:
  - shared/cypress-rancher-ai.md

safe-outputs:
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

# ---------- Regular GH Actions job: runs Cypress OUTSIDE the sandbox ----------
jobs:
  run_tests:
    runs-on: ubuntu-latest
    outputs:
      cypress_outcome: ${{ steps.cypress.outcome }}
      spec_exists: ${{ steps.check_spec.outputs.exists }}
    env:
      CATTLE_SERVER_URL: https://172.17.0.1
      CATTLE_BOOTSTRAP_PASSWORD: password
      KUBECONFIG_PATH: ${{ github.workspace }}/kubeconfig.yaml
      DEV_UI_URL: https://localhost:8005
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Check if spec exists
        id: check_spec
        run: |
          if [ -f cypress/e2e/tests/features/shortcuts.spec.ts ]; then
            echo "exists=true" >> "$GITHUB_OUTPUT"
          else
            echo "exists=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Start Rancher
        run: .github/scripts/install-rancher.sh head ${{ env.CATTLE_SERVER_URL }} ${{ env.CATTLE_BOOTSTRAP_PASSWORD }}

      - name: Deploy Rancher AI charts
        run: .github/scripts/deploy-rancher-ai.sh ${{ env.KUBECONFIG_PATH }}

      - name: Start dev UI
        env:
          API: ${{ env.CATTLE_SERVER_URL }}
        run: |
          nohup yarn dev > dev.log 2>&1 &
          echo $! > dev.pid

      - name: Wait for dev UI to be ready
        run: npx wait-on ${{ env.DEV_UI_URL }}

      - name: Run Cypress tests
        id: cypress
        if: steps.check_spec.outputs.exists == 'true'
        continue-on-error: true
        env:
          TEST_USERNAME: admin
          TEST_PASSWORD: ${{ env.CATTLE_BOOTSTRAP_PASSWORD }}
          CYPRESS_BASE_URL: ${{ env.DEV_UI_URL }}
          NODE_TLS_REJECT_UNAUTHORIZED: "0"
          TEST_SKIP: setup
          API: ${{ env.CATTLE_SERVER_URL }}
        run: |
          yarn cypress:run \
            --spec cypress/e2e/tests/features/shortcuts.spec.ts \
            --browser chrome \
            --config video=true,screenshotOnRunFailure=true \
            2>&1 | tee /tmp/cypress-output.txt

      - name: Upload Cypress results
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

      - name: Tear down background processes
        if: always()
        run: |
          if [ -f dev.pid ]; then kill $(cat dev.pid) || true; fi

# ---------- Agent pre-steps: download artifacts into sandbox-visible path ----------
steps:
  - name: Checkout repository
    uses: actions/checkout@v5
    with:
      fetch-depth: 1
      persist-credentials: false

  - name: Download Cypress results
    uses: actions/download-artifact@v4
    with:
      name: e2e-results
      path: /tmp/gh-aw/e2e-results/
    continue-on-error: true

tools:
  github:
    toolsets: [default]
  bash: true
  edit:

timeout-minutes: 45
---

# Self-Healing E2E — Keyboard Shortcuts

You are a **self-healing E2E testing agent** for the Rancher AI UI extension.
You manage a persistent Cypress spec file that tests keyboard shortcuts.

## Architecture

This workflow uses a **hybrid approach**:
1. A regular GitHub Actions job (`run_tests`) runs Cypress tests against a live Rancher + AI mock environment
2. You (the AI agent) analyze the results and create/fix the spec as needed
3. You **do NOT run Cypress yourself** — the test results are already available as artifacts

## Spec File Location

**Always use this path:** `cypress/e2e/tests/features/shortcuts.spec.ts`

This file is committed to the repo and persists across runs. It is the
**single source of truth** for keyboard shortcut E2E tests.

## Available Data

The `run_tests` job has already executed. Results are available at:
- **Screenshots**: `/tmp/gh-aw/e2e-results/cypress/screenshots/` (if tests ran)
- **Videos**: `/tmp/gh-aw/e2e-results/cypress/videos/` (if tests ran)
- **Cypress output**: `/tmp/gh-aw/e2e-results/cypress-output.txt` (if tests ran)
- **Job outputs** (from `run_tests` job):
  - `spec_exists`: `${{ needs.run_tests.outputs.spec_exists }}` — whether the spec file existed
  - `cypress_outcome`: `${{ needs.run_tests.outputs.cypress_outcome }}` — `success` or `failure` (empty if spec didn't exist)

## Determine Operating Mode

Based on the `run_tests` job outputs:

1. If `${{ github.event.inputs.force_recreate }}` is `true` → **CREATE** mode
2. If `spec_exists` is `false` → **CREATE** mode (spec doesn't exist yet)
3. If `spec_exists` is `true` and `cypress_outcome` is `failure` → **FIX** mode
4. If `spec_exists` is `true` and `cypress_outcome` is `success` → **NOOP** mode

## Mode: CREATE

The spec file does not exist (or force-recreate was requested). You must:

1. Read the test plan below
2. Read the Cypress skill reference imported from the shared fragment
3. Study existing specs (`cypress/e2e/tests/features/chat.spec.ts`,
   `cypress/e2e/tests/features/history/chat.spec.ts`) for patterns
4. Create `cypress/e2e/tests/features/shortcuts.spec.ts`
5. Create a pull request with the new spec file
6. Commit message format: `test(e2e): create keyboard shortcuts spec`

> **Note:** You do NOT need to run Cypress. The next workflow run will execute the new spec.

## Mode: FIX

The spec file exists but Cypress tests failed. You must:

1. Read the Cypress output at `/tmp/gh-aw/e2e-results/cypress-output.txt`
2. Check screenshots at `/tmp/gh-aw/e2e-results/cypress/screenshots/`
3. Read the current spec at `cypress/e2e/tests/features/shortcuts.spec.ts`
4. Read the Cypress skill reference
5. Check the source Vue components for any changed `data-testid` selectors
6. Identify the root cause (selector changed? timing? new UI layout?)
7. Update **only the broken parts** — do not rewrite the entire spec
8. Create a pull request with the fixed spec file
9. Commit message format: `test(e2e): fix keyboard shortcuts spec`

> **Note:** The fix will be validated on the next workflow run.

## Mode: NOOP

The spec exists and all tests passed. Use the `noop` safe-output. Nothing to do.

## Test Plan — Keyboard Shortcuts

When creating or fixing the spec, ensure it covers all of these tests.
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

When writing or editing the spec, follow these conventions:

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
// Inside chat container:
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type(isMac ? '{meta}{shift}o' : '{ctrl}{shift}o');       // New chat

// Mock AI responses before sending messages
cy.enqueueLLMResponse({ text: 'Hello from AI.' });
chat.sendMessage('Hello');
```

## Important Rules

- **Never delete the spec file** — always update it in place.
- If fixing, make **minimal changes** — don't rewrite working tests.
- Always run the spec after changes to confirm it passes.
- Maximum 3 fix attempts. If still failing after 3 tries, create an issue
  reporting the failure with details and commit whatever progress was made.
- Screenshots go to `cypress/screenshots/` and videos to `cypress/videos/`.
