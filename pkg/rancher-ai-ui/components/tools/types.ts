/* eslint-disable no-unused-vars */

/**
 * The name of the tools that can be used in Rancher AI Chat messages.
 *
 * NOTE! These enum values should be updated when the ui-tools.json definition is updated.
 */
export const enum ToolName {
  ShowYaml = 'show-yaml',
  ShowYamlDiff = 'show-yaml-diff',
  Explore = 'explore',
  ShowLogs = 'open-console-logs',
  Suggestions = 'suggestions',
  SelectOption = 'select-option'
}
