export interface McpTool {
  name: string;
  args: Record<string, string | object>;
}

declare global {
  namespace Cypress {
    interface Chainable {
      enqueueLLMResponse(args: { text?: string | string[], chunkSize?: number, tool?: McpTool }): void;
      clearLLMResponses(): void;
      cleanChatHistory(): void;
      agentDBPersistencyEnabled(value: boolean): void;
    }
  }
}

export {};