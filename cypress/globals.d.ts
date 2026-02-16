export interface LlmResponseArgs {
  agent?: string;
  text?: string | string[];
  chunkSize?: number;
  tool?: McpTool;
}

export interface McpTool {
  name: string;
  args: Record<string, string | object>;
}

declare global {
  namespace Cypress {
    interface Chainable {
      enqueueLLMResponse(args: LlmResponseArgs): void;
      clearLLMResponses(): void;
      cleanChatHistory(): void;
      agentDBPersistencyEnabled(value: boolean): void;
      createAgentConfig(config: object): void;
      deleteAgentConfig(config: object): void;
      agentEnabled(name: string, value: boolean): void;
    }
  }
}

export {};