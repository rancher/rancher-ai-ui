---
description: |
  Agentic workflow that creates or recreates the keyboard shortcuts E2E spec.
  Uses create-pull-request to push changes, then dispatches the runner.

on:
  workflow_dispatch:
    inputs:
      force_recreate:
        description: "Force recreate the spec from scratch"
        type: boolean
        default: false

permissions: read-all

network:
  allowed:
    - defaults
    - node

imports:
  - shared/cypress-rancher-ai.md

safe-outputs:
  create-pull-request:
    title-prefix: "test(e2e): "
    labels: [ai-e2e, automation]
    draft: true
    base-branch: e2e-agentic
    allowed-files:
      - "cypress/**"
    max: 1
  dispatch-workflow: [e2e-shortcuts-runner]
  create-issue:
    title-prefix: "[e2e-spec-writer] "
    labels: [ai-e2e, automation]
    expires: 2d
    max: 1
  noop:

tools:
  github:
    toolsets: [default]
  bash:
    - "cat *"
    - "ls *"
    - "find *"
    - "head *"
    - "grep *"
  edit:

timeout-minutes: 15
---

# E2E Spec Writer — Keyboard Shortcuts

You are a **spec-writing agent** for the Rancher AI UI extension.
Your job is to create (or recreate) the Cypress E2E spec that tests
keyboard shortcuts, then create a pull request with the changes and
trigger the E2E test runner.

## Step 1 — Check Current State

1. Check if `cypress/e2e/tests/features/shortcuts.spec.ts` already exists
2. If it exists AND `${{ github.event.inputs.force_recreate }}` is NOT `true`
   → use `noop` (spec already exists, nothing to do)
3. Otherwise → proceed to CREATE

## Step 2 — Study the Codebase

Read these files to understand patterns:

- `cypress/e2e/tests/features/chat.spec.ts` — existing spec for reference
- `cypress/e2e/tests/features/history/chat.spec.ts` — another spec example
- `cypress/e2e/po/chat.po.ts` — ChatPo page object
- `cypress/e2e/po/history.po.ts` — HistoryPo page object
- `cypress/e2e/po/console.po.ts` — ConsolePo page object
- `cypress/support/e2e.ts` — support file with custom commands
- `cypress/support/commands/` — custom Cypress commands
- `pkg/rancher-ai-ui/composables/useInputComposable.ts` — keyboard shortcut logic
- The Cypress skill reference (imported from shared fragment)

## Step 3 — Create the Spec

Create `cypress/e2e/tests/features/shortcuts.spec.ts` covering all 7 tests
from the test plan below. Follow the conventions in the shared fragment.

## Step 4 — Commit Changes Locally

Create a local branch and commit the new spec file:

```bash
git checkout -b test/e2e-shortcuts-spec
git add cypress/e2e/tests/features/shortcuts.spec.ts
git commit -m "test(e2e): create keyboard shortcuts spec"
```

Do NOT push. The `create_pull_request` safe output will handle pushing.

## Step 5 — Create the Pull Request

Use the `create_pull_request` tool to create a draft PR with:
- **title**: `add keyboard shortcuts E2E spec`
- **body**: A summary of the 7 tests created
- **branch**: `test/e2e-shortcuts-spec`

The safe output system will push the branch and create the PR.

## Step 6 — Trigger the E2E Runner

After creating the PR, dispatch the E2E runner.

**IMPORTANT**: The `create_pull_request` tool does NOT return the PR number.
Do NOT try to pass `pr_number` — the runner will auto-detect it.

Use `dispatch_workflow` with:
- **workflow**: `e2e-shortcuts-runner`
- **inputs**: `{"attempt": "1"}`

The runner will automatically find the latest open PR with the `ai-e2e` label
and branch prefix `test/e2e-shortcuts-spec`.

## Test Plan — Keyboard Shortcuts

### Test 1: Open / Close Chat Panel (Alt+K)
1. From the home page, press `Alt+K` (use `{alt+k}` combined modifier) → chat panel opens
2. Press `Alt+K` again → chat panel closes
3. Screenshots: `01-chat-opened`, `02-chat-closed` (take on the chat container element)

### Test 2: New Chat (Ctrl+Shift+O)
1. Open chat, send a message, wait for AI response
2. Press `Ctrl+Shift+O` (use `{ctrl+shift+o}`) → chat resets to welcome state
3. Screenshots: `03-before-new-chat`, `04-after-new-chat`

### Test 3: Toggle History (Ctrl+Shift+S)
1. Open chat, press `Ctrl+Shift+S` (use `{ctrl+shift+s}`) → history panel opens
2. Press `Ctrl+Shift+S` again → history closes
3. Screenshots: `05-history-opened`, `06-history-closed`

### Test 4: Copy Last Response (Ctrl+Shift+C)
1. Open chat, send message, wait for response
2. **Before pressing the shortcut**, stub `navigator.clipboard.writeText` to avoid permission errors in headless CI
3. Press `Ctrl+Shift+C` (use `{ctrl+shift+c}`) → no error, UI stable
4. Screenshot: `07-after-copy`

### Test 5: Delete Chat (Ctrl+Shift+Backspace)
1. Ensure active chat with messages
2. Press `Ctrl+Shift+Backspace` (use `{ctrl+shift+backspace}`) → delete modal appears
3. Click confirm → chat deleted
4. Screenshots: `08-delete-modal`, `09-after-delete`

### Test 6: Prompt History Navigation (ArrowUp / ArrowDown)
1. Send 3 messages, focus textarea
2. ArrowUp × 2, ArrowDown × 1 — verify textarea content changes
3. Do NOT use `{tab}` — it is not supported by cy.type(). Instead verify the textarea value matches a previously sent message after navigating.
4. Screenshots: `10-arrow-up`, `11-arrow-up-twice`, `12-arrow-down`, `13-prompt-selected`

### Test 7: Shortcuts Popover
1. Click chat menu button → menu opens
2. Click "View Keyboard Shortcuts" → popover visible
3. Screenshots: `14-menu-opened`, `15-shortcuts-popover`

## Spec Conventions

```typescript
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';

before(() => cy.login());
beforeEach(() => { cy.login(); HomePagePo.goTo(); });
afterEach(() => cy.cleanChatHistory());

const isMac = Cypress.platform === 'darwin';

// Keyboard shortcuts — use Alt+K on Linux/Windows, Meta+Shift+K on Mac
// IMPORTANT: cy.type() shortcut modifiers must be in a SINGLE brace group
// WRONG:  cy.get('body').type('{alt}k')     — types Alt, releases, types k
// RIGHT:  cy.get('body').type('{alt+k}')    — presses Alt+K together
cy.get('body').type(isMac ? '{meta+shift+k}' : '{alt+k}');
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type(isMac ? '{meta+shift+o}' : '{ctrl+shift+o}');

// Mock AI responses before sending messages
cy.enqueueLLMResponse({ text: 'Hello from AI.' });
chat.sendMessage('Hello');

// Screenshots — ALWAYS wait for DOM stability before taking screenshots
// Use cy.wait(500) then take screenshot of the specific chat container element
cy.wait(500);
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .screenshot('03-before-new-chat');

// Clipboard API — In headless CI, navigator.clipboard.writeText() will fail.
// To test copy functionality, stub the clipboard API:
cy.window().then((win) => {
  cy.stub(win.navigator.clipboard, 'writeText').resolves();
});

// Tab key — cy.type('{tab}') is NOT supported in Cypress.
// To press Tab, use cy.realPress('Tab') from cypress-real-events, or
// just validate the textarea value matches a previously sent message.
```

## Important Rules

- Create a COMPLETE spec covering all 7 tests.
- Always take `cy.screenshot()` with the specified names.
- **Take screenshots ON the chat container element**, not the full page:
  ```typescript
  cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('name');
  ```
- **Add `cy.wait(500)` before every `cy.screenshot()`** to ensure DOM stability.
- **Use combined modifier syntax** for keyboard shortcuts:
  `{alt+k}`, `{ctrl+shift+o}`, NOT `{alt}k` or `{ctrl}{shift}o`
- **Stub the clipboard API** before Test 4 (Copy) to avoid permission errors.
- **Do NOT use `{tab}` in cy.type()** — it is not a supported key. Verify
  textarea content directly instead.
- Do NOT run Cypress — the runner workflow will handle that.
- Do NOT `git push` — the `create_pull_request` safe output handles pushing.
- Commit locally with: `test(e2e): create keyboard shortcuts spec`
- After committing locally, call `create_pull_request`, then dispatch the runner.
