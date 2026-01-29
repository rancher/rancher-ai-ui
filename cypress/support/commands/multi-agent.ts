/**
 * Enable Agent in Multi-Agent Configuration environment
 *
 * @return void
 */
Cypress.Commands.add('enableAgent', (name: string, enabled: boolean) => {
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

      const kubeconfig = `${ Cypress.config('downloadsFolder') }/local.yaml`;

      cy.writeFile(kubeconfig, resp.body.config);

      const patch = JSON.stringify({ spec: { enabled } });

      const cmd = `kubectl --kubeconfig=${ kubeconfig } patch aiagentconfigs.ai.cattle.io ${ name } -n cattle-ai-agent-system --type='merge' --patch '${ patch }'`;

      cy.exec(cmd, {
        failOnNonZeroExit: false,
        timeout:           5000
      }).then((result) => {
        cy.log(`Script output: ${ result.stdout || 'None' }`);
        cy.log(`Script error: ${ result.stderr || 'None' }`);

        expect(result.code).to.eq(0);
      });

      cy.wait(1000); // Wait for the agent to be enabled
    });
  });
});
