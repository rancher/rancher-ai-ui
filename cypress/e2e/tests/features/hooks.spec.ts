import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import { SlidingBadgePo } from '@/cypress/e2e/po/hook.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '../../po/history.po';

describe('Hooks', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  beforeEach(() => {
    cy.login();
  });

  describe('Sliding badge hook', () => {
    it('It should open the chat when clicking on a sliding badge', () => {
      const homePage = new HomePagePo();

      HomePagePo.goTo();

      const homeClusterList = homePage.list();

      // Get the status column of the first row in the cluster list (local cluster)
      const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

      const slidingBadge = new SlidingBadgePo(statusColumn);

      slidingBadge.click();

      chat.isOpen();

      const message = chat.getMessage(1);

      message.containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
      message.containsText('See More');

      const response = chat.getMessage(2);

      response.isCompleted();

      history.open();

      const chatItem = history.chatItem(0);

      chatItem.self().contains('Please analyse the Cluster "local" and troubleshoot any problems.');

      chatItem.showTooltip();

      chatItem.tooltip().within(() => {
        // The tooltip content should be: Summary + CreatedAt
        cy.contains('Please analyse the Cluster "local" and troubleshoot any problems.').should('be.visible');
        cy.contains('Started on').should('be.visible');

        // The message body should not be visible
        cy.contains('Explain what the "active" state means').should('not.exist');
      });
    });
  });
});
