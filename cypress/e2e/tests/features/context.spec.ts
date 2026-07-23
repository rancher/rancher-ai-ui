import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import { WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import ContextPo from '@/cypress/e2e/po/context.po';

describe('Feature: context', () => {
  const chat = new ChatPo();
  const context = new ContextPo();

  beforeEach(() => {
    cy.login();
  });

  afterEach(() => {
    cy.cleanChatHistory();
  });

  it('Test 1: Context panel shows cluster tag on cluster-scoped page', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.tag('local').should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-test-1-cluster-tag-visible');
  });

  it('Test 2: No context shown on Home page', () => {
    HomePagePo.goTo();

    chat.open();
    chat.isReady();

    context.noContextLabel().should('be.visible');
    cy.get('[data-testid^="rancher-ai-ui-context-tag-"]').should('not.exist');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-test-2-no-context-home');
  });

  it('Test 3: Deselect a context tag', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.tag('local').should('be.visible');

    context.removeTag('local');

    context.tag('local').should('not.exist');
    context.resetButton().should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-test-3-tag-deselected');
  });

  it('Test 4: Re-add a context via the dropdown', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.removeTag('local');
    context.tag('local').should('not.exist');

    context.addContextTrigger().click();
    context.selectDropdownItem('local');

    context.tag('local').should('be.visible');
    context.resetButton().should('not.exist');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-test-4-tag-readded');
  });

  it('Test 5: Reset restores all deselected tags', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.tag('local').should('be.visible');

    context.removeTag('local');
    context.resetButton().should('be.visible');

    context.resetButton().click();

    cy.get('[data-testid^="rancher-ai-ui-context-tag-"]').should('be.visible');
    context.resetButton().should('not.exist');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-test-5-reset-restores-all');
  });

  it('Test 6: Deselected context is NOT included in sent message', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    context.removeTag('local');

    cy.enqueueLLMResponse({ text: 'Response without cluster context.' });
    chat.sendMessage('Show context');

    const userMessage = chat.getMessage(2);

    userMessage.self().within(() => {
      cy.get('[data-testid="rancher-ai-ui-context-tag-local"]').should('not.exist');
    });

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-test-6-deselected-not-in-message');
  });

  it('Test 7: Selected context IS included in sent message', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();
    chat.isReady();

    cy.enqueueLLMResponse({ text: 'Response with cluster context.' });
    chat.sendMessage('Show context');

    const userMessage = chat.getMessage(2);

    userMessage.context('local').should('exist');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('context-test-7-selected-context-in-message');
  });
});
