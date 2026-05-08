# Test Plan: Context Selection

- **Feature Area**: context-selection
- **Date Created**: 2026-05-08
- **Plan Type**: Initial
- **Source Components Analyzed**:
  - `pkg/rancher-ai-ui/components/context/SelectContext.vue`
  - `pkg/rancher-ai-ui/components/context/ContextTag.vue`
  - `pkg/rancher-ai-ui/components/panels/Context.vue`
  - `pkg/rancher-ai-ui/composables/useContextComposable.ts`
  - `pkg/rancher-ai-ui/store/context.ts`

## Overview

The context selection feature allows users to attach Rancher UI context (cluster,
namespace, etc.) to AI messages. Context items are discovered automatically from
the active Rancher UI route and presented as a dropdown. Users can toggle individual
items on/off, remove tags, and reset to the full set.

The only existing coverage is a passive check in `message.spec.ts` ("Show context")
that verifies a context tag appears inside an AI response message — but there are
no tests for the interactive context panel UI itself.

## Test Cases

---

### Test 1: Context panel shows context tags when on a cluster-scoped page

**Description**: Verify that context items are automatically populated and
displayed as tags in the context panel when navigating to a cluster-scoped page.

**Preconditions**:
- User is logged in.
- Navigate to the Workloads → Deployments list page for the `local` cluster
  so that cluster context is injected.

**Steps**:
1. Navigate to `WorkloadsDeploymentsListPagePo('local', 'apps.deployment')`.
2. Open the chat panel.
3. Wait for the chat to be ready.
4. Inspect the context panel area at the bottom of the chat console.

**Assertions**:
- At least one context tag with `data-testid="rancher-ai-ui-context-tag-local"`
  (or the cluster name) should be visible.
- The "Add context" trigger button (`rc-dropdown-trigger`) should be present.

**Selectors**:
- `[data-testid^="rancher-ai-ui-context-tag-"]`
- `.context-trigger` (button to open dropdown)

**Screenshot**: `context-selection-test-1-context-tags-visible`

---

### Test 2: Context panel shows "no context" message on home page

**Description**: Verify that when no context is available (e.g., on the Home
page), the panel shows the "no context" placeholder text instead of tags or
the add-context dropdown.

**Preconditions**:
- User is logged in.
- Navigate to Home page.

**Steps**:
1. Navigate to `HomePagePo.goTo()`.
2. Open the chat panel.
3. Wait for the chat to be ready.
4. Inspect the context panel.

**Assertions**:
- Element `.no-context` (or the i18n string for `ai.context.none`) should
  be visible.
- No `[data-testid^="rancher-ai-ui-context-tag-"]` elements should be present.
- The "Add context" dropdown trigger should not be present.

**Selectors**:
- `.no-context`
- `[data-testid^="rancher-ai-ui-context-tag-"]` (should not exist)

**Screenshot**: `context-selection-test-2-no-context`

---

### Test 3: User can remove a context tag from the panel

**Description**: Verify that clicking the remove (×) button on a context tag
removes that specific tag from the panel and updates the list of selected context
items.

**Preconditions**:
- User is logged in.
- Navigate to a page that generates at least one context tag (e.g., Deployments
  list page).

**Steps**:
1. Navigate to `WorkloadsDeploymentsListPagePo`.
2. Open the chat panel, wait for ready.
3. Confirm at least one context tag is present.
4. Click the `.vs__deselect` button (the × button) inside the first context tag.

**Assertions**:
- The removed context tag should no longer be present.
- A "Reset" button (`.context-reset`) should appear because selected < options.

**Selectors**:
- `[data-testid^="rancher-ai-ui-context-tag-"] .vs__deselect`
- `.context-reset`

**Screenshot**: `context-selection-test-3-tag-removed`

---

### Test 4: User can reset context to full set after removing a tag

**Description**: After a tag is removed, clicking the "Reset" button restores
all available context items as selected tags.

**Preconditions**:
- Same as Test 3; at least one tag has been removed.

**Steps**:
1. Navigate to `WorkloadsDeploymentsListPagePo`.
2. Open the chat panel, wait for ready.
3. Note the number of context tags shown.
4. Remove one tag by clicking its `.vs__deselect` button.
5. Click the "Reset" button (`.context-reset button`).

**Assertions**:
- The previously removed tag should reappear.
- The "Reset" button should disappear (all tags selected = no reset needed).
- The number of context tags should equal the original count.

**Selectors**:
- `.context-reset button`
- `[data-testid^="rancher-ai-ui-context-tag-"]`

**Screenshot**: `context-selection-test-4-context-reset`

---

### Test 5: User can toggle a context item via the "Add context" dropdown

**Description**: Verify that clicking an item in the "Add context" dropdown
(after it has been removed) re-adds the tag; clicking again removes it.

**Preconditions**:
- Navigate to a page with context (e.g., Deployments list).
- A tag has been removed so the dropdown has a re-addable item.

**Steps**:
1. Navigate to Deployments list page, open chat, wait for ready.
2. Record the initial set of context tags.
3. Remove one tag via `.vs__deselect`.
4. Click the "Add context" dropdown trigger (`.context-trigger`).
5. Find the removed item in the dropdown list and click it.

**Assertions**:
- The tag should reappear in the tag list.
- The item in the dropdown should now show a checkmark icon (`icon-close`
  indicates "is selected" in the source).
- The "Reset" button should disappear.

**Selectors**:
- `.context-trigger` (to open dropdown)
- `.context-dropdown .rc-dropdown-item` (items in dropdown)
- `[data-testid^="rancher-ai-ui-context-tag-"]`

**Screenshot**: `context-selection-test-5-tag-re-added`

---

### Test 6: Context tags are included when sending a message

**Description**: Verify that when context tags are selected and the user sends
a message, the context is referenced in the AI response message (context tag
shown on the AI reply).

**Preconditions**:
- Navigate to Deployments list page to have cluster context.
- Mock AI response queued.

**Steps**:
1. Navigate to `WorkloadsDeploymentsListPagePo`.
2. Open chat, wait for ready (welcome message appears).
3. `cy.enqueueLLMResponse({ text: 'Here is the context response.' })`.
4. Send message `'Tell me about the current context'`.
5. Wait for AI response message.

**Assertions**:
- The AI response message (message 3) should contain a context tag element
  `[data-testid^="rancher-ai-ui-context-tag-local"]` (using `MessagePo.context('local')`).
- The response text `'Here is the context response.'` should be visible.

**Selectors**:
- `[data-testid="rancher-ai-ui-chat-message-box-3"]`
- `[data-testid^="rancher-ai-ui-context-tag-local"]`

**Screenshot**: `context-selection-test-6-context-in-message`

---

### Test 7: Context panel is disabled while chat is not ready

**Description**: Verify that when the chat is in a non-ready state (e.g.,
connecting), the context panel is disabled and interactions are blocked.

**Preconditions**:
- Navigate to a page where the AI service is temporarily unavailable.

**Steps**:
1. Navigate to Home page.
2. `cy.installRancherAIService({ waitForAIServiceReady: false })` to trigger
   a reconnecting state.
3. Open chat panel.
4. While chat shows "Connecting" phase, inspect the context panel.

**Assertions**:
- The `.chat-context` element should have the `disabled-panel` CSS class.
- The "Add context" dropdown trigger should have the `disabled` attribute.

**Selectors**:
- `.chat-context.disabled-panel`
- `.context-trigger[disabled]`

**Screenshot**: `context-selection-test-7-context-disabled`

---

### Test 8: Removing all context tags hides the "Reset" button when re-navigating

**Description**: Verify that context is properly reset when the user navigates
to a new page that provides different context — old tags are replaced, and
the reset button is not shown for the fresh set.

**Preconditions**:
- Start on a page with context (Deployments list).
- Open chat and confirm context tags are visible.

**Steps**:
1. Navigate to Deployments list, open chat.
2. Note context tags.
3. Navigate to a different cluster-scoped page (e.g., cluster dashboard).
4. Inspect the context panel.

**Assertions**:
- Context tags should update to reflect the new page's context.
- The "Reset" button should not be shown (auto-select matches options).

**Selectors**:
- `[data-testid^="rancher-ai-ui-context-tag-"]`
- `.context-reset` (should not exist)

**Screenshot**: `context-selection-test-8-context-updates-on-navigation`

---

## Page Objects Needed

### New PO: `cypress/e2e/po/context.po.ts`

```typescript
import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class ContextTagPo extends ComponentPo {
  constructor(label: string) {
    super(`[data-testid="rancher-ai-ui-context-tag-${label}"]`);
  }

  remove() {
    return this.self().find('.vs__deselect').click();
  }
}

export class ContextPanelPo extends ComponentPo {
  constructor() {
    super('.chat-context');
  }

  isDisabled() {
    return this.self().should('have.class', 'disabled-panel');
  }

  isEnabled() {
    return this.self().should('not.have.class', 'disabled-panel');
  }

  openDropdown() {
    return this.self().find('.context-trigger').click();
  }

  dropdownItem(label: string) {
    return cy.contains('.rc-dropdown-item', label);
  }

  tag(label: string) {
    return new ContextTagPo(label);
  }

  allTags() {
    return this.self().find('[data-testid^="rancher-ai-ui-context-tag-"]');
  }

  resetButton() {
    return this.self().find('.context-reset button');
  }

  noContextLabel() {
    return this.self().find('.no-context');
  }
}
```

### Reuse Existing POs
- `ChatPo` from `@/cypress/e2e/po/chat.po`
- `MessagePo` from `@/cypress/e2e/po/message.po`
- `HomePagePo` from `@rancher/cypress/e2e/po/pages/home.po`
- `WorkloadsDeploymentsListPagePo` from `@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po`
- `ClusterDashboardPagePo` from `@rancher/cypress/e2e/po/pages/explorer/cluster-dashboard.po`

## Custom Commands

- `cy.login()` — authenticate before each test
- `cy.cleanChatHistory()` — reset chat after each test
- `cy.enqueueLLMResponse({ text })` — queue mock AI response (Test 6)
- `cy.installRancherAIService({ waitForAIServiceReady: false })` — trigger connecting phase (Test 7)

## Mock Data

- **Test 6**: `cy.enqueueLLMResponse({ text: 'Here is the context response.' })`
- **Test 7**: No LLM mock needed; rely on `installRancherAIService` to produce a disconnected/connecting state.

## Spec File Location

```
cypress/e2e/tests/features/context-selection.spec.ts
```
