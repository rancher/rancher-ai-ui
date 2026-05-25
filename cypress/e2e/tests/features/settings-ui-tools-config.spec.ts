import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';
import ApplySettingsPromptPo from '@/cypress/e2e/po/dialog/apply-settings.po';

describe('Feature: settings-ui-tools-config', () => {
  const settingsPage = new SettingsPagePo();

  beforeEach(() => {
    cy.login();
    cy.installUIToolsDefinition();
    settingsPage.goTo();
    settingsPage.waitForPage();
  });

  afterEach(() => {
    cy.cleanChatHistory();
  });

  it('Test 1: UI Tools configuration section is visible on the settings page', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.self().should('be.visible');
    uiToolsConfig.self().contains('Enable Tools').should('be.visible');
    uiToolsConfig.self().contains('Available Tools').should('be.visible');
    uiToolsConfig.searchInput().should('have.attr', 'placeholder', 'Search the tool...').and('be.visible');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-1-section-visible');
  });

  describe('Install UI Tools banner (tools not installed)', () => {
    beforeEach(() => {
      cy.uninstallUIToolsDefinition();
      settingsPage.goTo();
      settingsPage.waitForPage();
    });

    afterEach(() => {
      cy.installUIToolsDefinition();
    });

    it('Test 2: Install UI Tools action banner and button are shown when tools are not installed', () => {
      const uiToolsConfig = settingsPage.settings().uiToolsConfig();

      uiToolsConfig.self().scrollIntoView();
      uiToolsConfig.intro().self().should('be.visible');
      uiToolsConfig.intro().infoBanner().should('be.visible');
      uiToolsConfig.intro().actionButton().should('contain.text', 'Install UI Tools');
      uiToolsConfig.toolsGrid().should('not.exist');

      cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-2-install-banner');
    });
  });

  it('Test 3: Enable/disable the UI Tools toggle and save', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.enabledCheckbox().isChecked();

    uiToolsConfig.enabledCheckbox().set(false);

    settingsPage.settings().saveButton().click();
    new ApplySettingsPromptPo().confirm();
    settingsPage.settings().saveButton().should('contain.text', 'Saved');

    settingsPage.goTo();
    settingsPage.waitForPage();
    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.enabledCheckbox().isUnchecked();

    // Restore original state
    uiToolsConfig.enabledCheckbox().set(true);
    settingsPage.settings().saveButton().click();
    new ApplySettingsPromptPo().confirm();
    settingsPage.settings().saveButton().should('contain.text', 'Saved');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-3-enable-tools-toggle');
  });

  it('Test 4: Update and reset the Guidelines (system prompt) field', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.guidelinesTextarea().clear().type('Custom guidelines for testing');
    uiToolsConfig.resetConfigButton().should('be.visible');

    uiToolsConfig.resetConfigButton().click();
    uiToolsConfig.resetConfigButton().should('not.exist');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-4-guidelines-reset');
  });

  it('Test 5: Tools list displays all available tools with name, description and version badge', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolsGrid().should('be.visible');
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 0);
    uiToolsConfig.toolCard('Show YAML').should('be.visible');
    uiToolsConfig.toolCard('Show YAML').find('.version-badge').should('exist');
    uiToolsConfig.toolCard('Show YAML').find('.toggle-enable-tool').should('exist');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-5-tools-list');
  });

  it('Test 6: Search filters the tools list by name', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 1);

    uiToolsConfig.searchInput().type('yaml');
    uiToolsConfig.toolCard('Show YAML').should('be.visible');
    cy.contains('.tools-grid', 'Suggestions').should('not.exist');

    uiToolsConfig.searchInput().clear();
    cy.contains('.tools-grid', 'Suggestions').should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-6-search-filter');
  });

  it('Test 7: Category filter filters the tools list', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 0);

    uiToolsConfig.toolsGrid().find('.item-card').first().find('.app-chart-card-footer-button').first().click();
    uiToolsConfig.resetFiltersLink().should('be.visible').and('contain.text', 'Clear all filters');

    uiToolsConfig.resetFiltersLink().click();
    uiToolsConfig.resetFiltersLink().should('not.exist');
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 0);

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-7-category-filter');
  });

  it('Test 8: Enable/disable individual tool via toggle switch and save', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolToggle('Suggestions').should('be.visible');

    // Disable the Suggestions tool
    uiToolsConfig.toolToggle('Suggestions').click();
    uiToolsConfig.resetConfigButton().should('be.visible');

    settingsPage.settings().saveButton().click();
    new ApplySettingsPromptPo().confirm();
    settingsPage.settings().saveButton().should('contain.text', 'Saved');

    settingsPage.goTo();
    settingsPage.waitForPage();
    uiToolsConfig.self().scrollIntoView();

    // After reload the toggle should be OFF (has-no-value / disabled state)
    uiToolsConfig.toolToggle('Suggestions').should('not.have.class', 'toggle-on');

    // Restore: re-enable Suggestions
    uiToolsConfig.toolToggle('Suggestions').click();
    settingsPage.settings().saveButton().click();
    new ApplySettingsPromptPo().confirm();
    settingsPage.settings().saveButton().should('contain.text', 'Saved');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-8-toggle-tool');
  });
});
