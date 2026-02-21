import ProductNavPo from '@rancher/cypress/e2e/po/side-bars/product-side-nav.po';
import { SettingsPagePo as GlobalSettings } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';
import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';

describe('AI Assistant Configuration', () => {
  const settingsPage = new SettingsPagePo();

  const initValues = {
    llm:          'ollama',
    apiKey:       'empty',
    fleetAgent:   'fleet',
    rancherAgent: 'rancher', // default built-in agent
  };

  const updatedValues = {
    llm:         'gemini',
    apiKey:      'my-api-key',
    customAgent: 'agent-3'
  };

  beforeEach(() => {
    cy.login();
  });

  it('Should show settings page', () => {
    const globalSettings = new GlobalSettings('_');

    globalSettings.goTo();
    globalSettings.waitForPage();

    const sideNav = new ProductNavPo();

    sideNav.navToSideMenuEntryByLabel('AI Assistant');

    cy.contains('AI Assistant Configuration').should('be.visible');
  });

  describe('AI Provider section', () => {
    beforeEach(() => {
      settingsPage.goTo();
      settingsPage.waitForPage();
    });

    it('It should correctly handle the AI Assistant settings', () => {
      const aiAgentSettings = settingsPage.settings().aiAgentSettings();

      aiAgentSettings.checkExists();

      aiAgentSettings.llm(initValues.llm).isSelected();

      aiAgentSettings.llm(updatedValues.llm).select();
      aiAgentSettings.llm(updatedValues.llm).isSelected();

      aiAgentSettings.apiKeyInput().parent().find('.hide-show').click();
      aiAgentSettings.apiKeyInput().should('have.value', initValues.apiKey);

      aiAgentSettings.apiKeyInput().clear().type(updatedValues.apiKey);

      settingsPage.settings().saveButton().click();

      // Revisit the page to check if the settings were saved correctly
      settingsPage.goTo();
      settingsPage.waitForPage();

      aiAgentSettings.llm(updatedValues.llm).isSelected();

      aiAgentSettings.apiKeyInput().parent().find('.hide-show').click();
      aiAgentSettings.apiKeyInput().should('have.value', updatedValues.apiKey);

      // Revert changes
      aiAgentSettings.apiKeyInput().clear().type(initValues.apiKey);
      aiAgentSettings.llm(initValues.llm).select();

      settingsPage.settings().saveButton().click();
    });
  });

  describe('AI Agents section', () => {
    beforeEach(() => {
      settingsPage.goTo();
      settingsPage.waitForPage();
    });

    it('It should correctly handle the AI Agent configs', () => {
      const aiAgentConfigs = settingsPage.settings().aiAgentConfigs();

      aiAgentConfigs.checkExists();

      // Check that both Rancher Agent and Fleet Agent tabs are present
      aiAgentConfigs.tabs().getTab(initValues.rancherAgent).checkExists();
      aiAgentConfigs.tabs().getTab(initValues.fleetAgent).checkExists();

      // Check that multiple agents info message is not shown when only 1 agent is enabled (Rancher Agent)
      aiAgentConfigs.self().should('not.contain', 'Because you have multiple AI agents enabled, you will be able to choose between “Adaptive Mode”');

      // Check that both Rancher Agent and Fleet Agent are enabled and locked (they are built-in agents)
      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid="${ initValues.rancherAgent }"]`);
      aiAgentConfigs.self().should('contain', 'This AI agent is locked');

      aiAgentConfigs.tabs().clickTabWithName(initValues.fleetAgent);
      aiAgentConfigs.self().should('contain', 'This AI agent is locked');

      // Add a custom AI Agent
      aiAgentConfigs.tabs().addTab();

      aiAgentConfigs.tabs().getTab(updatedValues.customAgent).checkExists();

      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid="${ updatedValues.customAgent }"]`);
      aiAgentConfigs.self().should('not.contain', 'This AI agent is locked');

      // We now have 2 enabled agents (Rancher Agent + custom agent), so the multiple agents info message should be shown
      aiAgentConfigs.self().should('contain', 'Because you have multiple AI agents enabled, you will be able to choose between “Adaptive Mode”');

      // Check that Save button is disabled since the new agent has validation errors -> missing MCP URL
      settingsPage.settings().saveButton().should('be.disabled');

      // Fill the MCP URL for the custom agent and check that the Save button is enabled
      aiAgentConfigs.mcpUrlInput().set('http://my-mcp-url:8080');
      settingsPage.settings().saveButton().should('be.enabled');

      settingsPage.settings().saveButton().click();

      // Check that the new agent tab is showing error status due to invalid MCP URL
      aiAgentConfigs.tabs().assertTabHasLabelIcon(`[data-testid="${ updatedValues.customAgent }"]`, 'icon-error');

      // Revisit the page to check if the settings were saved correctly
      settingsPage.goTo();
      settingsPage.waitForPage();

      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid="${ updatedValues.customAgent }"]`);
      aiAgentConfigs.mcpUrlInput().value().should('eq', 'http://my-mcp-url:8080');

      // Check that the new agent tab is showing error status due to invalid MCP URL
      aiAgentConfigs.tabs().assertTabHasLabelIcon(`[data-testid="${ updatedValues.customAgent }"]`, 'icon-error');

      // Remove the custom AI Agent
      aiAgentConfigs.tabs().removeTab();

      aiAgentConfigs.tabs().getTab(updatedValues.customAgent).checkNotExists();
      aiAgentConfigs.self().should('not.contain', 'Because you have multiple AI agents enabled, you will be able to choose between “Adaptive Mode”');

      settingsPage.settings().saveButton().click();

      // Revisit the page to check if the settings were saved correctly
      settingsPage.goTo();
      settingsPage.waitForPage();

      aiAgentConfigs.tabs().getTab(updatedValues.customAgent).checkNotExists();
      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid="${ initValues.rancherAgent }"]`);
    });
  });
});
