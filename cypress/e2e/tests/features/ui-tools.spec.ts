import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';
import RequiredActionPo from '@/cypress/e2e/po/ui-tools/requied-action.po';
import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';

describe('UI Tools', () => {
  const chat = new ChatPo();

  describe('Required action: installation', () => {
    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();
    });

    it('It should show required action when tools definition is not installed', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.containsText('Install the UI tools to enable full AI capabilities.');
      requiredAction.actionLink().should('be.visible');
    });

    it('It should not show required action when tools definition is installed', () => {
      cy.installUIToolsDefinition();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.checkNotExists();

      cy.uninstallUIToolsDefinition();
    });

    it('It should navigate to settings when clicking on the install link', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      settingsPage.settings().uiToolsConfig().intro().self()
        .should('be.visible');
    });

    it('It should hide the required action when tools definition is installed', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      const intro = settingsPage.settings().uiToolsConfig().intro();

      intro.self().should('be.visible');
      intro.actionButton().click();

      requiredAction.checkNotExists();
    });

    after(() => {
      cy.uninstallUIToolsDefinition();
    });
  });

  describe('Required action: refresh', () => {
    before(() => {
      cy.login();
      cy.installUIToolsDefinition();
      cy.updateUIToolsDefinition();
    });

    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();
    });

    it('It should show required action when tools definition has updates available', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.containsText('The UI tools are disabled due to definition change.');
      requiredAction.actionLink().should('be.visible');
    });

    it('It should navigate to settings when clicking on the refresh link', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      settingsPage.settings().uiToolsConfig().intro().self()
        .should('be.visible');
    });

    it('It should hide the required action when clicking on the refresh link', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      const intro = settingsPage.settings().uiToolsConfig().intro();

      intro.self().should('be.visible');
      intro.actionButton().click();

      requiredAction.checkNotExists();
    });

    after(() => {
      cy.uninstallUIToolsDefinition();
    });
  });

  describe('Tool: suggestions', () => {
    before(() => {
      cy.login();
      cy.installUIToolsDefinition();
    });

    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('Show the list of suggestions', () => {
      cy.enqueueLLMResponse({
        text:      ['Here', ' are the suggestions.'],
        uiTools:   [
          {
            name: 'suggestions',
            args: {
              suggestion1: 'Show me the resources',
              suggestion2: 'The list of clusters',
              suggestion3: 'Another suggestion',
            }
          }
        ]
      });

      chat.sendMessage('Show me the suggestions');

      const userMessage = chat.getMessage(2);

      userMessage.scrollIntoView();
      userMessage.containsText('Show me the suggestions');

      const resultMessage = chat.getMessage(3);

      resultMessage.option(0).scrollIntoView().should('be.visible').and('contain.text', 'Show me the resources');
      resultMessage.option(1).scrollIntoView().should('be.visible').and('contain.text', 'The list of clusters');
      resultMessage.option(2).scrollIntoView().should('be.visible').and('contain.text', 'Another suggestion');

      // TODO: add check for edit mode and send message on click
    });

    after(() => {
      cy.clearLLMResponses();
      cy.uninstallUIToolsDefinition();
    });
  });

  /**
   * TODO
   *
   *  - verify multiple tools in the same response
   *  - verify suggestions vs select-option mutual exclusion
   *  - add the tests for the staging page (show-yaml, show-yaml-diff)
   */
  describe.skip('Tool: select-option', () => {});
  describe.skip('Tool: explore', () => {});
  describe.skip('Tool: open-console-logs', () => {});
  describe.skip('Tool: show-yaml', () => {});
  describe.skip('Tool: show-yaml-diff', () => {});
});
