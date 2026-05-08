# E2E Test Plan: Context Selection Feature

- **Feature area**: `context`
- **Date created**: 2026-05-08
- **Plan type**: Initial
- **Source components analyzed**:
  - `pkg/rancher-ai-ui/components/context/SelectContext.vue`
  - `pkg/rancher-ai-ui/components/context/ContextTag.vue`
  - `pkg/rancher-ai-ui/components/panels/Context.vue`
  - `pkg/rancher-ai-ui/composables/useContextComposable.ts`
  - `pkg/rancher-ai-ui/store/context.ts`
  - `pkg/rancher-ai-ui/pages/Chat.vue` (integration point)
- **Existing coverage**: None — this is an initial plan. Note that `cypress/e2e/tests/features/message.spec.ts` contains one test ("Show context") that verifies a context tag appears on the *sent message*; it does not test the context selection panel interactions covered here.

---

## Overview

The **context** feature allows users to include Kubernetes context (cluster name,
namespace) in their AI prompts automatically based on the current page they are
viewing. A `Context` panel is rendered at the bottom of the chat console,
displaying the active context items as tags (`ContextTag`). Users can:

1. Deselect individual context tags to exclude them from the next prompt.
2. Re-add a tag via the **"Add context"** dropdown (`SelectContext`).
3. Reset all deselected tags with a **"Reset"** button.
4. See **"No context available"** when they are on a page with no context (e.g. Home).

Context is only visible when the AI service is active and the user has permissions.

---

## Test Cases

### Test 1: Context panel shows cluster tag on cluster-scoped page

**Description**: Verifies that when the chat is opened while on a workloads page
(which provides cluster context), a `ContextTag` for the `local` cluster is visible
in the Context panel.

**Preconditions**:
- User is logged in.
- Navigate to Workloads > Deployments for the `local` cluster.
- AI service is active.

**Steps**:
1. Navigate to `WorkloadsDeploymentsListPagePo('local', ...)` and wait for page.
2. Open the chat panel via `chat.open()`.
3. Wait for `chat.isReady()`.

**Assertions**:
- `[data-testid="rancher-ai-ui-context-tag-local"]` exists within the chat container.

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-container"]`
- `[data-testid="rancher-ai-ui-context-tag-local"]`

**Screenshot**: `context-test-1-cluster-tag-visible`

---

### Test 2: No context shown on Home page

**Description**: Verifies that no context tags appear when the chat is opened from the
Home page (non-cluster-scoped route).

**Preconditions**:
- User is logged in.
- On the Home page.

**Steps**:
1. `HomePagePo.goTo()`.
2. Open chat panel.
3. Wait for `chat.isReady()`.

**Assertions**:
- The `.no-context` span exists and contains text matching `ai.context.none` (the
  "No context available" message).
- No `[data-testid^="rancher-ai-ui-context-tag-"]` element is visible.

**Selectors**:
- `.no-context` (CSS class on the fallback span in `SelectContext`)

**Screenshot**: `context-test-2-no-context-home`

---

### Test 3: Deselect a context tag

**Description**: Verifies that clicking the remove button (×) on a `ContextTag`
deselects it, causing it to disappear from the panel.

**Preconditions**:
- On Workloads > Deployments (`local` cluster).
- Chat panel is open and ready with a `local` cluster context tag visible.

**Steps**:
1. Navigate to deployments page.
2. Open chat panel; verify `[data-testid="rancher-ai-ui-context-tag-local"]` is visible.
3. Within that context tag's parent `.vs__selected` wrapper, click the `.vs__deselect` button:
   `cy.get('[data-testid="rancher-ai-ui-context-tag-local"]').parent('.vs__selected').find('.vs__deselect').click()`

**Assertions**:
- `[data-testid="rancher-ai-ui-context-tag-local"]` no longer exists in the DOM.
- The `.context-reset` button becomes visible (because not all items are selected).

**Selectors**:
- `[data-testid="rancher-ai-ui-context-tag-local"]` → `.parent('.vs__selected')` → `.find('.vs__deselect')`
  _(Note: `data-testid` is on the inner `.tag-content` div; `.vs__deselect` is a sibling, so parent traversal is required)_
- `.context-reset`

**Screenshot**: `context-test-3-tag-deselected`

---

### Test 4: Re-add a context via the dropdown

**Description**: After deselecting a tag, re-add it via the "Add context" dropdown.

**Preconditions**:
- On Workloads > Deployments (`local` cluster).
- Chat is open; cluster tag has been deselected (Test 3 precondition).

**Steps**:
1. Navigate to deployments page and open chat.
2. Remove `local` context tag: `cy.get('[data-testid="rancher-ai-ui-context-tag-local"]').parent('.vs__selected').find('.vs__deselect').click()`.
3. Click the `.context-trigger` button ("Add context").
4. In the dropdown, click the item containing text `local`: `cy.get('.context-dropdown').contains('local').click()`

**Assertions**:
- `[data-testid="rancher-ai-ui-context-tag-local"]` reappears.
- `.context-reset` button disappears (all items now selected).

**Selectors**:
- `.context-trigger` — the dropdown trigger button
- `cy.get('.context-dropdown').contains('local')` — text-based selection without hardcoding the HTML tag (avoids relying on unverified element type for rc-dropdown-item)
- `[data-testid="rancher-ai-ui-context-tag-local"]`

**Screenshot**: `context-test-4-tag-readded`

---

### Test 5: Reset restores all deselected tags

**Description**: When multiple tags are deselected, the Reset button restores all of them.

**Preconditions**:
- On a page that provides both a cluster and at least one namespace context tag
  (e.g., Workloads > Deployments with a namespace filter active).
- Chat panel is open with multiple context tags visible.

**Steps**:
1. Navigate to a page with multiple context items.
2. Open chat; deselect at least one context tag via `.vs__deselect`.
3. Verify `.context-reset` is visible.
4. Click `.context-reset` button.

**Assertions**:
- All previously-visible `[data-testid^="rancher-ai-ui-context-tag-"]` elements reappear.
- `.context-reset` button disappears (all items re-selected).

**Selectors**:
- `.context-reset`
- `[data-testid^="rancher-ai-ui-context-tag-"]`

**Screenshot**: `context-test-5-reset-restores-all`

---

### Test 6: Deselected context is NOT included in sent message

**Description**: Verifies that when a user deselects the cluster context tag and sends
a message, the deselected context does not appear as a `user-context` tag on the
sent message.

**Preconditions**:
- On Workloads > Deployments (`local` cluster).
- Chat is open.

**Steps**:
1. Navigate to deployments page; open chat.
2. Wait for `chat.isReady()`.
3. Deselect the `local` cluster context tag.
4. Enqueue a mock LLM response.
5. Send a message via `chat.sendMessage(...)`.

**Assertions**:
- The user message element (`[data-testid="rancher-ai-ui-chat-message-box-2"]`)
  does **not** contain `[data-testid="rancher-ai-ui-context-tag-local"]`.

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-message-box-2"]`
- `[data-testid="rancher-ai-ui-context-tag-local"]` (should not exist)

**Mock data**:
- `cy.enqueueLLMResponse({ text: 'Response without cluster context.' })`

**Screenshot**: `context-test-6-deselected-not-in-message`

---

### Test 7: Selected context IS included in sent message

**Description**: Verifies that when context is selected (default state), it appears
as a `user-context` tag on the sent user message.

**Preconditions**:
- On Workloads > Deployments (`local` cluster).
- Chat is open with cluster context tag visible and selected.

**Steps**:
1. Navigate to deployments page; open chat.
2. Wait for `chat.isReady()`.
3. Enqueue a mock LLM response.
4. Send a message.
5. Wait for message response.

**Assertions**:
- `chat.getMessage(2).context('local')` exists (the sent message contains the
  cluster context tag with the `user-context` style).

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-message-box-2"]`
- `[data-testid="rancher-ai-ui-context-tag-local"]`

**Mock data**:
- `cy.enqueueLLMResponse({ text: 'Response with cluster context.' })`

**Screenshot**: `context-test-7-selected-context-in-message`

---

### Test 8: Context panel is disabled when AI service is not active

**Description**: When the AI service is not deployed/active, the context panel
should be disabled (non-interactive).

**Preconditions**:
- On Workloads > Deployments page.
- AI service is **not** active (use `cy.installRancherAIService({ waitForAIServiceReady: false })`).

**Steps**:
1. Install AI service but don't wait for it.
2. Navigate to deployments page.
3. Open chat (if possible).
4. Inspect the context panel.

**Assertions**:
- The `.disabled-panel` class is applied to the `.chat-context` container,
  meaning the `SelectContext` trigger has `:disabled="true"` and is non-interactive.

**Selectors**:
- `.chat-context.disabled-panel`

**Screenshot**: `context-test-8-disabled-when-not-active`

---

## Page Objects Needed

### New POs
- **`ContextPo`** (`cypress/e2e/po/context.po.ts`):
  - `panel()` — returns `.chat-context`
  - `tag(value: string)` — returns `[data-testid="rancher-ai-ui-context-tag-{value}"]`
  - `removeTag(value: string)` — `return this.tag(value).parent('.vs__selected').find('.vs__deselect').click()`
    _(data-testid is on inner `.tag-content`; `.vs__deselect` is a sibling, so parent traversal is required)_
  - `addContextTrigger()` — returns `.context-trigger`
  - `resetButton()` — returns `.context-reset button`
  - `noContextLabel()` — returns `.no-context`
  - `isDisabled()` — checks `.chat-context.disabled-panel` exists

### Existing POs Reused
- `ChatPo` (`@/cypress/e2e/po/chat.po`) — `open()`, `close()`, `isReady()`, `sendMessage()`, `getMessage()`
- `MessagePo` — `.context(label)` method (already implemented)
- `HomePagePo` (`@rancher/cypress/e2e/po/pages/home.po`) — `goTo()`
- `WorkloadsDeploymentsListPagePo` (`@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po`)

---

## Custom Commands

| Command | Usage |
|---------|-------|
| `cy.login()` | Authenticate before each test |
| `cy.enqueueLLMResponse({ text })` | Queue AI response (Tests 6 & 7) |
| `cy.cleanChatHistory()` | Clear history in `afterEach` |
| `cy.installRancherAIService(...)` | Test 8 setup |

---

## Mock Data

- Tests 6 & 7 require `cy.enqueueLLMResponse({ text: '...' })` before `sendMessage`.
- No additional API mocks beyond what the mock-agent already provides.

---

## Spec File Location

```
cypress/e2e/tests/features/context.spec.ts
```

---

## Notes

- `SelectContext.vue` dropdown items and trigger currently lack `data-testid`
  attributes. Tests 3 and 4 use class selectors (`.context-trigger`,
  `.vs__deselect`, `.context-reset`). Consider adding `data-testid` attributes
  to `SelectContext` as a follow-up to make selectors more stable.
- Context is only rendered when `context` (from store) has items and
  `hasPermissions` is true; Tests 8 verifies the disabled state when the AI
  service is not ready.
- Always navigate to the page **before** opening the chat so the store can
  populate the context from the route.
