import { rancherApiUrl } from '../utils/rancher-url';

/**
 * GETs an AIAgentConfig, retrying while it is briefly absent. The AIAgentConfig CRD/schema is
 * removed and re-added when the AI service is (re)installed, so a request right after a reinstall
 * can transiently 404/5xx until Steve re-registers the type.
 */
function getAgentConfig(namespace: string, name: string, attempts = 15): Cypress.Chainable<any> {
  return cy.getCookie('CSRF').then((token) => {
    return cy.request({
      method:           'GET',
      url:              rancherApiUrl(`/v1/ai.cattle.io.aiagentconfig/${ namespace }/${ name }`),
      headers:          {
        'x-api-csrf': token?.value,
        Accept:       'application/json'
      },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status === 200) {
        return resp;
      }

      if (attempts <= 1) {
        expect(resp.status, `GET aiagentconfig ${ namespace }/${ name }`).to.eq(200);

        return resp;
      }

      cy.wait(1000);

      return getAgentConfig(namespace, name, attempts - 1);
    });
  });
}

/**
 * Polls an AIAgentConfig until the controller reports it active (Steve's metadata.state.name, which
 * is exactly what the UI's config.state resolves to). updateAgentConfig only PUTs the spec; the
 * controller updates the status asynchronously, so a test that asserts the UI reflects an agent
 * becoming active must wait for that reconcile instead of racing it. Bounded and non-fatal: if it
 * never reports active it proceeds and lets the caller's own UI assertion be the real check, so a
 * status-shape surprise or a stalled controller can't hang the suite.
 */
function pollAgentConfigActive(namespace: string, name: string, attempts = 20): Cypress.Chainable<any> {
  return getAgentConfig(namespace, name).then((resp) => {
    const state = resp.body?.metadata?.state?.name;

    // Every branch yields via a cy chain (cy.wrap / recursion): returning the bare resp object from
    // a .then chained onto the custom getAgentConfig helper trips Cypress's "mixing async and sync
    // code" guard.
    if (state === 'active') {
      return cy.wrap(resp, { log: false });
    }

    if (attempts <= 1) {
      // Surface the observed state/status so the reconcile signal can be confirmed / corrected.
      cy.log(`pollAgentConfigActive: ${ namespace }/${ name } not active after retries (state='${ state }', status=${ JSON.stringify(resp.body?.status) }); proceeding`);

      return cy.wrap(resp, { log: false });
    }

    cy.wait(1500);

    return pollAgentConfigActive(namespace, name, attempts - 1);
  });
}

/**
 * Create agent config in the cluster
 *
 * @return void
 */
Cypress.Commands.add('createAgentConfig', (config: object) => {
  cy.createRancherResource('v1', 'ai.cattle.io.aiagentconfig', JSON.stringify(config), false);
});

/**
 * Update agent config in the cluster
 *
 * @return void
 */
Cypress.Commands.add('updateAgentConfig', (config: object) => {
  const { name, namespace } = (config as any).metadata;
  const updatedSpec = (config as any).spec;

  getAgentConfig(namespace, name).then((resp) => {
    const updatedConfig = {
      metadata: { ...resp.body.metadata },
      spec:     {
        ...resp.body.spec,
        ...updatedSpec
      }
    };

    cy.setRancherResource('v1', 'ai.cattle.io.aiagentconfig', `${ namespace }/${ name }`, updatedConfig);
  });
});

/**
 * Delete agent config from the cluster
 *
 * @return void
 */
Cypress.Commands.add('deleteAgentConfig', (config: object) => {
  const { name, namespace } = (config as any).metadata;

  cy.deleteRancherResource('v1', 'ai.cattle.io.aiagentconfig', `${ namespace }/${ name }`, false);
});

/**
 * Waits for an agent config to be reconciled to the active state by the controller.
 *
 * @return void
 */
Cypress.Commands.add('waitForAgentConfigActive', (config: object) => {
  const { name, namespace } = (config as any).metadata;

  return pollAgentConfigActive(namespace, name);
});
