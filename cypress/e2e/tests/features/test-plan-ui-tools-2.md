# E2E Test Plan: UI Tools — Staging Page (show-yaml & show-yaml-diff)

**Feature Area**: `ui-tools` (incremental)
**Date Created**: 2026-05-22
**Plan Type**: Incremental (Plan 2)

## Source Components Analyzed

- `pkg/rancher-ai-ui/components/tools/components/ShowYaml.vue`
- `pkg/rancher-ai-ui/components/tools/components/ShowYamlDiff.vue`
- `pkg/rancher-ai-ui/pages/staging/index.vue`
- `pkg/rancher-ai-ui/pages/staging/yaml-editor/index.vue`
- `pkg/rancher-ai-ui/composables/useStagingComposable.ts`
- `pkg/rancher-ai-ui/store/staging.ts`
- `pkg/rancher-ai-ui/routing/extension-routing.ts`
- `pkg/rancher-ai-ui/l10n/en-us.yaml` (staging section)
- `cypress/e2e/po/ui-tools/tool.po.ts`
- `cypress/e2e/po/message.po.ts`

## Existing Coverage

**Existing test plan**: none (initial plans were not created; the spec was written directly)
**Existing spec**: `cypress/e2e/tests/features/ui-tools.spec.ts`

### What is already covered

The existing `ui-tools.spec.ts` covers:
- Required action: installation flow (install/uninstall UI tools definition)
- Required action: refresh flow (update definition triggers refresh action)
- Tool: `suggestions` — renders suggestion list options in AI response

### What this plan covers (gaps)

The following describes in the existing spec are explicitly skipped with `.describe.skip()` and a TODO comment:
- `Tool: show-yaml` — the `ShowYaml` button and staging YAML viewer
- `Tool: show-yaml-diff` — the `ShowYamlDiff` button and staging YAML diff viewer

The staging page (`/c/local/explorer/staging`) and its YAML editor component have **zero** E2E test coverage.

---

## Test Cases

### Test 1: show-yaml button appears in AI message

**Description**: When the LLM response includes a `show-yaml` UI tool call, the Show YAML button should be rendered in the AI response message.

**Preconditions**:
- User is logged in
- Home page is open
- Chat panel is open and ready
- UI tools definition is installed (`cy.installUIToolsDefinition()`)

**Steps**:
1. Enqueue LLM response containing a `show-yaml` tool with a known resource (e.g., kind=`Deployment`, namespace=`cattle-ai-agent-system`, name=`llm-mock`)
2. Send a message to trigger the response
3. Wait for the AI response message to complete

**Assertions**:
- The AI response message (message 3) should contain a button matching `[data-testid="rancher-ai-ui-tool-show-yaml-Deployment-cattle-ai-agent-system-llm-mock"]`
- The button should be visible and contain the resource name label

**Selectors**:
- `chat.getMessage(3).tool().showYaml('Deployment', 'cattle-ai-agent-system', 'llm-mock')` → uses `[data-testid="rancher-ai-ui-tool-show-yaml-Deployment-cattle-ai-agent-system-llm-mock"]`

**Screenshot**: `ui-tools-test-1-show-yaml-button`

---

### Test 2: show-yaml button navigates to staging page

**Description**: Clicking the Show YAML button should navigate the user to the staging page and display the YAML editor with "View YAML" heading and the resource label.

**Preconditions**:
- Same as Test 1; the show-yaml button is visible in the AI response

**Steps**:
1. Set up as in Test 1 (enqueue response with show-yaml tool, send message, wait for completion)
2. Click the show-yaml button in the AI response

**Assertions**:
- The browser URL should change to `/c/local/explorer/staging`
- A heading `h1` with text "View YAML" should be visible
- The resource label paragraph (`.resource-label`) should contain `Deployment: cattle-ai-agent-system/llm-mock`
- The YAML editor element `[data-testid="staging-yaml-editor"]` should be visible

**Selectors**:
- `cy.url()` for URL assertion
- `cy.contains('h1', 'View YAML')` for heading
- `cy.get('.resource-label')` for resource label
- `cy.get('[data-testid="staging-yaml-editor"]')` for editor

**Screenshot**: `ui-tools-test-2-staging-yaml-view`

---

### Test 3: staging page Close button returns to previous page

**Description**: Clicking the "Close" button on the staging page (in view-only mode, i.e., no confirmation pending) should navigate the user back to the previous page.

**Preconditions**:
- User is on the staging page after clicking show-yaml (no confirming message)

**Steps**:
1. Set up as in Test 2 (navigate to staging page via show-yaml button)
2. Click the "Close" button on the staging page

**Assertions**:
- The staging page should no longer be visible
- The browser URL should return to the previous page (e.g., home page `/`)
- The chat container should still be visible (chat remains open)

**Selectors**:
- `cy.contains('button', 'Close')` for the close button (`.staging-yaml-actions` area)
- `cy.url()` for URL assertion after closing

**Screenshot**: `ui-tools-test-3-staging-close`

---

### Test 4: show-yaml-diff button appears in AI message

**Description**: When the LLM response includes a `show-yaml-diff` UI tool call, the Show YAML Diff button should be rendered in the AI response message.

**Preconditions**:
- User is logged in
- Home page is open
- Chat panel is open and ready
- UI tools definition is installed

**Steps**:
1. Enqueue LLM response containing a `show-yaml-diff` tool with a known resource (kind=`Deployment`, namespace=`cattle-ai-agent-system`, name=`llm-mock`, plus both `original` and `patched` YAML content)
2. Send a message to trigger the response
3. Wait for the AI response message to complete

**Assertions**:
- The AI response message should contain a button matching `[data-testid="rancher-ai-ui-tool-show-yaml-diff-Deployment-cattle-ai-agent-system-llm-mock"]`
- The button should be visible

**Selectors**:
- `chat.getMessage(3).tool().showYamlDiff('Deployment', 'cattle-ai-agent-system', 'llm-mock')`

**Screenshot**: `ui-tools-test-4-show-yaml-diff-button`

---

### Test 5: show-yaml-diff button navigates to staging page in diff mode

**Description**: Clicking the Show YAML Diff button should navigate to the staging page and render the diff YAML editor with "View YAML" heading and a resource label.

**Preconditions**:
- Same as Test 4; show-yaml-diff button is visible in the AI response

**Steps**:
1. Set up as in Test 4 (enqueue show-yaml-diff response, send message, wait for completion)
2. Click the show-yaml-diff button in the AI response

**Assertions**:
- The browser URL should change to `/c/local/explorer/staging`
- A heading `h1` with text "View YAML" should be visible
- The resource label (`.resource-label`) should display `Deployment: cattle-ai-agent-system/llm-mock`
- The YAML editor element `[data-testid="staging-yaml-editor"]` should be visible in diff mode (the staging page passes `EditorMode.DIFF_CODE` directly to the YamlEditor; no separate "Show Diff" toggle button is rendered)

**Selectors**:
- `cy.url()` for URL
- `cy.contains('h1', 'View YAML')` for heading
- `cy.get('.resource-label')` for resource label
- `cy.get('[data-testid="staging-yaml-editor"]')` for editor (visible in diff mode)

**Screenshot**: `ui-tools-test-5-staging-yaml-diff`

---

### Test 6: show-yaml-diff in confirming message shows Cancel and Apply buttons

**Description**: When a show-yaml-diff tool is part of a confirming AI message (awaiting human confirmation), the staging page should display "Cancel" and "Apply to Cluster" action buttons instead of a simple "Close" button.

**Preconditions**:
- User is logged in and chat is open and ready
- UI tools definition is installed
- LLM response triggers an MCP tool call (e.g., `updateKubernetesResource`) to put the message into confirming state, with a `show-yaml-diff` tool in the response

**Steps**:
1. Enqueue an LLM response that includes both an `mcpTool` (e.g., `updateKubernetesResource`) and a `show-yaml-diff` `uiTool` to produce a confirming message with the YAML diff tool
2. Send a message to trigger the response
3. Wait for the AI response message to show the confirmation state (confirm/cancel buttons visible in the message)
4. Click the show-yaml-diff button

**Assertions**:
- The staging page loads (`/c/local/explorer/staging`)
- A "Cancel" button (`cy.contains('button', 'Cancel')`) is visible in the staging header actions
- An "Apply to Cluster" button (`cy.contains('button', 'Apply to Cluster')`) is visible in the staging header actions
- The "Close" button is NOT present

**Selectors**:
- `cy.contains('button', 'Cancel')` for the cancel action
- `cy.contains('button', 'Apply to Cluster')` for the apply action

**Screenshot**: `ui-tools-test-6-staging-diff-confirm-buttons`

---

### Test 7: Cancel on staging returns to chat and sets message to Canceled

**Description**: In a confirming scenario, clicking "Cancel" on the staging page should close the staging page, return to the previous page, and set the AI message confirmation state to "Canceled".

**Preconditions**:
- Same as Test 6; user is on the staging page with Cancel and Apply buttons visible

**Steps**:
1. Set up as in Test 6 (navigate to staging via show-yaml-diff in confirming message)
2. Click "Cancel" on the staging page

**Assertions**:
- The staging page closes (URL returns to home page)
- The AI response message (the confirming message) should now show "Canceled" state via `message.isCanceled()`

**Selectors**:
- `cy.contains('button', 'Cancel')` to click
- `chat.getMessage(3).isCanceled()` to verify final state

**Screenshot**: `ui-tools-test-7-staging-cancel-confirmed`

---

### Test 8: Apply on staging returns to chat and sets message to Confirmed

**Description**: In a confirming scenario, clicking "Apply to Cluster" on the staging page should close the staging page, return to the previous page, and set the AI message confirmation state to "Confirmed".

**Preconditions**:
- Same as Test 6; user is on the staging page with Cancel and Apply buttons visible

**Steps**:
1. Set up as in Test 6 (navigate to staging via show-yaml-diff in confirming message)
2. Click "Apply to Cluster" on the staging page

**Assertions**:
- The staging page closes (URL returns to home page)
- The AI response message should now show "Confirmed" state via `message.isConfirmed()`

**Selectors**:
- `cy.contains('button', 'Apply to Cluster')` to click
- `chat.getMessage(3).isConfirmed()` to verify final state

**Screenshot**: `ui-tools-test-8-staging-apply-confirmed`

---

## Page Objects Needed

### New Page Objects

**`StagingPagePo`** — `cypress/e2e/po/staging.po.ts`
- Wraps `.staging-yaml-editor` root element
- Methods:
  - `yamlEditor()` → `ComponentPo('[data-testid="staging-yaml-editor"]')`
  - `heading()` → `cy.contains('h1', ...)` or `cy.get('.staging-yaml-title h1')`
  - `resourceLabel()` → `cy.get('.resource-label')`
  - `closeButton()` → `cy.contains('.staging-yaml-actions button', 'Close')`
  - `cancelButton()` → `cy.contains('.staging-yaml-actions button', 'Cancel')`
  - `applyButton()` → `cy.contains('.staging-yaml-actions button', 'Apply to Cluster')`
  - `showDiffButton()` → `cy.contains('Show Diff')`
  - `backToEditButton()` → `cy.contains('Back to Edit')`
  - `waitForPage()` → `cy.url().should('include', '/explorer/staging')` and `cy.get('[data-testid="staging-yaml-editor"]').should('be.visible')`

### Existing Page Objects (reuse)

- `ChatPo` (`@/cypress/e2e/po/chat.po`) — `open()`, `getMessage(id)`, `sendMessage(text)`
- `ToolPo` (via `MessagePo.tool()`) — `showYaml(kind, ns, name)`, `showYamlDiff(kind, ns, name)`
- `MessagePo` (via `chat.getMessage(id)`) — `isCompleted()`, `isConfirmed()`, `isCanceled()`, `confirmButton()`, `cancelButton()`

---

## Custom Commands

### Existing commands to use

| Command | Description |
|---------|-------------|
| `cy.login()` | Log in using env credentials |
| `cy.cleanChatHistory()` | Clear all chat history (afterEach) |
| `cy.enqueueLLMResponse({ text, uiTools })` | Queue mock AI response with tool calls |
| `cy.clearLLMResponses()` | Clear enqueued LLM responses |
| `cy.installUIToolsDefinition()` | Install UI tools ConfigMap |
| `cy.uninstallUIToolsDefinition()` | Uninstall UI tools ConfigMap |

### Notes on new commands

No new custom commands are required. All setup and teardown can be handled with existing commands.

---

## Mock Data

### Test 1–3 (show-yaml, view mode)

```typescript
cy.enqueueLLMResponse({
  text: 'Here is the YAML for the deployment.',
  uiTools: [
    {
      name: 'show-yaml',
      args: {
        yaml:              'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: llm-mock\n',
        resourceKind:      'Deployment',
        resourceNamespace: 'cattle-ai-agent-system',
        resourceName:      'llm-mock',
      }
    }
  ]
});
```

### Test 4–5 (show-yaml-diff, view mode)

```typescript
cy.enqueueLLMResponse({
  text: 'Here is the diff for the deployment.',
  uiTools: [
    {
      name: 'show-yaml-diff',
      args: {
        original:          'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: llm-mock\n  replicas: 1\n',
        patched:           'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: llm-mock\n  replicas: 2\n',
        resourceKind:      'Deployment',
        resourceNamespace: 'cattle-ai-agent-system',
        resourceName:      'llm-mock',
      }
    }
  ]
});
```

### Test 6–8 (show-yaml-diff, confirming message)

> **Note**: The confirming scenario requires the LLM response to include an `mcpTool` that triggers a `updateKubernetesResource`-type call alongside the `show-yaml-diff` uiTool. Refer to the `mcpTool` docs in `cypress/support/commands/llm-mock-service-api.ts` for the exact payload format. The `isConfirmingMessage` state in `ShowYamlDiff.vue` is derived from `message.confirmation?.status === ConfirmationStatus.Pending`.

---

## Spec File Location

```
cypress/e2e/tests/features/ui-tools.spec.ts
```

The new tests should be added inside the existing `describe('UI Tools', ...)` block, replacing the `describe.skip('Tool: show-yaml', () => {})` and `describe.skip('Tool: show-yaml-diff', () => {})` stubs with fully implemented `describe` blocks.

---

## Notes

- The staging page route is `/c/local/explorer/staging` (cluster `local`, product `explorer`)
- `staging-yaml-editor` `data-testid` is on the `YamlEditor` component, not a wrapper div — use `cy.get('[data-testid="staging-yaml-editor"]')` globally (it is inside the staging page's `.staging-yaml-editor-container`)
- Button labels verified against `pkg/rancher-ai-ui/l10n/en-us.yaml`:
  - Close button: `"Close"` (`ai.staging.yaml-editor.close`)
  - Cancel button: `"Cancel"` (`ai.staging.yaml-editor.cancel`)
  - Apply button: `"Apply to Cluster"` (`ai.staging.yaml-editor.apply`)
  - Show Diff toggle: `"Show Diff"` (`ai.staging.yaml-editor.showDiff`)
  - Back to Edit toggle: `"Back to Edit"` (`ai.staging.yaml-editor.backToEdit`)
- The show-yaml tool requires only `yaml` + resource info; show-yaml-diff requires both `original` and `patched` YAML
- `ToolPo.showYaml(kind, namespace, name)` and `ToolPo.showYamlDiff(kind, namespace, name)` already exist in `tool.po.ts`
- Tests 6–8 require deeper knowledge of how the mock service triggers a confirming message — coordinate with the mcpTool mock API or adapt using existing patterns from `message.spec.ts` if it includes confirming message tests
