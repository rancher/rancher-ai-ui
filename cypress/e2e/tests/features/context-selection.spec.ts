import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import { WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';
import ClusterDashboardPagePo from '@rancher/cypress/e2e/po/pages/explorer/cluster-dashboard.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { ContextPanelPo } from '@/cypress/e2e/po/context.po';

describe('Feature: context-selection', () => {
  const chat = new ChatPo();
  const context = new ContextPanelPo();

  beforeEach(() => {
    cy.login();
  });

  afterEach(function() {
    if (!this.currentTest?.title.includes('Test 7')) {
      cy.cleanChatHistory();
    }
  });

  it('Test 1: Context panel shows context tags when on a cluster-scoped page', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.allTags().should('have.length.gte', 1);
    context.self().find('.context-trigger').should('exist');

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-1-context-tags-visible');
  });

  it('Test 2: Context panel shows "no context" message on home page', () => {
    HomePagePo.goTo();

    chat.open();
    chat.isReady();

    context.noContextLabel().should('be.visible');
    context.allTags().should('not.exist');
    context.self().find('.context-trigger').should('not.exist');

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-2-no-context');
  });

  it('Test 3: User can remove a context tag from the panel', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.allTags().should('have.length.gte', 1);

    cy.get('.vs__selected.tag .vs__deselect').first().click();

    context.allTags().should('not.exist');
    context.resetButton().should('be.visible');

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-3-tag-removed');
  });

  it('Test 4: User can reset context to full set after removing a tag', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    let originalCount: number;

    context.allTags().then(($tags) => {
      originalCount = $tags.length;
    });

    cy.get('.vs__selected.tag .vs__deselect').first().click();

    context.resetButton().should('be.visible');
    context.resetButton().click();

    context.allTags().then(($tags) => {
      expect($tags.length).to.equal(originalCount);
    });

    context.self().find('.context-reset').should('not.exist');

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-4-context-reset');
  });

  it('Test 5: User can toggle a context item via the "Add context" dropdown', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    let removedItemValue: string;

    context.allTags().first().then(($tag) => {
      const testId = $tag.attr('data-testid') || '';

      removedItemValue = testId.replace('rancher-ai-ui-context-tag-', '');
    });

    cy.get('.vs__selected.tag .vs__deselect').first().click();

    context.openDropdown();

    cy.then(() => {
      context.dropdownItem(removedItemValue).click();
    });

    context.allTags().should('have.length.gte', 1);
    context.self().find('.context-reset').should('not.exist');

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-5-tag-re-added');
  });

  it('Test 6: Context tags are included when sending a message', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    cy.enqueueLLMResponse({ text: 'Here is the context response.' });

    chat.sendMessage('Tell me about the current context');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Tell me about the current context');

    const resultMessage = chat.getMessage(3);

    resultMessage.context('local').should('exist');
    resultMessage.containsText('Here is the context response.');

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-6-context-in-message');
  });

  it('Test 7: Context panel is disabled while chat is not ready', () => {
    HomePagePo.goTo();

    cy.installRancherAIService({ waitForAIServiceReady: false });

    chat.open();

    chat.isNotReady();

    context.isDisabled();

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-7-context-disabled');
  });

  it('Test 8: Removing all context tags hides the "Reset" button when re-navigating', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.allTags().should('have.length.gte', 1);

    const clusterDashboard = new ClusterDashboardPagePo('local');

    clusterDashboard.goTo();
    clusterDashboard.waitForPage();

    chat.open();
    chat.isReady();

    context.allTags().should('have.length.gte', 1);
    context.self().find('.context-reset').should('not.exist');

    cy.wait(500);
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-selection-test-8-context-updates-on-navigation');
  });
});
