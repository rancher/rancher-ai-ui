# E2E Planner Learnings

## Selector Verification

### context-selection (verified 2026-05-08)
- `[data-testid^="rancher-ai-ui-context-tag-"]` — on `.tag-content` **inner div** inside `.vs__selected.tag` wrapper
- `.vs__deselect` button is a **sibling** of `.tag-content`, not a descendant — must use `.vs__selected.tag .vs__deselect` or `[data-testid^="..."].parent().find('.vs__deselect')`
- `.context-trigger` — class on `<rc-dropdown-trigger>` in `SelectContext.vue`
- `.context-dropdown` — class on `<rc-dropdown>` wrapper in `SelectContext.vue`; items accessible via `cy.get('.context-dropdown').contains(label)`
- `.no-context` — class on the `<span>` shown when `options.length === 0`
- `.context-reset` — wrapper div containing `RcButton`; use `.context-reset button` for the actual button
- `.chat-context.disabled-panel` — root div of `Context.vue` when `disabled` prop is true
- `[data-testid="rancher-ai-ui-chat-message-box-N"]` — dynamic testid in `Messages.vue` based on `message.id`

### rc-dropdown-item (context, 2026-05-08)
- `rc-dropdown-item` from `@components/RcDropdown` is a third-party component — its rendered HTML tag is unverifiable from this repo
- **NEVER** specify the HTML tag (e.g., `li`) when targeting dropdown items — use `cy.get('.context-dropdown').contains('text')` or `cy.contains('.context-dropdown', 'text')` to match any element type

### context (verified 2026-05-08, approved attempt 3)
- `cy.installRancherAIService({ waitForAIServiceReady: false })` — **supported** parameter (confirmed in `rancher-ai-service.ts`)
- Message IDs: welcome=1, first user message=2, first AI response=3 — confirmed in `message.spec.ts`
- `.chat-context.disabled-panel` is sufficient to assert disabled state — do NOT add `.context-trigger[disabled]` as Vue prop `:disabled` doesn't guarantee HTML attribute

### chat-panel-menu (verified 2026-05-20, APPROVED attempt 4)
- `[data-testid="rancher-ai-ui-chat-container"] .icon-actions` — correct selector for ⋮ menu trigger in `ChatPanelMenu.vue`; there is NO `data-testid` on the menu button itself
- `.v-popper__popper` — correct global selector for teleported dropdown (NOT scoped via `.find()`)
- `.shortcuts-title`, `.shortcuts-row`, `.shortcuts-action`, `.shortcuts-key` — verified CSS classes in `KeyboardShortcuts.vue`
- `.shortcuts` — container div wrapping all shortcut content in `KeyboardShortcuts.vue`
- `DeleteChatPromptPo` at `cypress/e2e/po/dialog/delete-chat.po.ts` — `.confirm()` clicks `prompt-remove-confirm-button` inside `[data-testid="card"].prompt-remove`
- `SettingsPagePo` at `cypress/e2e/po/settings.po.ts` — exists; path `/c/local/settings/rancher-ai-ui`
- **Actual shortcut action labels** from `en-us.yaml` (ai.shortcuts.items.*):
  - `navigateHistory`: "Previous / Next Prompt"
  - `openChat`: "Open / Close Chat Panel"
  - `newChat`: "New Chat"
  - `copyLastMessage`: "Copy Last Response"
  - `toggleHistory`: "View Previous Chats"
  - `deleteChat`: "Delete Current Chat"
- **Actual menu item labels** from `en-us.yaml` (ai.menu.options.chat.*):
  - `download.label`: "Download Messages"
  - `shortcuts.label`: "View Keyboard Shortcuts"
  - `config.label`: "Edit Configuration"
- Settings page route: `c-cluster-settings-${PRODUCT_NAME}` with cluster param → `/c/local/settings/rancher-ai-ui`
- Settings page heading: `aiConfig.form.header` = "AI Assistant Configuration" — verified in `en-us.yaml`
- `rancher-ai-ui-chat-menu-button` testid in the quick reference doc does NOT exist in the actual component — use `.icon-actions` instead
- Clipboard stubs: use `cy.window().then(win => cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite'))` for CI-safe clipboard testing

## Common Plan Issues

- **Wrong descendant selectors**: When `data-testid` is on an inner element, adjacent siblings won't be found via descendant selector. Always check element hierarchy.
- **Unverified component class names**: `RcDropdownItem` and similar wrapped components may not expose their internal CSS class. Prefer `cy.contains()` with text or `cy.get()` with verified classes.
- **Disabled attribute vs. property**: When Vue binds `:disabled` as a prop to a custom component, the HTML `disabled` attribute may not be set. Use `.should('be.disabled')` which checks both, or rely on class-based assertions (e.g., `.disabled-panel`) instead of `[disabled]` attribute selectors.
- **Hardcoded HTML element tags in cy.contains()**: `cy.contains('ul li', 'text')` fails if the list is not `ul/li`. Always drop the element type when the rendered tag is uncertain: `cy.contains('.container', 'text')`.
- **Wrong i18n text assertions**: ALWAYS verify assertion strings against the actual translated values in `pkg/rancher-ai-ui/l10n/en-us.yaml`. Plans that use descriptive/paraphrased text instead of exact i18n labels cause runtime assertion failures. This is especially common for shortcut action labels.
- **Trusting quick reference docs blindly**: The quick reference table (e.g., `rancher-ai-ui-chat-menu-button`) may list testids that do not exist in the actual component. Always verify against the source `.vue` file.

## Component Mapping

- `context` / `context-selection` feature → `SelectContext.vue`, `ContextTag.vue`, `Context.vue` (panel wrapper)
- Chat panel → `panels/` directory (Chat.vue, Console.Vue, Context.vue, Messages.vue)
- Message context tags rendered in `message/index.vue` via `ContextTag.vue`
- `MessagePo.context(label)` → returns `[data-testid="rancher-ai-ui-context-tag-{label}"]` within message — **verified in message.po.ts**
- `chat-panel-menu` feature → `header/ChatPanelMenu.vue`, `header/KeyboardShortcuts.vue`, `panels/Header.vue`
  - Menu trigger: `.icon-actions` inside `.chat-console-menu-container` (no `data-testid`)
  - Popper: `.v-popper__popper` (global, teleported)
  - Shortcuts popover: `.shortcuts`, `.shortcuts-title`, `.shortcuts-row`, `.shortcuts-action`, `.shortcuts-key`

## Coverage Guidelines

- Context selection tests should cover: auto-populate on navigation, no-context placeholder, remove tag, reset, re-add via dropdown, context sent with message, disabled state during connecting
- Always test navigation-triggered context refresh (context updates when navigating between pages)
- Tests 6 & 7 (context in/out of sent message) require `cy.enqueueLLMResponse()` before `sendMessage()`
- Shortcut tests must verify both text content using exact i18n labels AND presence of keyboard key badges
- Chat-panel-menu: always test menu open, each menu item, and keyboard shortcuts (Ctrl+Shift+O/S/C/Backspace)

## Anti-Patterns

- Do NOT use `.rc-dropdown-item` — this class is not guaranteed on the rendered element
- Do NOT use `data-testid` descendant selectors without verifying element hierarchy first
- Do NOT assume `:disabled` prop translates to HTML `disabled` attribute without verification — use `.should('be.disabled')` or class-based assertions
- Do NOT reference `WorkloadsDeploymentsListPagePo` without checking the exact import path
- Do NOT hardcode HTML element types (li, div, span) in `cy.contains()` selectors for third-party components — always use container-only scoping
- Do NOT reference `rancher-ai-ui-delete-chat-confirm-button` — this testid does not exist. Always use `DeleteChatPromptPo` for delete confirm actions.
- Do NOT use `cy.contains()` with paraphrased or lowercase-adjusted i18n text — always verify the exact rendered string from `en-us.yaml` first.
- Do NOT recommend `cy.wait(500)` in test plan notes — always prefer `.should('be.visible')` as implicit wait.
- Do NOT use descriptive shortcut action names (e.g., "Toggle history", "Navigate history") — always use the exact i18n translation values from `en-us.yaml`.
- Do NOT use abbreviated menu labels (e.g., "Configure", "Download") — always use full exact i18n labels (e.g., "Edit Configuration", "Download Messages"). Partial matches may work but violate plan conventions and obscure intent; also some are not substrings (e.g., "Configure" ≠ substring of "Edit Configuration").
- Do NOT trust quick reference testid tables as ground truth — always verify selectors against the actual `.vue` source files.

### ui-tools / staging page (verified 2026-05-22, attempt 3, APPROVED)
- `[data-testid="rancher-ai-ui-tool-show-yaml-{kind}-{namespace}-{name}"]` — on `RcButton` in `ShowYaml.vue` ✅
- `[data-testid="rancher-ai-ui-tool-show-yaml-diff-{kind}-{namespace}-{name}"]` — on `RcButton` in `ShowYamlDiff.vue` ✅
- `[data-testid="staging-yaml-editor"]` — on `YamlEditor` inside `pages/staging/yaml-editor/index.vue` ✅
- `.resource-label` — `<p>` tag in staging YAML editor header ✅
- `cy.contains('h1', 'View YAML')` — uses `ai.staging.yaml-editor.title` = "View YAML" ✅ (default for both show-yaml and show-yaml-diff)
- `.staging-yaml-actions button` for Close/Cancel/Apply — confirmed in template ✅
- **showDiff/backToEdit i18n keys EXIST in en-us.yaml but are NOT rendered by any component** — `pages/staging/yaml-editor/index.vue` passes `EditorMode.DIFF_CODE` directly to `YamlEditor`; NO "Show Diff" or "Back to Edit" toggle button is rendered. Do NOT include `showDiffButton()` or `backToEditButton()` in `StagingPagePo` or in plan notes.
- `ToolPo.showYaml(kind, namespace, name)` and `ToolPo.showYamlDiff(kind, namespace, name)` — both exist in `cypress/e2e/po/ui-tools/tool.po.ts` ✅
- Confirming state: `isConfirmingMessage` = `message.confirmation?.status === ConfirmationStatus.Pending`; when true, `handleCancel`/`handleApply` are set → staging shows Cancel + Apply buttons ✅
- Close button renders when `showActions` is false (no handleApply and no handleCancel) ✅
- `cy.installUIToolsDefinition()` / `cy.uninstallUIToolsDefinition()` confirmed in `cypress/support/commands/ui-tools.ts` ✅
- **StagingPagePo** valid methods: `yamlEditor()`, `heading()`, `resourceLabel()`, `closeButton()`, `cancelButton()`, `applyButton()`, `waitForPage()` — do NOT add `showDiffButton()` or `backToEditButton()`
- Staging close navigates back via `previousRoute` (stored before staging navigation) or `$router.back()` if not set
