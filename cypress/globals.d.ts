declare global {
  namespace Cypress {
    interface Chainable {
      enqueueAIAgentResponse(args: { content: string, chunkSize?: number }): void;
      // Add more custom commands here
    }
  }
}

export {};