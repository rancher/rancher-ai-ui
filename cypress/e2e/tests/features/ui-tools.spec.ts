import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('UI Tools', () => {
  const chat = new ChatPo();

  describe('suggestions', () => {
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
    });

    /**
     * TODO
     *
     * Suggestions:
     *  - verify edit util
     *  - verify chat send
     *
     * All:
     *  - verify multiple tools in the same response
     *  - verify exclution each other (suggestions and select-option)
     *  - and more
     */

    after(() => {
      cy.clearLLMResponses();
    });
  });
});
