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
    it('It should send a message from the sliding badge when the chat is closed and ready', () => {
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

      chatItem.tooltip().containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
      chatItem.tooltip().notContainsText('Explain what the "active" state means');
      chatItem.tooltip().containsText('Started on');
    });

    it('It should send a message from the sliding badge when the chat is closed and not ready', () => {
      const homePage = new HomePagePo();

      HomePagePo.goTo();

      cy.installRancherAIService({ waitForAIServiceReady: false });

      const homeClusterList = homePage.list();

      const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

      const slidingBadge = new SlidingBadgePo(statusColumn);

      slidingBadge.click();

      chat.isOpen();

      chat.isNotReady();
      chat.isReady(20000);

      const message = chat.getMessage(1);

      message.containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
      message.containsText('See More');

      const response = chat.getMessage(2);

      response.isCompleted();
    });

    it('It should send a message from the sliding badge when the chat is open and ready', () => {
      const homePage = new HomePagePo();
      const chat = new ChatPo();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const homeClusterList = homePage.list();

      // Get the status column of the first row in the cluster list (local cluster)
      const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

      const slidingBadge = new SlidingBadgePo(statusColumn);

      slidingBadge.click();

      const message = chat.getMessage(2);

      message.containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
      message.containsText('See More');

      const response = chat.getMessage(3);

      response.isCompleted();
    });

    it('It should not send a message from the sliding badge when the chat is already open but not ready', () => {
      const homePage = new HomePagePo();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.installRancherAIService({ waitForAIServiceReady: false });

      const homeClusterList = homePage.list();

      const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

      const slidingBadge = new SlidingBadgePo(statusColumn);

      slidingBadge.click();

      chat.isReady(20000);

      chat.getMessage(2).checkNotExists();
    });
  });
});
