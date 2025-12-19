import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import { SlidingBadgePo } from '@/cypress/e2e/po/hook.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Hooks', () => {
  const chat = new ChatPo();

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

      const message = chat.getMessage(0);

      message.should('exist');
      message.should('contain.text', 'Please analyse the Cluster "local" and troubleshoot any problems.');
      message.should('contain.text', 'See More');
    });
  });
});
