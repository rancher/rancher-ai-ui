import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { getSpecName, Screenshot } from '@/cypress/e2e/utils';

describe(`UI tool: ${ getSpecName() }`, () => {
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

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.checkExists();

    welcomeMessage.isCompleted();

    welcomeMessage.self().realClick();

    cy.enqueueLLMResponse({
      text:      ['Here are the options:'],
      uiTools:   [
        {
          name: 'select-option',
          args: {
            label:   'Select the namespace:',
            option1: 'default',
            option2: 'cattle-ai-agent-system',
            option3: 'cattle-system',
          }
        }
      ]
    });

    chat.sendMessage('Show me the options');

    const resultMessage = chat.getMessage(3);

    resultMessage.isCompleted();

    const tool = resultMessage.tool().selectOption(2).label();

    tool.scrollIntoView().should('be.visible');

    cy.wait(1000);

    // Show highlited label
    tool.realMouseUp();

    cy.wait(2000);

    tool.should('be.visible');

    screenshot.take();

    cy.enqueueLLMResponse({ text: 'Selected namespace: cattle-system' });

    tool.realClick();

    cy.wait(1000);

    const resultMessage2 = chat.getMessage(5);

    resultMessage2.isCompleted();

    resultMessage2.scrollIntoView();

    // TODO add chat.processingLabel() not to be visible and remove wait
    cy.wait(1000);

    resultMessage2.self().should('be.visible');

    tool.should('be.visible');

    screenshot.take();
  });

  after(() => {
    cy.login();
    cy.uninstallUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });
});
