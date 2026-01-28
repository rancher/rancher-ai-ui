/**
 * Deletes all chat history for the logged-in user.
 *
 * @return void
 */
Cypress.Commands.add('cleanChatHistory', () => {
  return cy.getCookie('CSRF').then((token) => {
    cy.request({
      method:  'DELETE',
      url:     `${ Cypress.env('chatServiceProxyPath') }/chats`,
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
    })
      .then((resp) => {
        expect(resp.status).to.eq(204);
      });
  });
});

/**
 * Enable or disable data persistency the Agent.
 *
 */
Cypress.Commands.add('agentDBPersistencyEnabled', (value: boolean) => {
  return cy.getCookie('CSRF').then((token) => {
    cy.request({
      method:  'POST',
      url:     '/v3/clusters/local?action=generateKubeconfig',
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
    }).then((resp) => {
      expect(resp.status).to.eq(200);

      const chart = Cypress.env('helmChartDir');
      const kubeconfig = `${ Cypress.config('downloadsFolder') }/local.yaml`;

      cy.writeFile(kubeconfig, resp.body.config);

      const enable = value ? 'true' : 'false';
      const cmd = `.github/scripts/enable-rancher-ai-chat-history.sh ${ kubeconfig } ${ chart } ${ enable }`;

      cy.exec(cmd, {
        failOnNonZeroExit: false,
        timeout:           120000
      }).then((result) => {
        cy.log(`Script output: ${ result.stdout || 'None' }`);
        cy.log(`Script error: ${ result.stderr || 'None' }`);

        expect(result.code).to.eq(0);
      });
    });
  });
});