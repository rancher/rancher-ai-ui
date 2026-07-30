# Test Plan: Settings – UI Tools Configuration

**Date Created**: 2026-05-25  
**Feature Area**: `settings-ui-tools-config`  
**Plan Type**: Incremental (initial plan for the UI Tools Config subsection)  
**Spec File**: `cypress/e2e/tests/features/settings-ui-tools-config.spec.ts`

## Source Components Analyzed

- `pkg/rancher-ai-ui/pages/settings/sections/ui-tools-config/index.vue` — main UI tools configuration panel
- `pkg/rancher-ai-ui/pages/settings/sections/ui-tools-config/Intro.vue` — banner + action button when tools require install/refresh
- `pkg/rancher-ai-ui/pages/settings/Settings.vue` — settings page shell; wraps all sections
- `pkg/rancher-ai-ui/composables/useToolsComposable.ts` — drives `toolsRequiredAction`, `publishToolsDefinition`
- `pkg/rancher-ai-ui/l10n/en-us.yaml` — i18n strings verified below

## Existing Coverage

| File | What it covers |
|------|---------------|
| `cypress/e2e/tests/features/settings.spec.ts` | AI Provider section (LLM toggle, API key), AI Agents section (add/remove custom agent, tabs, MCP URL) |

**No existing coverage** exists for the UI Tools Config section of the settings page.

## i18n String Reference (exact values from en-us.yaml)

| Key path | Rendered value |
|----------|---------------|
| `aiConfig.form.section.tools.fields.enabled.label` | `Enable Tools` |
| `aiConfig.form.section.tools.fields.systemPrompt.label` | `Guidelines` |
| `aiConfig.form.section.tools.fields.systemPrompt.placeholder` | `Markdown instructions for using UI tools` |
| `aiConfig.form.section.tools.fields.tools.label` | `Available Tools` |
| `aiConfig.form.section.tools.search` | `Search the tool...` |
| `aiConfig.form.section.tools.noMatchingTools` | `No matching tools` |
| `aiConfig.form.section.tools.tryAdjustingFilters` | `Try adjusting your filters or search query` |
| `aiConfig.form.section.tools.resetFilters` | `Clear all filters` |
| `aiConfig.form.section.tools.total` (count=N) | `{N} tools in total` (plural form) |
| `aiConfig.form.section.tools.enabledCount` (count=N) | `({N} enabled).` (plural form) |
| `aiConfig.form.resetToDefaults` | `Reset Configuration` |
| `aiConfig.form.section.tools.publish.message.admin.create.action.label` | `Install UI Tools` |
| `aiConfig.form.section.tools.publish.message.admin.update.action.label` | `Refresh UI Tools` |
| `aiConfig.form.section.tools.fields.tools.name.show-yaml` | `Show YAML` |
| `aiConfig.form.section.tools.fields.tools.name.suggestions` | `Suggestions` |
| `aiConfig.form.section.tools.fields.tools.name.explore` | `Explore` |

---

## Test Cases

### Test 1: UI Tools configuration section is visible on the settings page

**Description**: Verifies that navigating to the AI Assistant Configuration page shows the UI Tools section header and its key interactive elements when tools are already installed.

**Preconditions**:
- User is logged in
- UI tools definition is installed (`cy.installUIToolsDefinition()`)
- Settings page loaded

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Scroll to the UI Tools section

**Assertions**:
- `[data-testid="rancher-ai-ui-settings-tools"]` is visible
- The section contains text `Enable Tools` (checkbox label)
- The section contains text `Available Tools` (tools list label)
- The search input with placeholder `Search the tool...` is visible

**Selectors**:
- `[data-testid="rancher-ai-ui-settings-tools"]` — section container
- `CheckboxInputPo.byLabel(uiToolsConfig.self(), 'Enable Tools')` — enable checkbox
- `uiToolsConfig.self().contains('Available Tools')` — list label
- `uiToolsConfig.self().find('.search-input input')` — search input

**Screenshot**: `settings-ui-tools-config-test-1-section-visible`

---

### Test 2: Install UI Tools action banner and button are shown when tools are not installed

**Description**: When the UI tools definition has never been installed, the settings page shows an informational intro banner and an "Install UI Tools" action button.

**Preconditions**:
- User is logged in
- UI tools definition is **not** installed (`cy.uninstallUIToolsDefinition()`)
- Settings page loaded

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Scroll to the UI Tools section

**Assertions**:
- `[data-testid="rancher-ai-ui-tools-config-intro"]` is visible
- `[data-testid="rancher-ai-ui-tools-config-info-banner"]` is visible
- `[data-testid="rancher-ai-ui-tools-config-action-button"]` contains text `Install UI Tools`
- The tools grid and search input are **not** rendered (section is in intro state)

**Selectors**:
- `[data-testid="rancher-ai-ui-tools-config-intro"]`
- `[data-testid="rancher-ai-ui-tools-config-info-banner"]`
- `[data-testid="rancher-ai-ui-tools-config-action-button"]`

**Screenshot**: `settings-ui-tools-config-test-2-install-banner`

---

### Test 3: Enable/disable the UI Tools toggle and save

**Description**: Verifies that the "Enable Tools" checkbox can be toggled, the save button becomes active, and after saving and revisiting, the change persists.

**Preconditions**:
- User is logged in
- UI tools definition is installed
- Settings page loaded
- UI Tools are currently **enabled** (initial state)

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Find the `Enable Tools` checkbox and assert it is checked
4. Uncheck the `Enable Tools` checkbox
5. Click the Save button
6. Confirm the apply-settings prompt
7. Assert the Save button shows "Saved"
8. Reload the settings page
9. Assert the `Enable Tools` checkbox is **unchecked**
10. Re-check the checkbox to restore the original state and save

**Assertions**:
- After unchecking: Save button is enabled
- After saving: Save button shows `Saved`
- After reload: checkbox is unchecked
- After restoring: Save button shows `Saved` again

**Selectors**:
- `CheckboxInputPo.byLabel(uiToolsConfig.self(), 'Enable Tools')` — use `.isChecked()` / `.set()` per Rancher Cypress PO API
- `[data-testid="rancher-ai-ui-settings-save-button"]` — save button

**Screenshot**: `settings-ui-tools-config-test-3-enable-tools-toggle`

---

### Test 4: Update and reset the Guidelines (system prompt) field

**Description**: Verifies that the Guidelines textarea can be edited, the "Reset Configuration" button appears when changes are detected, and clicking it restores the original value.

**Preconditions**:
- User is logged in
- UI tools definition is installed
- Settings page loaded

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Find the Guidelines textarea (placeholder `Markdown instructions for using UI tools`)
4. Clear the textarea and type a new value `Custom guidelines for testing`
5. Assert that a button with text `Reset Configuration` appears below the textarea
6. Click the `Reset Configuration` button
7. Assert the `Reset Configuration` button disappears (no unsaved changes)

**Assertions**:
- After typing: `Reset Configuration` button becomes visible
- After clicking reset: `Reset Configuration` button is no longer visible
- Textarea value is reverted (changes discarded without saving)

**Selectors**:
- `uiToolsConfig.self().find('textarea')` — Guidelines textarea (no testid; unique in this sub-section)
- `uiToolsConfig.self().contains('button', 'Reset Configuration')` — reset button (matches `aiConfig.form.resetToDefaults`)

**Screenshot**: `settings-ui-tools-config-test-4-guidelines-reset`

---

### Test 5: Tools list displays all available tools with name, description and version badge

**Description**: Verifies that the tools grid renders tool cards, each showing the tool name, a description, and a revision badge, along with an enable/disable toggle.

**Preconditions**:
- User is logged in
- UI tools definition is installed
- Settings page loaded

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Scroll to the UI Tools section
4. Assert the tools grid is visible
5. Assert at least one tool card is shown
6. Find the `Show YAML` card and assert it shows the tool name `Show YAML`
7. Assert the version badge (icon with revision number) is present on the `Show YAML` card
8. Assert a toggle switch is present on the card

**Assertions**:
- `.tools-grid` is visible and contains at least one card
- Card matching `Show YAML` is present (via `cy.contains('.tools-grid', 'Show YAML')`)
- The `.version-badge` element exists within the card
- A toggle switch (`.toggle-enable-tool`) is present within the card

**Selectors**:
- `.tools-grid` — tools cards container
- `cy.contains('.tools-grid', 'Show YAML')` — card with tool name
- `.version-badge` — revision badge inside card
- `.toggle-enable-tool` — toggle switch inside card

**Screenshot**: `settings-ui-tools-config-test-5-tools-list`

---

### Test 6: Search filters the tools list by name

**Description**: Typing a search query into the search input filters the visible tools to only those matching the query. Clearing the search restores the full list.

**Preconditions**:
- User is logged in
- UI tools definition is installed
- Settings page loaded

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Assert multiple tools are visible initially
4. Type `yaml` into the search input
5. Assert only tools with `yaml` in their name/description are shown (e.g. `Show YAML`, `Show YAML Diff`)
6. Assert tools not matching (e.g. `Suggestions`) are not visible
7. Clear the search input
8. Assert the full tool list is restored

**Assertions**:
- After search: `cy.contains('.tools-grid', 'Show YAML')` exists
- After search: `cy.contains('.tools-grid', 'Suggestions')` does not exist
- After clear: `cy.contains('.tools-grid', 'Suggestions')` exists

**Selectors**:
- `.search-input input` — search text input
- `.tools-grid` — tools container

**Screenshot**: `settings-ui-tools-config-test-6-search-filter`

---

### Test 7: Category filter filters the tools list

**Description**: Clicking a category link in a tool card footer adds a category filter. The "Clear all filters" button removes the filter and restores all tools.

**Preconditions**:
- User is logged in
- UI tools definition is installed
- Settings page loaded
- Multiple tools with different categories exist

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Note the initial tool count from the total message
4. Click the category link in the footer of the first visible tool card
5. Assert the filter panel reflects the active category
6. Assert only tools of that category are shown (total count decreases or equals original)
7. Click `Clear all filters` link
8. Assert all tools are visible again (total count restored)

**Assertions**:
- After clicking category: `.reset-filters-link` is visible with text `Clear all filters`
- After clicking category: visible cards are fewer than or equal to original count
- After clear: `.reset-filters-link` is no longer visible
- After clear: all tools shown again

**Selectors**:
- `.app-chart-card-footer-button` — category button in card footer
- `.reset-filters-link` — clear all filters link in total bar

**Screenshot**: `settings-ui-tools-config-test-7-category-filter`

---

### Test 8: Enable/disable individual tool via toggle switch and save

**Description**: Verifies that toggling a specific tool's enable switch, saving, and revisiting the page persists the change. Restores original state after.

**Preconditions**:
- User is logged in
- UI tools definition is installed
- Settings page loaded
- The `Suggestions` tool is currently enabled (default)

**Steps**:
1. Navigate to `/c/local/settings/rancher-ai-ui`
2. Wait for page to load
3. Find the `Suggestions` tool card
4. Find its toggle switch and assert it is ON
5. Click the toggle to disable the `Suggestions` tool
6. Assert the `Reset Configuration` button for tools appears (text `Reset Configuration`)
7. Click Save and confirm
8. Assert Save button shows `Saved`
9. Reload the settings page
10. Find the `Suggestions` tool card and assert its toggle is OFF
11. Re-enable the tool and save to restore

**Assertions**:
- After disabling: "Reset Configuration" button visible (only when `hasToolEnabledChanges` is true)
- After save: button shows `Saved`
- After reload: Suggestions toggle is OFF
- After restore: Save shows `Saved`

**Selectors**:
- `cy.contains('.tools-grid .item-card', 'Suggestions').find('.toggle-enable-tool')` — toggle inside Suggestions card
- `uiToolsConfig.self().contains('button', 'Reset Configuration')` — tools reset button

**Screenshot**: `settings-ui-tools-config-test-8-toggle-tool`

---

## Page Objects Needed

### New PO Methods (extend `UiToolsConfig` in `cypress/e2e/po/settings.po.ts`)

The existing `UiToolsConfig` class only exposes `intro()`. The following methods should be added:

```typescript
// Inside UiToolsConfig class:
enabledCheckbox() {
  return CheckboxInputPo.byLabel(this.self(), 'Enable Tools');
}

guidelinesTextarea() {
  return this.self().find('textarea').first();
}

resetConfigButton() {
  return this.self().contains('button', 'Reset Configuration');
}

searchInput() {
  return this.self().find('.search-input input');
}

toolsGrid() {
  return this.self().find('.tools-grid');
}

toolCard(toolDisplayName: string) {
  return this.toolsGrid().contains('.item-card', toolDisplayName);
}

toolToggle(toolDisplayName: string) {
  return this.toolCard(toolDisplayName).find('.toggle-enable-tool');
}

resetFiltersLink() {
  return this.self().find('.reset-filters-link');
}
```

### Existing POs to Reuse

| PO | Usage |
|----|-------|
| `SettingsPagePo` (`@/cypress/e2e/po/settings.po`) | Navigate to settings, access `settings().uiToolsConfig()` |
| `ApplySettingsPromptPo` (`@/cypress/e2e/po/dialog/apply-settings.po`) | Confirm save dialog |
| `CheckboxInputPo` (`@rancher/cypress/e2e/po/components/checkbox-input.po`) | Enable Tools checkbox |

---

## Custom Commands

| Command | Where Used |
|---------|-----------|
| `cy.login()` | `beforeEach` |
| `cy.installUIToolsDefinition()` | `beforeEach` for tests 1, 3–8 |
| `cy.uninstallUIToolsDefinition()` | `beforeEach` for test 2; also in `afterEach` to restore state for test 2's `describe` block |
| `cy.cleanChatHistory()` | `afterEach` (standard cleanup) |

---

## Mock Data

No LLM responses are needed for settings page tests. All interactions are with the settings form directly.

---

## Spec File Location

`cypress/e2e/tests/features/settings-ui-tools-config.spec.ts`

---

## Notes

- Tests 3 and 8 modify persistent state (tool enabled flag, enable checkbox). Always restore original state within the same test.
- Test 2 must be in a nested `describe` with its own `afterEach` that re-installs the tools definition, so subsequent tests have tools available.
- The `.item-card` class is used by `RcItemCard` from `@components/RcItemCard`. Verify the rendered class if selector fails — use `cy.contains('.tools-grid', 'Show YAML')` as a fallback.
- `Reset Configuration` is the exact text for `aiConfig.form.resetToDefaults` — verified in en-us.yaml.
- There is only ONE `Reset Configuration` button rendered at a time (either tools-config changes OR tool-enabled changes, tracked separately). Both reuse the same i18n key, so use the nearest ancestor (`uiToolsConfig.self()`) to scope the selector.
