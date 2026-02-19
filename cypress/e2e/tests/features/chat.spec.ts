import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ClusterDashboardPagePo from '@rancher/cypress/e2e/po/pages/explorer/cluster-dashboard.po';
import ClusterManagerListPagePo from '@rancher/cypress/e2e/po/pages/cluster-manager/cluster-manager-list.po';
import { FleetDashboardListPagePo } from '@rancher/cypress/e2e/po/pages/fleet/fleet-dashboard.po';
import UsersPo from '@rancher/cypress/e2e/po/pages/users-and-auth/users.po';
import ExtensionsPagePo from '@rancher/cypress/e2e/po/pages/extensions.po';
import ProductNavPo from '@rancher/cypress/e2e/po/side-bars/product-side-nav.po';
import { SettingsPagePo as GlobalSettings } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';
import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import ApplySettingsPromptPo from '@/cypress/e2e/po/dialog/apply-settings.po';

describe('Chat', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
  });

  describe('Availability across UI products', () => {
    it('Home', () => {
      HomePagePo.goTo();

      chat.open();
      chat.close();
    });

    it('Cluster dashboard', () => {
      const localClusterDashboard = new ClusterDashboardPagePo('local');

      localClusterDashboard.goTo();

      chat.open();
      chat.close();
    });

    it('Cluster management', () => {
      const clusterList = new ClusterManagerListPagePo();

      clusterList.goTo();
      clusterList.waitForPage();

      chat.open();
      chat.close();
    });

    it('Fleet', () => {
      const fleetDashboardPage = new FleetDashboardListPagePo('_');

      fleetDashboardPage.goTo();
      fleetDashboardPage.waitForPage();

      chat.open();
      chat.close();
    });

    it('Users', () => {
      const usersPo = new UsersPo();

      usersPo.goTo();
      usersPo.waitForPage();

      chat.open();
      chat.close();
    });

    it('Extensions', () => {
      const extensionsPo = new ExtensionsPagePo();

      extensionsPo.goTo();
      extensionsPo.waitForPage();

      chat.open();
      chat.close();
    });

    it('Settings', () => {
      const settingsPage = new GlobalSettings('_');

      settingsPage.goTo();
      settingsPage.waitForPage();

      chat.open();
      chat.close();
    });
  });

  describe('Disconnections handling', () => {
    beforeEach(() => {
      cy.login();
    });

    it('it should support reconnections on settings changes', () => {
      // Go to Settings page
      const globalSettings = new GlobalSettings('_');
      const settingsPage = new SettingsPagePo();

      globalSettings.goTo();
      globalSettings.waitForPage();

      const sideNav = new ProductNavPo();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      // Open the chat
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      chat.sendMessage('User request');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('User request');

      const resultMessage = chat.getMessage(3);

      resultMessage.isCompleted();

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(4);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(5);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    it('it should support reconnections when opening the chat and settings changes are applying', () => {
      // Go to Settings page
      const globalSettings = new GlobalSettings('_');
      const settingsPage = new SettingsPagePo();

      globalSettings.goTo();
      globalSettings.waitForPage();

      const sideNav = new ProductNavPo();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      // Open the chat
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      chat.sendMessage('User request');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('User request');

      const resultMessage = chat.getMessage(3);

      resultMessage.isCompleted();

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.close();
      chat.open();

      // Reconnection should happen and the chat should be ready after that
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(4);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(5);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    it('it should handle disconnections when the ai service becomes unavailable', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.installRancherAIService({ waitForAIServiceReady: false });

      // Check for the disconnected phase and error message
      chat.isNotReady();
      chat.phase('Disconnected').should('be.visible');

      chat.getErrorMessage(1).containsText('Rancher AI Agent pod not found. Please ensure the Rancher AI assistant services are correctly installed.');

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(2);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(3);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    it('it should support reconnections when opening the chat and the AI service is unavailable', () => {
      HomePagePo.goTo();

      cy.installRancherAIService({ waitForAIServiceReady: false });

      chat.open();

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(2);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(3);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    after(() => {
      cy.installRancherAIService();
    });
  });
});
