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

## Common Plan Issues

- **Wrong descendant selectors**: When `data-testid` is on an inner element, adjacent siblings won't be found via descendant selector. Always check element hierarchy.
- **Unverified component class names**: `RcDropdownItem` and similar wrapped components may not expose their internal CSS class. Prefer `cy.contains()` with text or `cy.get()` with verified classes.
- **Disabled attribute vs. property**: When Vue binds `:disabled` as a prop to a custom component, the HTML `disabled` attribute may not be set. Use `.should('be.disabled')` which checks both, or rely on class-based assertions (e.g., `.disabled-panel`) instead of `[disabled]` attribute selectors.
- **Hardcoded HTML element tags in cy.contains()**: `cy.contains('ul li', 'text')` fails if the list is not `ul/li`. Always drop the element type when the rendered tag is uncertain: `cy.contains('.container', 'text')`.

## Component Mapping

- `context` / `context-selection` feature → `SelectContext.vue`, `ContextTag.vue`, `Context.vue` (panel wrapper)
- Chat panel → `panels/` directory (Chat.vue, Console.vue, Context.vue, Messages.vue)
- Message context tags rendered in `message/index.vue` via `ContextTag.vue`
- `MessagePo.context(label)` → returns `[data-testid="rancher-ai-ui-context-tag-{label}"]` within message — **verified in message.po.ts**

## Coverage Guidelines

- Context selection tests should cover: auto-populate on navigation, no-context placeholder, remove tag, reset, re-add via dropdown, context sent with message, disabled state during connecting
- Always test navigation-triggered context refresh (context updates when navigating between pages)
- Tests 6 & 7 (context in/out of sent message) require `cy.enqueueLLMResponse()` before `sendMessage()`

## Anti-Patterns

- Do NOT use `.rc-dropdown-item` — this class is not guaranteed on the rendered element
- Do NOT use `data-testid` descendant selectors without verifying element hierarchy first
- Do NOT assume `:disabled` prop translates to HTML `disabled` attribute without verification — use `.should('be.disabled')` or class-based assertions
- Do NOT reference `WorkloadsDeploymentsListPagePo` without checking the exact import path (it's in `@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po`)
- Do NOT hardcode HTML element types (li, div, span) in `cy.contains()` selectors for third-party components — always use container-only scoping
