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

export interface InstallRancherAIServiceArgs {
  waitForAIServiceReady?: boolean;
}

declare global {
  namespace Cypress {
    interface Chainable {
      enqueueLLMResponse(args: LlmResponseArgs): void;
      clearLLMResponses(): void;
      cleanChatHistory(): void;
      installRancherAIService(args?: InstallRancherAIServiceArgs): void;
      uninstallRancherAIService(): void;
      agentDBPersistencyEnabled(value: boolean): void;
      createAgentConfig(config: object): void;
      updateAgentConfig(config: object): void;
      deleteAgentConfig(config: object): void;
    }
  }
}

export {};