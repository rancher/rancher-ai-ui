---
description: |
  Agentic workflow that creates or recreates the keyboard shortcuts E2E spec.
  Commits to a working branch and triggers the E2E runner workflow.

on:
  workflow_dispatch:
    inputs:
      force_recreate:
        description: "Force recreate the spec from scratch"
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
    - "git *"
  edit:

timeout-minutes: 15
---

# E2E Spec Writer — Keyboard Shortcuts

You are a **spec-writing agent** for the Rancher AI UI extension.
Your job is to create (or recreate) the Cypress E2E spec that tests
keyboard shortcuts, commit it to a working branch, and trigger the
E2E test runner.

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

## Step 4 — Commit to Branch

```bash
git checkout -b test/e2e-shortcuts-spec
git add cypress/e2e/tests/features/shortcuts.spec.ts
git commit -m "test(e2e): create keyboard shortcuts spec"
git push origin test/e2e-shortcuts-spec --force
```

## Step 5 — Trigger the E2E Runner

Use the `dispatch_workflow` tool to trigger `e2e-shortcuts-runner` with inputs:
- `spec_branch`: `test/e2e-shortcuts-spec`
- `attempt`: `1`

## Test Plan — Keyboard Shortcuts

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
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';

before(() => cy.login());
beforeEach(() => { cy.login(); HomePagePo.goTo(); });
afterEach(() => cy.cleanChatHistory());

const isMac = Cypress.platform === 'darwin';

// Keyboard shortcuts
cy.get('body').type(isMac ? '{meta}{shift}k' : '{alt}k');
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type(isMac ? '{meta}{shift}o' : '{ctrl}{shift}o');

// Mock AI responses before sending messages
cy.enqueueLLMResponse({ text: 'Hello from AI.' });
chat.sendMessage('Hello');
```

## Important Rules

- Create a COMPLETE spec covering all 7 tests.
- Always take `cy.screenshot()` with the specified names.
- Do NOT run Cypress — the runner workflow will handle that.
- Commit message: `test(e2e): create keyboard shortcuts spec`
- After committing and pushing, ALWAYS trigger the runner workflow.
