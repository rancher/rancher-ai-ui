/**
 * Deletes all chat history for the logged-in user.
 * Tolerates 503 (Service Unavailable) since the AI service may not be running
 * in tests that intentionally test the disabled/inactive state.
 *
 * @return void
 */
Cypress.Commands.add('cleanChatHistory', () => {
  return cy.getCookie('CSRF').then((token) => {
    cy.request({
      method:           'DELETE',
      url:              `${ Cypress.env('chatServiceProxyPath') }/chats`,
      headers:          {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
      failOnStatusCode: false,
    })
      .then((resp) => {
        // 503 is expected when the AI service is not deployed (e.g. Test 8: disabled state)
        // 404 is expected when the service was just uninstalled and the route no longer exists
        if (resp.status !== 503 && resp.status !== 404) {
          expect(resp.status).to.eq(204);
        }
      });
  });
});

/**
 * Enable or disable the AI agent database persistency feature.
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