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

  after(() => {
    // This spec installs the UI tools definition in beforeEach; uninstall it so
    // subsequent specs (e.g. ui-tools.spec.ts) start from a clean, uninstalled state.
    cy.uninstallUIToolsDefinition();
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

  it('Test 2: Enable/disable the UI Tools toggle and save', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.enabledCheckbox().isChecked();

    uiToolsConfig.enabledCheckbox().set();

    settingsPage.settings().saveButton().click();
    new ApplySettingsPromptPo().confirm();
    settingsPage.settings().saveButton().should('contain.text', 'Saved');

    settingsPage.goTo();
    settingsPage.waitForPage();
    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.enabledCheckbox().isUnchecked();

    // Restore original state
    uiToolsConfig.enabledCheckbox().set();
    settingsPage.settings().saveButton().click();
    new ApplySettingsPromptPo().confirm();
    settingsPage.settings().saveButton().should('contain.text', 'Saved');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-2-enable-tools-toggle');
  });

  it('Test 3: Update and reset the Guidelines (system prompt) field', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.guidelinesTextarea().clear().type('Custom guidelines for testing');
    uiToolsConfig.resetConfigButton().should('be.visible');

    uiToolsConfig.resetConfigButton().click();
    uiToolsConfig.resetConfigButton().should('not.exist');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-3-guidelines-reset');
  });

  it('Test 4: Tools list displays all available tools with name, description and version badge', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolsGrid().should('be.visible');
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 0);
    uiToolsConfig.toolCard('Show YAML').should('be.visible');
    uiToolsConfig.toolCard('Show YAML').find('.version-badge').should('exist');
    uiToolsConfig.toolCard('Show YAML').find('.toggle-enable-tool').should('exist');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-4-tools-list');
  });

  it('Test 5: Search filters the tools list by name', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 1);

    uiToolsConfig.searchInput().type('yaml');
    uiToolsConfig.toolCard('Show YAML').should('be.visible');
    cy.contains('.tools-grid', 'Suggestions').should('not.exist');

    uiToolsConfig.searchInput().clear();
    cy.contains('.tools-grid', 'Suggestions').should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-5-search-filter');
  });

  it('Test 6: Category filter filters the tools list', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 0);

    uiToolsConfig.toolsGrid().find('.item-card').first().find('.app-chart-card-footer-button')
      .first()
      .click();
    uiToolsConfig.resetFiltersLink().should('be.visible').and('contain.text', 'Clear all filters');

    uiToolsConfig.resetFiltersLink().click();
    uiToolsConfig.resetFiltersLink().should('not.exist');
    uiToolsConfig.toolsGrid().find('.item-card').should('have.length.gt', 0);

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-6-category-filter');
  });

  it('Test 7: Enable/disable individual tool via toggle switch and save', () => {
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

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-7-toggle-tool');
  });

  it('Test 8: Tool details slide-in panel opens and displays tool information when clicking on a tool card', () => {
    const uiToolsConfig = settingsPage.settings().uiToolsConfig();

    uiToolsConfig.self().scrollIntoView();
    uiToolsConfig.toolCard('Show YAML').should('be.visible');

    // Click on the tool card to open the slide-in panel
    uiToolsConfig.toolCard('Show YAML').click();

    // Wait for slide-in panel to appear and be visible
    cy.get('[data-testid="slide-in-panel-component"]').should('be.visible');

    // Verify tool details are displayed in the slide-in
    cy.contains('View the complete YAML').should('be.visible');

    // Click outside the slide-in panel to close it
    cy.get('body').click(50, 50);

    // Verify the panel is closed
    cy.get('[data-testid="slide-in-panel-component"]').should('not.be.visible');

    cy.get('[data-testid="rancher-ai-ui-settings-tools"]').screenshot('settings-ui-tools-config-test-8-tool-details-panel');
  });
});
