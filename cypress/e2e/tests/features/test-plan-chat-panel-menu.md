# Test Plan: Chat Panel Menu

**Feature area**: `chat-panel-menu`
**Date created**: 2026-05-20
**Plan type**: Initial

## Source Components Analyzed

- `pkg/rancher-ai-ui/components/header/ChatPanelMenu.vue` — ⋮ dropdown menu with download, shortcuts, and configure options
- `pkg/rancher-ai-ui/components/header/KeyboardShortcuts.vue` — keyboard shortcuts popover rendered via `TextLabelPopover`
- `pkg/rancher-ai-ui/components/popover/TextLabel.vue` — generic popover wrapper using `rc-dropdown`
- `pkg/rancher-ai-ui/components/panels/Header.vue` — header panel embedding `ChatPanelMenu`
- `pkg/rancher-ai-ui/pages/Chat.vue` — wires menu events to `downloadMessages`, `openShortcuts`, `routeToSettings`
- `pkg/rancher-ai-ui/composables/useKeyboardShortcutsComposable.ts` — keyboard shortcut handler

## Selector Notes

> `ChatPanelMenu` has **no `data-testid`** on the menu button. The dropdown trigger renders as
> an `rc-dropdown-trigger` with `icon icon-actions` inside a `.chat-console-menu-container` div.
> Scope to `[data-testid="rancher-ai-ui-chat-container"]` first, then use the `.icon-actions`
> class for the trigger and `cy.contains()` for menu items (avoid hardcoding HTML tags for
> `rc-dropdown-item` since its rendered tag is unknown).
>
> `KeyboardShortcuts` popover is rendered in `.v-popper__popper` (third-party teleported element).
> Use `cy.get('.v-popper__popper')` globally — **not** scoped via `this.self().find()` — since
> it is teleported outside the component tree.

---

## Test Cases

### Test 1: Menu button opens the ⋮ dropdown

**Description**: Clicking the actions icon in the chat header opens the dropdown menu showing the three available options.

**Preconditions**:
- User is logged in
- Chat panel is open and ready

**Steps**:
1. Open the chat panel via `chat.open()` + `chat.isReady()`
2. Click the `.icon-actions` button scoped inside `[data-testid="rancher-ai-ui-chat-container"]`

**Assertions**:
- The dropdown is visible (`.v-popper__popper` exists and is visible, or `cy.contains` finds the option text)
- Menu contains "Download" text
- Menu contains "View Keyboard Shortcuts" text
- Menu contains "Configure" text

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-container"] .icon-actions` — menu trigger
- `cy.contains('.v-popper__popper', 'Download')` — download option
- `cy.contains('.v-popper__popper', 'View Keyboard Shortcuts')` — shortcuts option
- `cy.contains('.v-popper__popper', 'Configure')` — configure option

**Screenshot**: `chat-panel-menu-test-1-menu-open`

---

### Test 2: "Keyboard shortcuts" menu option opens the shortcuts popover

**Description**: Clicking "Keyboard shortcuts" in the ⋮ menu opens a popover listing all keyboard shortcuts.

**Preconditions**:
- User is logged in
- Chat panel is open and ready
- ⋮ menu is open

**Steps**:
1. Open chat panel
2. Wait for ready state
3. Click `.icon-actions` to open menu
4. Click the "View Keyboard Shortcuts" option inside the popper

**Assertions**:
- A shortcuts popover appears (`.v-popper__popper` with `.shortcuts-title`)
- The popover contains the shortcuts title text
- The popover lists at least one shortcut row (`.shortcuts-row`)
- Each row contains a `.shortcuts-action` label and a `.shortcuts-key` badge

**Selectors**:
- `cy.contains('.v-popper__popper', 'View Keyboard Shortcuts')` — the menu item
- `.v-popper__popper .shortcuts-title` — popover title
- `.v-popper__popper .shortcuts-row` — shortcut rows

**Screenshot**: `chat-panel-menu-test-2-shortcuts-popover`

---

### Test 3: Shortcuts popover lists the correct shortcut actions

**Description**: The keyboard shortcuts popover shows all documented shortcuts: Open/Close chat, New chat, Copy last response, Toggle history, Delete chat, Navigate history.

**Preconditions**:
- Shortcuts popover is open (via ⋮ menu → Keyboard shortcuts)

**Steps**:
1. Open chat panel, click ⋮ menu, click "Keyboard shortcuts"
2. Inspect the popover content

**Assertions**:
- Popover contains text for each shortcut action:
  - "Navigate history" (or the translated equivalent)
  - "Open / Close chat"
  - "New chat"
  - "Copy last response"
  - "Toggle history"
  - "Delete chat"
- Each shortcut row has a keyboard key badge (`.shortcuts-key`)

**Selectors**:
- `.v-popper__popper .shortcuts-row` — iterate or count rows (should be ≥ 6)
- `.v-popper__popper .shortcuts-action` — action label text

**Screenshot**: `chat-panel-menu-test-3-shortcuts-content`

---

### Test 4: "Configure" menu option navigates to the AI settings page

**Description**: Clicking "Configure" in the ⋮ menu closes the chat and navigates to the AI settings configuration page.

**Preconditions**:
- User is logged in
- Chat panel is open and ready

**Steps**:
1. Open chat panel and wait for ready state
2. Open the ⋮ menu
3. Click "Configure"

**Assertions**:
- The URL changes to the AI settings route (contains `/ai-assistant` or `/settings`)
- The settings page heading "AI Assistant Configuration" is visible

**Selectors**:
- `cy.contains('.v-popper__popper', 'Configure')` — configure menu item
- `cy.contains('AI Assistant Configuration')` — settings page title

**Screenshot**: `chat-panel-menu-test-4-configure-navigation`

---

### Test 5: "Download" menu option triggers a file download

**Description**: Clicking "Download" in the ⋮ menu triggers a download of the current chat conversation.

**Preconditions**:
- User is logged in
- Chat panel is open and ready
- At least one message exists in the chat

**Steps**:
1. Mock an LLM response and send a message to ensure chat history exists
2. Open the ⋮ menu
3. Intercept the download via `cy.window().then(win => cy.stub(win, 'URL').as('download'))`, or use `cy.readFile` after download
4. Click "Download"

**Assertions**:
- No JavaScript error is thrown
- The chat panel remains open (download is a background operation)
- `downloadMessages` function was invoked (verified indirectly by no navigation occurring)

**Selectors**:
- `cy.contains('.v-popper__popper', 'Download')` — download menu item
- `[data-testid="rancher-ai-ui-chat-container"]` — still present after download

**Screenshot**: `chat-panel-menu-test-5-download-chat`

---

### Test 6: Keyboard shortcut Ctrl+Shift+O (New chat) creates a new chat

**Description**: Pressing `Ctrl+Shift+O` (Linux/Windows) while the chat panel is focused starts a new chat session, clearing messages.

**Preconditions**:
- User is logged in
- Chat panel is open and ready
- A welcome message exists (id=1)

**Steps**:
1. Open chat panel and wait for ready state
2. Enqueue a mock LLM response and send a message
3. Verify a user message (id=2) and AI response (id=3) exist
4. Press `{ctrl}{shift}o` on `[data-testid="rancher-ai-ui-chat-container"]`

**Assertions**:
- Messages are cleared; only the new welcome message (id=1) remains
- `chat.getMessage(2)` does not exist

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-container"]` — keyboard target
- `[data-testid="rancher-ai-ui-chat-message-box-1"]` — welcome message still present
- `[data-testid="rancher-ai-ui-chat-message-box-2"]` — should not exist after reset

**Screenshot**: `chat-panel-menu-test-6-new-chat-shortcut`

---

### Test 7: Keyboard shortcut Ctrl+Shift+S (Toggle history) opens history panel

**Description**: Pressing `Ctrl+Shift+S` while the chat panel is focused toggles the history panel visibility.

**Preconditions**:
- User is logged in
- Chat panel is open and ready
- History panel is closed

**Steps**:
1. Open chat panel and wait for ready state
2. Verify history is closed
3. Press `{ctrl}{shift}s` on `[data-testid="rancher-ai-ui-chat-container"]`

**Assertions**:
- History panel becomes visible (`history.isOpen()`)
4. Press `{ctrl}{shift}s` again
- History panel closes (`history.isClosed()`)

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-container"]` — keyboard target
- History panel selector via existing `HistoryPo.isOpen()` / `isClosed()`

**Screenshot**: `chat-panel-menu-test-7-toggle-history-shortcut`

---

### Test 8: Keyboard shortcut Ctrl+Shift+Backspace (Delete chat) shows delete confirmation

**Description**: Pressing `Ctrl+Shift+Backspace` while the chat panel is focused opens the delete confirmation dialog.

**Preconditions**:
- User is logged in
- Chat panel is open and ready

**Steps**:
1. Open chat panel and wait for ready state
2. Press `{ctrl}{shift}{backspace}` on `[data-testid="rancher-ai-ui-chat-container"]`

**Assertions**:
- The delete confirmation dialog appears
- `DeleteChatPromptPo` confirm button is visible (wraps `[data-testid="card"].prompt-remove` → `prompt-remove-confirm-button`)

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-container"]` — keyboard target
- `DeleteChatPromptPo` from `@/cypress/e2e/po/dialog/delete-chat.po` — call `.confirm()` to assert and click

**Screenshot**: `chat-panel-menu-test-8-delete-shortcut-dialog`

---

### Test 9: Keyboard shortcut Ctrl+Shift+C (Copy last message) copies AI response

**Description**: Pressing `Ctrl+Shift+C` copies the last AI assistant message to the clipboard.

**Preconditions**:
- User is logged in
- Chat panel is open and ready
- At least one AI response exists

**Steps**:
1. Open chat panel, enqueue a mock response, send a message, wait for response
2. Grant clipboard-write permission via `cy.wrap(Cypress.automation('remote:debugger:protocol', ...))`  
   or use `cy.window().then(win => cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite'))`
3. Press `{ctrl}{shift}c` on `[data-testid="rancher-ai-ui-chat-container"]`

**Assertions**:
- Clipboard stub was called with the text of the last AI response

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-container"]` — keyboard target

**Screenshot**: `chat-panel-menu-test-9-copy-last-message`

---

## Page Objects Needed

### New PO: `ChatPanelMenuPo` (suggested: `cypress/e2e/po/chat-panel-menu.po.ts`)

Encapsulate menu interactions to keep specs clean:

```typescript
import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class ChatPanelMenuPo extends ComponentPo {
  constructor() {
    // Scope to the chat container; menu trigger is inside .chat-console-menu-container
    super('[data-testid="rancher-ai-ui-chat-container"]');
  }

  /** Click the ⋮ menu trigger (icon-actions) */
  openMenu() {
    return this.self().find('.icon-actions').click();
  }

  /** Click a menu option by its visible text.
   *  NOTE: rc-dropdown-item renders with an unknown HTML tag — do NOT hardcode element type.
   */
  clickOption(label: string) {
    // The popper is teleported outside the component tree — use global selector
    return cy.contains('.v-popper__popper', label).click();
  }

  /** Returns the shortcuts popover element */
  shortcutsPopover() {
    return cy.get('.v-popper__popper').find('.shortcuts');
  }

  shortcutsTitle() {
    return cy.get('.v-popper__popper').find('.shortcuts-title');
  }

  shortcutsRows() {
    return cy.get('.v-popper__popper').find('.shortcuts-row');
  }
}
```

### Existing POs to reuse

| PO | Import | Methods used |
|----|--------|-------------|
| `ChatPo` | `@/cypress/e2e/po/chat.po` | `open()`, `isReady()`, `getMessage()`, `sendMessage()` |
| `HistoryPo` | `@/cypress/e2e/po/history.po` | `isOpen()`, `isClosed()` |
| `SettingsPagePo` | `@/cypress/e2e/po/settings.po` | `waitForPage()` |

---

## Custom Commands

| Command | Used for |
|---------|----------|
| `cy.login()` | `beforeEach` authentication |
| `cy.enqueueLLMResponse({ text })` | Queue mock AI response before `sendMessage` (Tests 5, 6, 9) |
| `cy.cleanChatHistory()` | `afterEach` cleanup |

---

## Mock Data

- Tests 5, 6, 9: `cy.enqueueLLMResponse({ text: 'Hello from AI.' })` before sending a message
- No special API mocks needed beyond the standard LLM mock service

---

## Spec File Location

```
cypress/e2e/tests/features/chat-panel-menu.spec.ts
```

---

## Notes

- The ⋮ menu button has **no `data-testid`** — use `.icon-actions` scoped within the chat container.
- `rc-dropdown-item` renders with an unknown HTML tag; use `cy.contains('.v-popper__popper', 'text')`.
- The keyboard shortcuts popover (`.v-popper__popper`) is teleported outside the component tree — always use global `cy.get()` for it, never `.find()` on a scoped PO element.
- For clipboard tests, stub `window.navigator.clipboard.writeText` as some CI environments block real clipboard access.
