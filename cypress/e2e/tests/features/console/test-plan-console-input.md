# E2E Test Plan: Console Input

- **Feature area**: console-input
- **Date created**: 2026-05-26
- **Plan type**: Initial
- **Source components analyzed**:
  - `pkg/rancher-ai-ui/components/panels/Console.vue` — main console panel with prompt textarea, prompt history navigation, tab completion
  - `pkg/rancher-ai-ui/components/console/LlmModelLabel.vue` — LLM name/model label
  - `pkg/rancher-ai-ui/components/console/VerifyResultsDisclaimer.vue` — disclaimer popover (uses `TextLabel.vue`)
  - `pkg/rancher-ai-ui/components/popover/TextLabel.vue` — popover trigger/wrapper using RcDropdown
  - `pkg/rancher-ai-ui/composables/useInputComposable.ts` — input state management

---

## Overview

The Console panel (`Console.vue`) provides the AI chat input area. Beyond basic
message sending (covered in existing specs), it includes:

- **Prompt history navigation**: pressing ArrowUp/ArrowDown when the textarea
  is empty fills in previous/next user messages as a ghost autocomplete overlay.
- **Tab completion**: pressing Tab while the ghost overlay is shown copies the
  suggestion into the textarea input.
- **LLM model label**: a small label below the textarea showing which LLM model
  is active (e.g., "Uses AI, running ollama (llama3.2)").
- **Verify results disclaimer**: a clickable "Verify the results." link that
  opens a popover with three disclaimer sections.

None of these behaviors are covered by any existing spec file.

---

## Test Cases

### Test 1: ArrowUp fills in the last sent message as autocomplete

**Description**: When the textarea is empty and the user presses ArrowUp, the
last sent user message should appear as a ghost autocomplete overlay with a
"Tab" badge.

**Preconditions**:
- Logged in
- Chat panel open and ready
- At least one user message has been sent (enqueue LLM response, send message)

**Steps**:
1. `cy.enqueueLLMResponse({ text: 'Hello from AI.' })`
2. `chat.sendMessage('First prompt')`
3. Wait for AI response to complete
4. Clear the textarea (it should already be empty after sending)
5. Press ArrowUp in the textarea:
   ```typescript
   cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');
   ```

**Assertions**:
- The `.chat-input-complete` overlay should be visible
- The overlay text should contain `'First prompt'`
- The `Tab` badge should be visible:
  ```typescript
  cy.get('[data-testid="rancher-ai-ui-chat-console"]')
    .find('.chat-input-complete')
    .should('be.visible')
    .and('contain.text', 'First prompt');
  cy.get('[data-testid="rancher-ai-ui-chat-console"]')
    .find('.tab-label')
    .should('be.visible')
    .and('contain.text', 'Tab');
  ```

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-input-textarea"]` — the prompt textarea
- `[data-testid="rancher-ai-ui-chat-console"] .chat-input-complete` — ghost overlay
- `[data-testid="rancher-ai-ui-chat-console"] .tab-label` — Tab badge

**Screenshot**: `console-input-test-1-arrowup-shows-autocomplete`

---

### Test 2: Tab accepts the autocomplete suggestion

**Description**: When the autocomplete overlay is shown (after pressing ArrowUp
with empty textarea), pressing Tab should copy the suggestion into the textarea
input so it can be edited/sent.

**Preconditions**:
- Same as Test 1: at least one user message sent
- ArrowUp pressed to display the autocomplete overlay

**Steps**:
1. `cy.enqueueLLMResponse({ text: 'Hello from AI.' })`
2. `chat.sendMessage('First prompt')`
3. Wait for AI response to complete
4. Press ArrowUp in the textarea to show the autocomplete overlay
5. Press Tab to accept the suggestion:
   ```typescript
   cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]')
     .type('{tab}', { force: true });
   ```

**Assertions**:
- The `.chat-input-complete` overlay should no longer be visible
- The textarea should contain `'First prompt'`:
  ```typescript
  cy.get('[data-testid="rancher-ai-ui-chat-console"]')
    .find('.chat-input-complete')
    .should('not.exist');
  cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]')
    .should('have.value', 'First prompt');
  ```

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-input-textarea"]`
- `[data-testid="rancher-ai-ui-chat-console"] .chat-input-complete`

**Screenshot**: `console-input-test-2-tab-accepts-autocomplete`

---

### Test 3: Multiple ArrowUp presses navigate to older messages

**Description**: Pressing ArrowUp multiple times navigates back through the
full prompt history (most recent → oldest).

**Preconditions**:
- Logged in
- At least two user messages have been sent in the current chat

**Steps**:
1. Send two messages in sequence:
   ```typescript
   cy.enqueueLLMResponse({ text: 'AI response 1.' });
   chat.sendMessage('First prompt');
   chat.getMessage(3).isCompleted();
   cy.enqueueLLMResponse({ text: 'AI response 2.' });
   chat.sendMessage('Second prompt');
   chat.getMessage(5).isCompleted();
   ```
2. Press ArrowUp once → expect overlay text `'Second prompt'`
3. Press ArrowUp again → expect overlay text `'First prompt'`
4. Press ArrowUp again → should remain at `'First prompt'` (no older messages)

**Assertions** (after each ArrowUp):
```typescript
// After 1st ArrowUp
cy.get('[data-testid="rancher-ai-ui-chat-console"]')
  .find('.chat-input-complete')
  .should('contain.text', 'Second prompt');

// After 2nd ArrowUp
cy.get('[data-testid="rancher-ai-ui-chat-console"]')
  .find('.chat-input-complete')
  .should('contain.text', 'First prompt');

// After 3rd ArrowUp (clamped at oldest)
cy.get('[data-testid="rancher-ai-ui-chat-console"]')
  .find('.chat-input-complete')
  .should('contain.text', 'First prompt');
```

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-input-textarea"]`
- `[data-testid="rancher-ai-ui-chat-console"] .chat-input-complete`

**Screenshot**: `console-input-test-3-multiple-arrowup-older-messages`

---

### Test 4: ArrowDown navigates forward in prompt history

**Description**: After pressing ArrowUp to show an older message, ArrowDown
navigates back toward the most recent message. Pressing ArrowDown past the
most recent message clears the autocomplete overlay.

**Preconditions**:
- At least two messages sent (same as Test 3)
- Two ArrowUp presses done so overlay shows `'First prompt'`

**Steps**:
1. Send two messages (same as Test 3 setup)
2. Press ArrowUp twice → overlay shows `'First prompt'`
3. Press ArrowDown once → overlay should show `'Second prompt'`
4. Press ArrowDown again → overlay should disappear (back to empty state)

**Assertions**:
```typescript
// After ArrowDown (to Second prompt)
cy.get('[data-testid="rancher-ai-ui-chat-console"]')
  .find('.chat-input-complete')
  .should('contain.text', 'Second prompt');

// After another ArrowDown (past most recent → cleared)
cy.get('[data-testid="rancher-ai-ui-chat-console"]')
  .find('.chat-input-complete')
  .should('not.exist');
```

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-input-textarea"]`
- `[data-testid="rancher-ai-ui-chat-console"] .chat-input-complete`

**Screenshot**: `console-input-test-4-arrowdown-forward-navigation`

---

### Test 5: Typing clears the autocomplete overlay

**Description**: If the user presses ArrowUp (showing an autocomplete overlay)
and then starts typing, the overlay should disappear immediately as the user
is now entering new text (`onInputMessage` calls `clearCompleteTextHistory()`).

**Preconditions**:
- One user message sent
- ArrowUp pressed so overlay is visible

**Steps**:
1. Send one message
2. Press ArrowUp → overlay shows
3. Type a character in the textarea (simulating new user input):
   ```typescript
   cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('x');
   ```

**Assertions**:
```typescript
cy.get('[data-testid="rancher-ai-ui-chat-console"]')
  .find('.chat-input-complete')
  .should('not.exist');
```

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-input-textarea"]`
- `[data-testid="rancher-ai-ui-chat-console"] .chat-input-complete`

**Screenshot**: `console-input-test-5-typing-clears-autocomplete`

---

### Test 6: LLM model label is visible in the console footer

**Description**: Below the textarea there should be a small label displaying
the active LLM name and model in the format "Uses AI, running {name} ({model})."

**Preconditions**:
- Logged in
- Chat panel open and ready

**Steps**:
1. Open the chat panel
2. Wait for it to be ready

**Assertions**:
```typescript
cy.get('[data-testid="rancher-ai-ui-chat-console"]')
  .find('.llm-model-label')
  .should('be.visible')
  .and('contain.text', 'Uses AI, running');
```

**Notes**: The exact name/model depends on the environment configuration. The
test asserts the prefix `'Uses AI, running'` which is the i18n key
`ai.configurations.label` with pattern `"Uses AI, running {name} ({model})."`.

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-console"] .llm-model-label`

**Screenshot**: `console-input-test-6-llm-model-label`

---

### Test 7: Verify results disclaimer popover opens with correct content

**Description**: The "Verify the results." link in the console footer should
open a popover containing three disclaimer sections.

**Preconditions**:
- Logged in
- Chat panel open and ready

**Steps**:
1. Open the chat panel
2. Click the "Verify the results." link:
   ```typescript
   cy.get('[data-testid="rancher-ai-ui-chat-console"]')
     .contains('Verify the results.')
     .click();
   ```
3. The popover should appear (teleported to `.v-popper__popper`)

**Assertions**:
```typescript
cy.get('.v-popper__popper')
  .should('be.visible')
  .and('contain.text', 'Verify All Results')
  .and('contain.text', 'Use at Your Own Risk')
  .and('contain.text', 'Do Not Share Secrets');
```

**Notes**:
- The popover is rendered via `TextLabel.vue` which uses `RcDropdown`.
  The popper is teleported outside the chat container — use the global
  `.v-popper__popper` selector (NOT scoped with `.find()`).
- Exact i18n values from `en-us.yaml`:
  - `ai.configurations.verifyResults.button.label` = `"Verify the results."`
  - `ai.configurations.verifyResults.disclaimer.section1.title` = `"Verify All Results"`
  - `ai.configurations.verifyResults.disclaimer.section2.title` = `"Use at Your Own Risk"`
  - `ai.configurations.verifyResults.disclaimer.section3.title` = `"Do Not Share Secrets"`

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-console"]` + `cy.contains('Verify the results.')`
- `.v-popper__popper` (global — teleported)

**Screenshot**: `console-input-test-7-verify-results-popover`

---

## Page Objects Needed

### New PO: `ConsolePo` extension (or inline spec selectors)
The existing `ConsolePo` in `cypress/e2e/po/console.po.ts` has `textarea()` and
`sendMessage()`. The spec should add helper access methods via the PO or query
inline where acceptable.

**New methods to add to `ConsolePo`** (or expose from a new `ConsoleInputPo`):
- `autocompleteOverlay()` → `this.self().find('.chat-input-complete')`
- `tabBadge()` → `this.self().find('.tab-label')`
- `llmModelLabel()` → `this.self().find('.llm-model-label')`
- `verifyResultsLink()` → `this.self().contains('Verify the results.')`

### Existing POs to reuse
- `ChatPo` (`@/cypress/e2e/po/chat.po`) — `open()`, `isReady()`, `getMessage()`, `sendMessage()`
- `ConsolePo` (`@/cypress/e2e/po/console.po`) — `textarea()`

---

## Custom Commands

| Command | Usage |
|---------|-------|
| `cy.login()` | Authentication in `beforeEach` |
| `cy.enqueueLLMResponse({ text })` | Queue mock AI responses before sending messages |
| `cy.cleanChatHistory()` | Cleanup in `afterEach` |

---

## Mock Data

All tests that require a sent message must first enqueue an LLM response:
```typescript
cy.enqueueLLMResponse({ text: 'Mock AI response.' });
chat.sendMessage('User message');
```

No additional API mocks are needed beyond the standard mock agent setup.

---

## Spec File Location

```
cypress/e2e/tests/features/console-input.spec.ts
```

---

## Notes

- Tests 1–5 all exercise the prompt history / autocomplete feature. Group them
  in a `describe('Prompt history and autocomplete', ...)` block.
- Tests 6–7 exercise the console footer. Group in `describe('Console footer', ...)`.
- Use `cy.cleanChatHistory()` in `afterEach` at the top level to keep chat
  state clean between tests.
- The ArrowUp/ArrowDown keys only trigger history when the textarea value is
  **empty**. The `Tab` key with `{ force: true }` is needed because the
  textarea may intercept the event.
- The `.v-popper__popper` selector for the disclaimer popover must be used
  globally (not inside `.find()`) because Vue Popper teleports the dropdown
  outside the component tree.
