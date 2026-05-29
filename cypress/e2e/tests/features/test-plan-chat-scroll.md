# Test Plan: Chat Scroll

- **Feature Area**: `chat-scroll`
- **Date Created**: 2026-05-29
- **Plan Type**: Initial
- **Source Components Analyzed**:
  - `pkg/rancher-ai-ui/components/ScrollButton.vue`
  - `pkg/rancher-ai-ui/components/panels/Messages.vue`
  - `pkg/rancher-ai-ui/composables/useScrollComposable.ts`

---

## Overview

The chat panel contains a scroll-to-bottom button (`ScrollButton`) that appears
when the user has scrolled more than 150 px away from the bottom of the messages
container. Clicking it programmatically scrolls to the bottom and hides the button.
The panel also auto-scrolls when new messages arrive — but only if the user is
already at (or near) the bottom (`autoScrollEnabled`).

---

## Preconditions

- Rancher AI Service is installed and the WebSocket is ready
  (`[data-testid="rancher-ai-ui-chat-panel-ready"]` exists).
- Each test starts from the Rancher Home page after `cy.login()`.
- `cy.cleanChatHistory()` is called in `afterEach`.

---

## Test Cases

### Test 1: Scroll button is hidden for a short conversation

**Description**: When the message list fits entirely within the visible area,
the scroll button should not be rendered.

**Preconditions**:
- Navigate to `HomePagePo`.
- Open the chat panel.

**Steps**:
1. `cy.login()` (in `beforeEach`).
2. `HomePagePo.goTo()`.
3. `chat.open()` — wait for `[data-testid="rancher-ai-ui-chat-panel-ready"]`.
4. Wait for the welcome message to complete: `chat.getMessage(1).isCompleted()`.

**Assertions**:
- `chat.scrollButton().checkNotExists()` — scroll button is not present in the DOM.

**Selectors**:
- `[data-testid="rancher-ai-ui-scroll-button"]`

**Screenshot**: `chat-scroll-test-1-hidden-on-short-conversation`

---

### Test 2: Scroll button appears when user scrolls up in a long conversation

**Description**: After accumulating enough messages to overflow the chat panel,
scrolling up by more than 150 px should cause the scroll button to appear.

**Preconditions**:
- Navigate to `HomePagePo`.
- Open the chat panel.
- Enqueue and send several long AI responses to fill and overflow the panel.

**Steps**:
1. `cy.login()` (in `beforeEach`).
2. `HomePagePo.goTo()`.
3. `chat.open()` — wait for `[data-testid="rancher-ai-ui-chat-panel-ready"]`.
4. Wait for welcome message: `chat.getMessage(1).isCompleted()`.
5. Repeat 5 times (enough to overflow): enqueue a long response and send a message.
   ```typescript
   const longText = 'Lorem ipsum dolor sit amet, '.repeat(80);
   for (let i = 0; i < 5; i++) {
     cy.enqueueLLMResponse({ text: longText });
     chat.sendMessage(`Message ${i + 1}`);
     chat.getMessage(2 + i * 2 + 1).isCompleted();
   }
   ```
6. Scroll the messages container to the top:
   `cy.get('[data-testid="rancher-ai-ui-chat-console"]').scrollTo('top')`.

**Assertions**:
- `chat.scrollButton().checkExists()` — scroll button is visible.

**Selectors**:
- `[data-testid="rancher-ai-ui-scroll-button"]`
- `[data-testid="rancher-ai-ui-chat-console"]` (messages container)

**Screenshot**: `chat-scroll-test-2-visible-when-scrolled-up`

---

### Test 3: Clicking scroll button scrolls to bottom and hides the button

**Description**: When the scroll button is visible and the user clicks it,
the panel scrolls to the bottom and the button disappears.

**Preconditions**:
- Same setup as Test 2 (long conversation, scrolled to top so button is visible).

**Steps**:
1. Perform all steps from Test 2 to arrive at a state where the scroll button is visible.
2. Assert button exists: `chat.scrollButton().checkExists()`.
3. Click the scroll button: `chat.scrollButton().self().click()`.

**Assertions**:
- `chat.scrollButton().checkNotExists()` — button disappears after scrolling to bottom.
- The last AI message is visible in the viewport (Cypress scrollIntoView assertion can be used as proxy).

**Selectors**:
- `[data-testid="rancher-ai-ui-scroll-button"]`

**Screenshot**: `chat-scroll-test-3-button-hidden-after-click`

---

### Test 4: Auto-scroll when new AI message arrives (user is at bottom)

**Description**: When the user is at the bottom of the chat and a new AI
response streams in, the panel auto-scrolls so the latest content is always
visible and the scroll button does not appear.

**Preconditions**:
- Navigate to `HomePagePo`.
- Open the chat panel.
- Create a moderately long conversation (3 exchanges) so the list has content.

**Steps**:
1. `cy.login()` (in `beforeEach`).
2. `HomePagePo.goTo()`.
3. `chat.open()` — wait for `[data-testid="rancher-ai-ui-chat-panel-ready"]`.
4. Welcome message: `chat.getMessage(1).isCompleted()`.
5. Enqueue and send 3 exchanges with reasonably long responses:
   ```typescript
   const mediumText = 'Some AI response text. '.repeat(20);
   for (let i = 0; i < 3; i++) {
     cy.enqueueLLMResponse({ text: mediumText });
     chat.sendMessage(`Question ${i + 1}`);
     chat.getMessage(2 + i * 2 + 1).isCompleted();
   }
   ```
6. Do NOT scroll the container — user remains at the bottom.

**Assertions**:
- `chat.scrollButton().checkNotExists()` — button never appears while user stays at bottom.
- The last AI message is completed: `chat.getMessage(7).isCompleted()`.

**Selectors**:
- `[data-testid="rancher-ai-ui-scroll-button"]`

**Screenshot**: `chat-scroll-test-4-no-button-when-auto-scrolling`

---

### Test 5: Auto-scroll is suppressed when user has scrolled up

**Description**: When the user has scrolled up (and the scroll button is
visible), a new incoming AI response should NOT force the view back to the
bottom — the scroll button remains visible.

**Preconditions**:
- Long conversation (same setup as Test 2) with the panel scrolled to the top.

**Steps**:
1. `cy.login()` (in `beforeEach`).
2. `HomePagePo.goTo()`.
3. `chat.open()` — wait for `[data-testid="rancher-ai-ui-chat-panel-ready"]`.
4. Welcome message: `chat.getMessage(1).isCompleted()`.
5. Send 5 messages (same as Test 2) to overflow the panel.
6. Scroll to top so the scroll button is visible:
   `cy.get('[data-testid="rancher-ai-ui-chat-console"]').scrollTo('top')`.
7. Assert button is present: `chat.scrollButton().checkExists()`.
8. Enqueue and send one more message while scrolled up:
   ```typescript
   cy.enqueueLLMResponse({ text: 'Lorem ipsum dolor sit amet, '.repeat(80) });
   chat.sendMessage('One more message');
   ```
9. Wait for the response to complete: `chat.getMessage(13).isCompleted()`.

**Assertions**:
- `chat.scrollButton().checkExists()` — scroll button remains visible (auto-scroll was suppressed).

**Selectors**:
- `[data-testid="rancher-ai-ui-scroll-button"]`
- `[data-testid="rancher-ai-ui-chat-console"]`

**Screenshot**: `chat-scroll-test-5-button-stays-when-user-scrolled-up`

---

### Test 6: Scroll button is not shown when chat panel is disabled

**Description**: The `ScrollButton` has `v-if="fastScrollEnabled && !props.disabled"`.
When the chat is in a disabled/connecting state, the button must not appear even if
there is scrollable content. This tests the guard condition in `Messages.vue`.

**Preconditions**:
- `cy.installRancherAIService({ waitForAIServiceReady: false })` to catch the
  connecting window before the panel is ready.

**Steps**:
1. `cy.login()` (in `beforeEach`).
2. `HomePagePo.goTo()`.
3. Install the service without waiting: `cy.installRancherAIService({ waitForAIServiceReady: false })`.
4. Open the chat before it is ready: `chat.rancherHeader.askLizButton().click()`.
5. Assert the panel is not ready: `chat.isNotReady()`.

**Assertions**:
- `chat.scrollButton().checkNotExists()` — scroll button never appears in disabled/connecting state.

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-panel-not-ready"]`
- `[data-testid="rancher-ai-ui-scroll-button"]`

**Notes**: This test requires its own `afterEach` that uninstalls and reinstalls
the AI service to restore the environment for subsequent tests. Isolate it in a
nested `describe` block:

```typescript
describe('disabled state', () => {
  afterEach(() => {
    cy.uninstallRancherAIService();
    cy.installRancherAIService();
  });
  it('Scroll button is not shown when chat is in connecting state', () => {
    cy.installRancherAIService({ waitForAIServiceReady: false });
    // ...
  });
});
```

**Screenshot**: `chat-scroll-test-6-no-button-when-disabled`

---

## Page Objects Needed

### Existing POs (reuse)

| PO | Import Path | Usage |
|----|-------------|-------|
| `ChatPo` | `@/cypress/e2e/po/chat.po` | `chat.open()`, `chat.getMessage()`, `chat.scrollButton()`, `chat.sendMessage()` |
| `HomePagePo` | `@rancher/cypress/e2e/po/pages/home.po` | `HomePagePo.goTo()` |

### New PO Methods Required

`chat.scrollButton()` **already exists** in `ChatPo` and returns
`new ComponentPo('[data-testid="rancher-ai-ui-scroll-button"]')`.
No new PO files or methods are needed.

---

## Custom Commands

| Command | Description |
|---------|-------------|
| `cy.login()` | Login (place in `beforeEach`) |
| `cy.cleanChatHistory()` | Clear chat history (place in `afterEach`) |
| `cy.enqueueLLMResponse({ text })` | Queue AI mock response |
| `cy.installRancherAIService({ waitForAIServiceReady: false })` | Install AI service without waiting for WS ready (Test 6 only) |
| `cy.uninstallRancherAIService()` | Uninstall AI service (Test 6 teardown only) |

---

## Mock Data

- Long response text: `'Lorem ipsum dolor sit amet, '.repeat(80)` — to generate
  enough content to overflow the chat panel.
- Medium response text: `'Some AI response text. '.repeat(20)` — for Tests 4-5.
- No special mock data needed for Tests 1, 3, 6.

---

## Spec File Location

```
cypress/e2e/tests/features/chat-scroll.spec.ts
```
