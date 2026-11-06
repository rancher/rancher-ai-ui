import { PlanningTaskResponse } from '@/cypress/globals';

/**
 * Enqueues planning responses for the given tasks.
 * @param tasks Array of PlanningTaskResponse objects.
 */
Cypress.Commands.add('enqueuePlanningResponse', (tasks: PlanningTaskResponse[]): void => {
  const subtasks = [];

  for (const { summary: task, additionalInfo: additional_info, agent } of tasks) {
    subtasks.push({
      task,
      additional_info,
      agent,
      status: 'pending'
    });
  }

  cy.enqueueLLMResponse({ text: JSON.stringify({ subtasks }) });

  for (const { result } of tasks) {
    if (result) {
      cy.enqueueLLMResponse({ text: result.message });

      switch (result.status) {
      case 'completed':
        cy.enqueueLLMResponse({ text: 'yes' });
        break;
      case 'error':
      case 'failed':
        cy.enqueueLLMResponse({ text: 'no' });
        break;
      default:
        break;
      }
    }
  }
});