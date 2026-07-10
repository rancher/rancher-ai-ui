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
      text:      ['How can I assist you today?'],
      uiTools:   [
        {
          name: 'suggestions',
          args: {
            suggestion1: 'Show me the resources',
            suggestion2: 'Find my deployments',
            suggestion3: 'Analyze my clusters',
          }
        }
      ]
    });

    chat.sendMessage('Hi Liz!');

    const resultMessage = chat.getMessage(3);

    const tool = resultMessage.tool().suggestions(2).label();

    tool.scrollIntoView().should('be.visible')
      .and('contain.text', 'Analyze my clusters');

    cy.wait(1000);

    // Show highlited label
    tool.realMouseUp();

    cy.wait(2000);

    tool.should('be.visible');

    screenshot.take();

    cy.enqueueLLMResponse({ text: 'The local cluster is running smoothly.' });

    tool.realClick();

    cy.wait(1000);

    const resultMessage2 = chat.getMessage(5);

    resultMessage2.isCompleted();

    resultMessage2.scrollIntoView();

    resultMessage2.self().should('be.visible');

    tool.should('be.visible');

    // TODO add chat.processingLabel() not to be visible and remove wait
    cy.wait(1000);

    screenshot.take();
  });

  after(() => {
    cy.login();
    cy.uninstallUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });
});
