---
description: |
  Self-healing E2E testing agent for keyboard shortcuts in Rancher AI UI.
  Manages a persistent Cypress spec — creates it if missing, fixes it if broken.
  Deploys Rancher + AI mock service, runs the spec, and auto-heals on failure
  by creating/fixing the spec and opening a PR.

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

tools:
  github:
    toolsets: [default]
  bash: true
  edit:

timeout-minutes: 30
---

# Self-Healing E2E — Keyboard Shortcuts

You are a **self-healing E2E testing agent** for the Rancher AI UI extension.
You manage a persistent Cypress spec file that tests keyboard shortcuts.

## Spec File Location

**Always use this path:** `cypress/e2e/tests/features/shortcuts.spec.ts`

This file is committed to the repo and persists across runs. It is the
**single source of truth** for keyboard shortcut E2E tests.

## Determine Operating Mode

First, determine which mode to operate in:

1. Check if `${{ github.event.inputs.force_recreate }}` is `true` → **CREATE** mode
2. Check if the spec file exists at the path above → if missing → **CREATE** mode
3. If the spec exists, run it. If tests fail → **FIX** mode
4. If the spec exists and tests pass → **NOOP** (exit with `noop` safe-output)

## Mode: CREATE

The spec file does not exist (or force-recreate was requested). You must:

1. Read the test plan below
2. Read the Cypress skill reference imported from the shared fragment
3. Create `cypress/e2e/tests/features/shortcuts.spec.ts`
4. Run it to verify it passes:
   ```
   TEST_SKIP=setup TEST_PASSWORD=admin1234 TEST_USERNAME=admin \
   CYPRESS_BASE_URL=https://localhost:8005 NODE_TLS_REJECT_UNAUTHORIZED=0 \
   yarn cypress:run --spec cypress/e2e/tests/features/shortcuts.spec.ts \
   --config video=true,screenshotOnRunFailure=true
   ```
5. If it fails, debug and fix until it passes (max 3 attempts)
6. Create a pull request with the new spec file
7. Commit message format: `test(e2e): create keyboard shortcuts spec`

## Mode: FIX

The spec file exists but tests failed. You must:

1. Read the Cypress error output from the test run
2. Read the current spec at `cypress/e2e/tests/features/shortcuts.spec.ts`
3. Read the Cypress skill reference
4. Identify the root cause (selector changed? timing issue? new UI layout?)
5. Update **only the broken parts** — do not rewrite the entire spec
6. Run the updated spec to verify it passes
7. If it still fails, try a different fix (max 3 attempts)
8. Create a pull request with the fixed spec file
9. Commit message format: `test(e2e): fix keyboard shortcuts spec`

## Mode: NOOP

The spec exists and all tests pass. Use the `noop` safe-output. Nothing to do.

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
