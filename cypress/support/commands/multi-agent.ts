import { harvesterAgentConfig } from '@/cypress/e2e/blueprints/aiAgentConfigs';

/**
 * Enable Multi-Agent Configuration environment
 *
 * Multi-Agent Setup:
 *  - To enable multi-agent chat features, we need to have at least two AI Agent Configs in the system.
 *  - Rancher agent is built-in, so we just need to add one more (Harvester).
 * @return void
 */
Cypress.Commands.add('multiAgentEnabled', (value: boolean) => {
  cy.login();

  if (value) {
    cy.createRancherResource('v1', 'ai.cattle.io.aiagentconfig', JSON.stringify(harvesterAgentConfig), false);
  } else {
    cy.deleteRancherResource('v1', 'ai.cattle.io.aiagentconfig', 'cattle-ai-agent-system/harvester', false);
  }
  // Give some time for the agent config to be fully registered in the AI system.
  cy.wait(1000);
});

/**
 * Enable Agent in Multi-Agent Configuration environment
 *
 * @return void
 */
Cypress.Commands.add('agentEnabled', (name: string, value: boolean) => {
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

      const patch = JSON.stringify({ spec: { enabled: value } });

      const cmd = `kubectl --kubeconfig=${ kubeconfig } patch aiagentconfigs.ai.cattle.io ${ name } -n cattle-ai-agent-system --type='merge' --patch '${ patch }'`;

      cy.exec(cmd, {
        failOnNonZeroExit: false,
        timeout:           5000
      }).then((result) => {
        cy.log(`Script output: ${ result.stdout || 'None' }`);
        cy.log(`Script error: ${ result.stderr || 'None' }`);

        expect(result.code).to.eq(0);
      });

      // Wait for the agent to be enabled/disabled
      cy.wait(1000);
    });
  });
});
