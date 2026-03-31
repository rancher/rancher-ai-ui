# E2E Planner Learnings

Accumulated knowledge from the E2E planner verifier. Used by the planner,
planner-fixer, and verifier to produce better test plans.

## Selector Verification

<!-- Map of verified selectors: component → data-testid -->

## Common Plan Issues

<!-- Structure problems, missing sections, vague steps -->

## Component Mapping

<!-- Which Vue components map to which feature areas -->
- Chat panel: `pkg/rancher-ai-ui/pages/Chat.vue`
- Messages: `pkg/rancher-ai-ui/components/message/index.vue`
- Context: `pkg/rancher-ai-ui/components/context/SelectContext.vue`
- History: `pkg/rancher-ai-ui/components/history/`
- Settings: `pkg/rancher-ai-ui/pages/settings/`
- Header: `pkg/rancher-ai-ui/components/header/ChatPanelMenu.vue`
- Agent selector: `pkg/rancher-ai-ui/components/agent/SelectAgent.vue`

## Coverage Guidelines

- Each test plan must have at least 5 test cases
- Plans must include both happy-path and error scenarios
- Every test case must reference specific data-testid selectors
- Plans must account for the Rancher setup spec running first

## Anti-Patterns

- Do NOT use selectors that don't exist in source components
- Do NOT write vague steps like "verify the UI updates" — be specific
- Do NOT skip error/edge case coverage
