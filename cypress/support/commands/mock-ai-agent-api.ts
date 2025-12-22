
/**
 * Enqueue a request to mock AI Agent response
 */
Cypress.Commands.add('enqueueAIAgentResponse', (args: { content: string, chunkSize?: number }) => {
  return cy.request({
    method: 'POST',
    url:    `${ Cypress.env('mockAgentApi') }/control/enqueue`,
    body:   {
      content:   args.content || '',
      chunkSize: args.chunkSize || 30
    }
  })
    .then((resp) => {
      expect(resp.status).to.eq(200);
    });
});