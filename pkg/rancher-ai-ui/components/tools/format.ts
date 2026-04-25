import { ToolCall } from '../../types';
import { ToolName } from './types';

export function printTools(tools: ToolCall[]) {
  for (const tool of tools) {
    switch (tool.toolName) {
    case ToolName.Suggestions:
      let suggestions = 'Quick Actions: [';

      for (let i = 0; i < 3; i++) {
        const suggestion = tool.input?.[`suggestion${ i + 1 }`] || '';

        if (suggestion) {
          suggestions += `"${ suggestion }", `;
        }
      }

      return `${ suggestions.slice(0, -2)  }]`;
    case ToolName.SelectOption:
      let options = tool.input?.label ? `${ tool.input.label }: [` : 'Select option: [';

      for (let i = 0; i < 3; i++) {
        const opt = tool.input?.[`option${ i + 1 }`] || '';

        if (opt) {
          options += `"${ opt }", `;
        }
      }

      return `${ options.slice(0, -2)  }]`;
    default:
      return '';
    }
  }
}