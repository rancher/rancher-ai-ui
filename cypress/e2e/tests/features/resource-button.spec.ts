import BurgerMenuPo from '@rancher/cypress/e2e/po/side-bars/burger-side-menu.po';
import ProductNavPo from '@rancher/cypress/e2e/po/side-bars/product-side-nav.po';
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { machineInventorySchema } from '@/cypress/e2e/blueprints/schema';
import { gitRepo } from '@/cypress/e2e/blueprints/gitRepo';

// Resource buttons fetch their schema lazily, when the button scrolls into view (intersection
// observer). That request can take well over the 5s cy.wait default to fire on the loaded CI
// runner, so wait longer for it - it still resolves immediately when the request is fast.
const SCHEMA_FETCH_TIMEOUT = 20000;

describe('Resource button', () => {
  const chat = new ChatPo();

  describe('Visibility', () => {
    before(() => {
      cy.login();
    });

    beforeEach(() => {
      cy.login();
      cy.clearLLMResponses();
      cy.cleanChatHistory();

      HomePagePo.goTo();
    });

    it('It should load resources when the message is visible', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text: [
          'test',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-v8fhl", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`).as('fetchSchema');

      chat.sendMessage('User request');

      cy.wait('@fetchSchema', { timeout: SCHEMA_FETCH_TIMEOUT }).its('response.statusCode').should('eq', 404);

      const resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-v8fhl' }).should('be.disabled');
    });

    it('It should not load resources when the message is not visible', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-v8fhl", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`).as('fetchSchema');

      chat.sendMessage('User request');

      let resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-v8fhl' }).should('be.disabled');

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "cattle-ai-agent-system", "kind": "Deployment", "cluster": "local", "name": "llm-mock", "type": "apps.deployment"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      // First message is visible now, it should load the resource via cluster API
      cy.wait('@fetchSchema', { timeout: SCHEMA_FETCH_TIMEOUT }).its('response.statusCode').should('eq', 404);

      resourceMessage = chat.getMessage(5);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      chat.close();

      chat.open();

      resourceMessage = chat.getMessage(5);

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      // First button is not visible, it should not load the resource via cluster API
      cy.get('@fetchSchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(1);
      });
    });

    it('It should load resources when the message becomes visible', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:           [
          'test',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-v8fhl", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`).as('fetchSchema');

      chat.sendMessage('User request');

      let resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-v8fhl' }).should('be.disabled');

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "cattle-ai-agent-system", "kind": "Deployment", "cluster": "local", "name": "llm-mock", "type": "apps.deployment"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      // First message is visible now, it should load the resource via cluster API
      cy.wait('@fetchSchema', { timeout: SCHEMA_FETCH_TIMEOUT }).its('response.statusCode').should('eq', 404);

      resourceMessage = chat.getMessage(5);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      chat.close();

      chat.open();

      resourceMessage = chat.getMessage(5);

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      // First button is not visible, it should not load the resource via cluster API
      cy.get('@fetchSchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(1);
      });

      // Scroll the (currently out-of-view) first button into view to trigger its lazy schema load.
      // scrollIntoView on the button itself is deterministic: the panel's smooth scrollTo('top')
      // can race the auto-scroll/layout after reopen and fail to produce a clean IntersectionObserver
      // transition, so the fetch never fires. This still exercises "becomes visible -> loads".
      chat.getMessage(3).resourceButton({ name: 'e-v8fhl' }).scrollIntoView();

      // First button becomes visible, it should load the resource via cluster API
      cy.wait('@fetchSchema', { timeout: SCHEMA_FETCH_TIMEOUT }).its('response.statusCode').should('eq', 404);
    });

    it('It should keep and not load again resources when the message becomes visible again', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "default", "kind": "VirtualMachine", "cluster": "local", "name": "vm-new", "type": "kubevirt.io.virtualmachine"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      let resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'vm-new' }).should('be.disabled');

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-abcde", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      resourceMessage = chat.getMessage(5);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-abcde' }).should('be.visible');

      chat.close();

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/kubevirt.io.virtualmachine`).as('fetchVMSchema');

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`, {
        statusCode: 200,
        body:       machineInventorySchema,
      }).as('fetchMachineInventorySchema');

      chat.open();

      // Last button is visible, it should load the resource via cluster API
      cy.wait('@fetchMachineInventorySchema', { timeout: SCHEMA_FETCH_TIMEOUT }).its('response.statusCode').should('eq', 200);

      // First button is not visible, it should not load the resource via cluster API
      cy.get('@fetchVMSchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(0);
      });

      chat.getMessage(5).resourceButton({ name: 'e-abcde' }).should('be.visible');

      chat.messagesPanel().scrollTop();

      welcomeMessage.self().should('be.visible');

      // Scroll back to the bottom
      chat.messagesPanel().scrollButton().self().click();

      chat.getMessage(5).resourceButton({ name: 'e-abcde' }).should('be.visible');

      // Last button become visible again, it should not load the resource again as it was already loaded
      cy.get('@fetchMachineInventorySchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(1);
      });
    });

    after(() => {
      cy.login();
      cy.clearLLMResponses();
      cy.cleanChatHistory();
    });
  });

  describe('Navigation', () => {
    const burgerMenu = new BurgerMenuPo();
    const sideNav = new ProductNavPo();

    before(() => {
      cy.login();

      cy.createRancherResource('v1', 'fleet.cattle.io.gitrepo', JSON.stringify(gitRepo), false);
    });

    beforeEach(() => {
      cy.login();

      cy.clearLLMResponses();
      cy.cleanChatHistory();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('It should correctly navigate to Explorer when resource is native type and cluster is local', () => {
      cy.enqueueLLMResponse({
        text: [
          'test',
          /**
           * Resource
           *
           *   cluster: local
           *   type: apps.deployment
           *   namespace: cattle-ai-agent-system
           *   name: llm-mock
           */
          '<mcp-response>[{"namespace": "cattle-ai-agent-system", "kind": "Deployment", "cluster": "local", "name": "llm-mock", "type": "apps.deployment"}]</mcp-response>',
        ],
      });

      chat.sendMessage('User request');

      const resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      const btn = resourceMessage.resourceButton({ name: 'llm-mock' });

      // Verify navigation from Home to Explorer
      btn.should('be.visible');
      btn.click();

      cy.url().should('include', '/c/local/explorer/apps.deployment/cattle-ai-agent-system/llm-mock');
      cy.get('[data-testid="resource-detail-status-card"]').should('contain.text', 'Pods');

      // Verify navigation from random UI position to Explorer
      BurgerMenuPo.toggle();
      burgerMenu.links().contains(`Global Settings`).click();
      cy.get('#password-min-length').should('be.visible');

      btn.scrollIntoView();
      btn.click();

      cy.url().should('include', '/c/local/explorer/apps.deployment/cattle-ai-agent-system/llm-mock');
      cy.get('[data-testid="resource-detail-status-card"]').should('contain.text', 'Pods');
    });

    it('It should correctly navigate to built-in product (Fleet) when resource is fleet resource', () => {
      cy.enqueueLLMResponse({
        text: [
          'test',
          /**
           * Resource
           *
           *  cluster: local
           *  type: fleet.cattle.io.gitrepo
           *  namespace: fleet-default
           *  name: test
           */
          '<mcp-response>[{"namespace": "fleet-default", "kind": "GitRepo", "cluster": "local", "name": "test-liz-fleet", "type": "fleet.cattle.io.gitrepo"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      const resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      const btn = resourceMessage.resourceButton({ name: 'test-liz-fleet' });

      btn.should('be.visible');
      btn.click();

      // Verify navigation from Home to Fleet
      cy.url().should('include', '/c/local/fleet/fleet.cattle.io.gitrepo/fleet-default/test-liz-fleet');
      cy.get('.resource-link').should('contain.text', 'App Bundle:');

      // Verify navigation from Explorer to Fleet
      burgerMenu.goToCluster('local');
      sideNav.navToSideMenuGroupByLabel('Workloads');
      sideNav.navToSideMenuEntryByLabel('Deployments');
      cy.get('.with-subheader').should('contain.text', 'Deployments');

      btn.scrollIntoView();
      btn.click();

      cy.url().should('include', '/c/local/fleet/fleet.cattle.io.gitrepo/fleet-default/test-liz-fleet');
      cy.get('.resource-link').should('contain.text', 'App Bundle:');
    });

    it.skip('It should correctly navigate to Explorer when resource is rancher-managed (management.cattle.io group)', () => {
      // TODO
    });

    it.skip('It should correctly navigate to Extension product (Elemental) when resource is Custom Resource Definition', () => {
      // TODO: This requires Elemental extension and server to be installed in Rancher.
    });

    it.skip('It should correctly navigate to Explorer when resource is native type and cluster is downstream cluster', () => {
      // TODO: This requires a downstream cluster to be registered in Rancher. It's worth to move from docker to k3s setup first.
    });

    afterEach(() => {
      cy.clearLLMResponses();
      cy.cleanChatHistory();
    });

    after(() => {
      cy.login();

      cy.deleteRancherResource('v1', 'fleet.cattle.io.gitrepo', `${ gitRepo.metadata.namespace }/${ gitRepo.metadata.name }`, false);
    });
  });
});