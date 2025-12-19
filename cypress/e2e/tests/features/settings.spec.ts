import { SettingsPagePo } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';
import ProductNavPo from '@rancher/cypress/e2e/po/side-bars/product-side-nav.po';

describe('Chat', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Settings', () => {
    it('Should show AI Assistant settings', () => {
      const settingsPage = new SettingsPagePo('_');

      settingsPage.goTo();
      settingsPage.waitForPage();

      const sideNav = new ProductNavPo();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      cy.contains('AI Chatbot Provider').should('be.visible');
    });
  });
});
