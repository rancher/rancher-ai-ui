import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

/**
 * Hides the AI agent Helm release from the Apps list, as if the chart was not installed.
 */
function hideAgentApp() {
  cy.intercept('GET', /\/v1\/catalog\.cattle\.io\.apps(\?.*)?$/, (req) => {
    req.continue((res) => {
      res.body.data = (res.body.data || []).filter((app: any) => app.spec?.chart?.metadata?.name !== 'rancher-ai-agent');
      res.send(res.body);
    });
  }).as('apps');
}

describe('AI agent installation', () => {
  const settingsPage = new SettingsPagePo();
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
  });

  it('It should not show the section when the AI agent is installed', () => {
    settingsPage.goTo();
    settingsPage.waitForPage();

    settingsPage.settings().aiAgentSettings().checkExists();
    settingsPage.agentNotInstalledState().checkNotExists();
  });

  describe('When the AI agent is uninstalled', () => {
    it('It should show the section again instead of the settings', () => {
      settingsPage.goTo();
      settingsPage.waitForPage();

      settingsPage.settings().aiAgentSettings().checkExists();
      settingsPage.agentNotInstalledState().checkNotExists();

      cy.uninstallRancherAIService();

      settingsPage.agentNotInstalledState().checkVisible();
      settingsPage.agentNotInstalledState().actionButton().should('be.visible');
      settingsPage.settings().aiAgentSettings().checkNotExists();
    });

    after(() => {
      cy.installRancherAIService({ waitForAIServiceReady: true });
    });
  });

  describe('When the AI agent Helm chart is not installed', () => {
    beforeEach(() => {
      hideAgentApp();

      // Keeps the installation from creating the Helm repository
      cy.intercept('POST', '/v1/catalog.cattle.io.clusterrepos', {
        statusCode: 403,
        body:       { message: 'forbidden' },
      });

      settingsPage.goTo();
      settingsPage.waitForPage();
      cy.wait('@apps');
    });

    it('It should show the section instead of the settings', () => {
      const notInstalled = settingsPage.agentNotInstalledState();

      notInstalled.checkVisible();
      notInstalled.self().should('contain', 'The AI Agent is not installed');
      notInstalled.actionButton().should('be.visible').and('contain', 'Install AI Agent');

      settingsPage.settings().aiAgentSettings().checkNotExists();
      settingsPage.settings().saveButton().should('not.exist');
    });

    it('It should open the chat and start the installation', () => {
      chat.isClosed();

      settingsPage.agentNotInstalledState().actionButton().click();

      chat.isOpen();
      chat.installAgent().self().should('be.visible');
      chat.installAgent().step('repository').self().should('not.have.class', 'status-pending');

      // The installation is shown in the chat, the settings keep the section without the button
      settingsPage.agentNotInstalledState().checkVisible();
      settingsPage.agentNotInstalledState().actionButton().should('not.exist');
    });

    it('It should show the button again when the chat is closed', () => {
      settingsPage.agentNotInstalledState().actionButton().click();
      chat.isOpen();
      settingsPage.agentNotInstalledState().actionButton().should('not.exist');

      chat.close();

      settingsPage.agentNotInstalledState().actionButton().should('be.visible');
    });
  });
});
