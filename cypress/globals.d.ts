export interface AgentReponse {
  agent?: string | null;
  mcpTool?: Tool;
}
export interface LlmResponseArgs {
  agentResponses?: AgentReponse[];
  text?: string | string[];
  chunkSize?: number;
  uiTools?: Tool[];
}

export interface Tool {
  name: string;
  args: object | object[];
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
      installUIToolsDefinition(): void;
      updateUIToolsDefinition(): void;
      uninstallUIToolsDefinition(): void;
    }
  }
}

export {};