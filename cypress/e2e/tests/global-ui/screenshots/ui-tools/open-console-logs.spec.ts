import { NamespaceFilterPo } from '@rancher/cypress/e2e/po/components/namespace-filter.po';
import { WorkloadsDeploymentsDetailsPagePo, WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { getSpecName, Screenshot } from '~/cypress/e2e/utils';

describe(`UI tool: ${ getSpecName() }`, () => {
  const namespaceFilter = new NamespaceFilterPo();
  const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local');
  const chat = new ChatPo();

  const screenshot = new Screenshot();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });

  it('screenshots', () => {
    cy.setFullScreen();

    cy.login();

    HomePagePo.goTo();

    // Navigate to deployments page to get the pod name
    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    cy.wait(200);

    namespaceFilter.toggle();
    namespaceFilter.clickOptionByLabel('cattle-ai-agent-system');
    namespaceFilter.closeDropdown();

    cy.wait(200);

    deploymentsListPage.goToDetailsPage('llm-mock');

    const deploymentDetailsPage = new WorkloadsDeploymentsDetailsPagePo('llm-mock', 'local', 'apps.deployment' as any, 'cattle-ai-agent-system');

    deploymentDetailsPage.waitForPage();

    // Get the pod name from pods table
    cy.get('[data-testid="sortable-cell-0-1"] a').first().invoke('text').then((text) => {
      const podName = text.trim();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.checkExists();

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:      ['Check the logs:'],
        uiTools:   [
          {
            name: 'open-console-logs',
            args: {
              cluster:       'local',
              namespace:     'cattle-ai-agent-system',
              name:          podName,
              containerName: 'llm-mock',
            }
          }
        ]
      });

      chat.sendMessage(`Show me the logs`);

      const resultMessage = chat.getMessage(3);

      resultMessage.isCompleted();

      const tool = resultMessage.tool().openConsoleLogs('local', 'cattle-ai-agent-system', podName, 'llm-mock');

      cy.wait(1000);

      // Show tooltip
      tool.realMouseUp();

      cy.wait(2000);

      tool.should('be.visible');

      screenshot.take();

      tool.realClick();

      // Wait for the console logs to load and display the pod name in the header
      cy.get(`[data-testid="horizontal-window-manager"]`).should('contain.text', podName).should('be.visible');

      resultMessage.scrollIntoView();

      cy.wait(1000);

      resultMessage.self().realClick();

      cy.wait(2000);

      tool.should('be.visible');

      screenshot.take();
    });
  });

  after(() => {
    cy.login();

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    namespaceFilter.toggle();
    namespaceFilter.clickOptionByLabel('Only User Namespaces');
    namespaceFilter.closeDropdown();

    cy.uninstallUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });
});
