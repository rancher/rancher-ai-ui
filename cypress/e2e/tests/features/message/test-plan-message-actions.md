# E2E Test Plan: Message Actions

**Date Created:** 2026-05-27
**Feature Area:** `message-actions`
**Plan Type:** Initial

## Source Components Analyzed

- `pkg/rancher-ai-ui/components/message/index.vue` — per-message action buttons (copy, edit, resend, thinking toggle)
- `pkg/rancher-ai-ui/components/BubbleButton.vue` — action button with optional success-checkmark feedback
- `pkg/rancher-ai-ui/composables/useInputComposable.ts` — `updateInput()` / `focusConsoleInput()` used by edit-before-resend

## Existing Coverage

None. The existing `message.spec.ts` covers message rendering (welcome, context, thinking label, list of resources, source links, confirm/cancel). The `chat.spec.ts` uses `resendButton()` at line 751 but **only to assert scroll behavior** — it does not test the resend feature itself. Copy and edit-before-resend have zero coverage.

---

## Test Cases

### Test 1: Copy AI response to clipboard

**Description:** Clicking the copy button on a completed AI response copies its text to the clipboard. The button briefly shows a success checkmark.

**Preconditions:**
- Logged in
- Chat panel open and ready (welcome message at ID 1 is completed)
- Clipboard write access stubbed via `cy.window().then(win => cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite'))`

**Steps:**
1. Enqueue an AI response: `cy.enqueueLLMResponse({ text: 'The copy response text.' })`
2. Send a user message: `chat.sendMessage('Copy this message')`
3. Wait for the AI response (message ID 3) to complete
4. Click the copy button on the AI response: `chat.getMessage(3).copyButton().click()`

**Assertions:**
- `@clipboardWrite` stub should have been called with `'The copy response text.'`
- Screenshot: `message-actions-test-1-copy-ai-response`

**Selectors:**
- `[data-testid="rancher-ai-ui-chat-message-box-3"]` → AI response message
- `[data-testid="rancher-ai-ui-bubble-btn-icon-copy"]` inside message → copy button (via `BubbleButtonPo('icon-copy', this.self())`)

---

### Test 2: Copy button shows success checkmark feedback

**Description:** After clicking the copy button, the icon briefly changes to a checkmark (success state via `showSuccess: true` on BubbleButton), then reverts.

**Preconditions:**
- Logged in
- Chat panel open and ready
- Clipboard write access stubbed

**Steps:**
1. Enqueue response: `cy.enqueueLLMResponse({ text: 'Feedback test.' })`
2. Send message: `chat.sendMessage('Test feedback')`
3. Wait for AI response (ID 3) to complete
4. Click the copy button on the AI response
5. Immediately assert the icon has switched to checkmark

**Assertions:**
- After clicking, `[data-testid="rancher-ai-ui-bubble-btn-icon-copy"]` contains `.icon-checkmark` (success state, auto-reverts after ~1 s)
- Screenshot: `message-actions-test-2-copy-success-checkmark`

**Selectors:**
- `[data-testid="rancher-ai-ui-bubble-btn-icon-copy"] .icon` — the `<i>` inside the button, class toggles between `icon-copy` and `icon-checkmark`

---

### Test 3: Copy user message to clipboard

**Description:** The copy button also appears on user messages. Clicking it copies the user's message text.

**Preconditions:**
- Logged in
- Chat panel open and ready
- Clipboard write access stubbed

**Steps:**
1. Enqueue response: `cy.enqueueLLMResponse({ text: 'Any response.' })`
2. Send message: `chat.sendMessage('User copy test')`
3. Wait for AI response (ID 3) to complete
4. Click the copy button on the user message (ID 2): `chat.getMessage(2).copyButton().click()`

**Assertions:**
- `@clipboardWrite` stub should have been called with `'User copy test'`
- Screenshot: `message-actions-test-3-copy-user-message`

**Selectors:**
- `[data-testid="rancher-ai-ui-chat-message-box-2"]` → user message
- `[data-testid="rancher-ai-ui-bubble-btn-icon-copy"]` inside message → copy button

---

### Test 4: Edit-before-resend populates textarea

**Description:** Clicking the edit button (pencil icon) on a user message copies that message's text into the input textarea, ready for editing before re-sending.

**Preconditions:**
- Logged in
- Chat panel open and ready (welcome message ID 1 completed)

**Steps:**
1. Enqueue response: `cy.enqueueLLMResponse({ text: 'AI reply.' })`
2. Send message: `chat.sendMessage('Original prompt text')`
3. Wait for AI response (ID 3) to complete
4. Click the edit button on the user message (ID 2): `chat.getMessage(2).editButton().click()`

**Assertions:**
- The textarea (`[data-testid="rancher-ai-ui-chat-input-textarea"]`) should contain `'Original prompt text'`
- The textarea should be focused
- Screenshot: `message-actions-test-4-edit-before-resend-textarea`

**Selectors:**
- `[data-testid="rancher-ai-ui-chat-message-box-2"]` → user message
- `[data-testid="rancher-ai-ui-bubble-btn-icon-edit"]` inside message → edit button
- `[data-testid="rancher-ai-ui-chat-input-textarea"]` → input textarea

---

### Test 5: Edit-before-resend button shows success checkmark

**Description:** The edit button has `showSuccess: true`, so it briefly shows a checkmark after being clicked.

**Preconditions:**
- Logged in
- Chat panel open and ready
- One message exchange completed (user ID 2, AI ID 3)

**Steps:**
1. Enqueue response + send message (same as Test 4)
2. Click the edit button on the user message (ID 2)
3. Immediately assert the icon has switched to checkmark

**Assertions:**
- After clicking, `[data-testid="rancher-ai-ui-bubble-btn-icon-edit"] .icon` contains class `icon-checkmark`
- Screenshot: `message-actions-test-5-edit-success-checkmark`

**Selectors:**
- `[data-testid="rancher-ai-ui-bubble-btn-icon-edit"] .icon` — icon inside the edit button

---

### Test 6: Resend button re-sends the user message

**Description:** Clicking the resend button (re-send icon) on a user message submits that message again to the AI, producing a new AI response.

**Preconditions:**
- Logged in
- Chat panel open and ready
- One message exchange completed (user ID 2, AI ID 3)

**Steps:**
1. Enqueue first response: `cy.enqueueLLMResponse({ text: 'First reply.' })`
2. Send message: `chat.sendMessage('Resend this prompt')`
3. Wait for AI response (ID 3) to complete
4. Enqueue second response: `cy.enqueueLLMResponse({ text: 'Resent reply.' })`
5. Click the resend button on the user message (ID 2): `chat.getMessage(2).resendButton().click()`

**Assertions:**
- A new user message (ID 4) appears containing `'Resend this prompt'`
- A new AI response (ID 5) appears and completes containing `'Resent reply.'`
- Screenshot: `message-actions-test-6-resend-message`

**Selectors:**
- `[data-testid="rancher-ai-ui-chat-message-box-2"]` → original user message
- `[data-testid="rancher-ai-ui-bubble-btn-icon-backup"]` inside message → resend button
- `[data-testid="rancher-ai-ui-chat-message-box-4"]` → re-sent user message
- `[data-testid="rancher-ai-ui-chat-message-box-5"]` → new AI response

---

### Test 7: Message action buttons not shown on pending-confirmation messages

**Description:** While a confirmation (system-request) message is pending, user messages show no edit or resend buttons (the `pendingConfirmation` prop disables them).

**Preconditions:**
- Logged in
- Chat panel open and ready

**Steps:**
1. Enqueue a response with a confirmation MCP tool action:
   ```typescript
   cy.enqueueLLMResponse({
     mcpTool: {
       name: 'getKubernetesResource',
       args: { kind: 'Pod', name: 'test-pod', namespace: 'default' }
     }
   })
   ```
2. Send a user message: `chat.sendMessage('Show pending confirmation')`
3. Wait for the confirmation message to appear

**Assertions:**
- `[data-testid="rancher-ai-ui-bubble-btn-icon-edit"]` should NOT exist within the user message (ID 2) while confirmation is pending
- `[data-testid="rancher-ai-ui-bubble-btn-icon-backup"]` should NOT exist within the user message (ID 2) while confirmation is pending
- Screenshot: `message-actions-test-7-actions-hidden-pending-confirmation`

**Selectors:**
- `[data-testid="rancher-ai-ui-chat-message-box-2"]` → user message
- `[data-testid="rancher-ai-ui-chat-message-confirmation-confirm-button"]` → confirm button (assert it exists to verify pending state)

---

## Page Objects Needed

### New PO additions (to `message.po.ts`)

Add the following methods to `RawMessagePo`:

```typescript
copyButton() {
  return new BubbleButtonPo('icon-copy', this.self());
}

editButton() {
  return new BubbleButtonPo('icon-edit', this.self());
}
```

`resendButton()` already exists.

### Existing POs Reused

| PO | Import Path | Usage |
|----|-------------|-------|
| `ChatPo` | `@/cypress/e2e/po/chat.po` | `open()`, `getMessage()`, `sendMessage()`, `console()` |
| `MessagePo` | `@/cypress/e2e/po/message.po` | `copyButton()`, `editButton()`, `resendButton()`, `isCompleted()`, `containsText()` |
| `BubbleButtonPo` | `@/cypress/e2e/po/components/bubble-button.po` | `click()` |
| `ConsolePo` | `@/cypress/e2e/po/console.po` | `textarea()` |
| `HomePagePo` | `@rancher/cypress/e2e/po/pages/home.po` | `goTo()` |

---

## Custom Commands

| Command | Usage |
|---------|-------|
| `cy.login()` | In `beforeEach` |
| `cy.cleanChatHistory()` | In `afterEach` |
| `cy.enqueueLLMResponse({ text })` | Before each `sendMessage` call |

No new custom commands are needed.

---

## Mock Data

- Simple text responses for copy/edit/resend tests: `'The copy response text.'`, `'AI reply.'`, `'First reply.'`, `'Resent reply.'`
- MCP tool for Test 7: `getKubernetesResource` with `{ kind: 'Pod', name: 'test-pod', namespace: 'default' }`

---

## Clipboard Stubbing

Copy tests require stubbing `navigator.clipboard.writeText` before the chat is opened or the message is sent:

```typescript
cy.window().then((win) => {
  cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite');
});
```

Then assert with `cy.get('@clipboardWrite').should('have.been.calledWith', 'expected text')`.

This stub must be set up **after** `cy.login()` and page navigation but **before** `chat.open()` so the window object is available.

---

## Spec File Location

`cypress/e2e/tests/features/message-actions.spec.ts`

---

## Notes

- Bubble button actions (copy, edit, resend) are **CSS hover-gated** — `.chat-msg-bubble-actions` has `opacity: 0` by default and `opacity: 1` on hover. The `BubbleButtonPo.click()` already uses `{ force: true }` so no additional hover triggering is needed.
- The edit button (`icon-edit`) is only rendered for **user messages** (`props.message.role === RoleEnum.User && !pendingConfirmation`).
- The resend button (`icon-backup`) is only rendered for **user messages** and not during pending confirmation.
- The copy button (`icon-copy`) is rendered for **all messages** (user and AI).
- `BubbleButton` with `showSuccess: true` sets a `success` ref to `true` on click, switches the icon class to `icon-checkmark`, then clears it after 1 second via `setTimeout`.
