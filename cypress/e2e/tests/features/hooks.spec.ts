import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import { WorkLoadsPodDetailsPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads-pods.po';

import { SlidingBadgePo } from '@/cypress/e2e/po/hook.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '../../po/history.po';
import { errorPod } from '@/cypress/e2e/blueprints/pod';

describe('Hooks', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  beforeEach(() => {
    cy.login();
    cy.cleanChatHistory();
  });

  describe('Sliding badge hook', () => {
    before(() => {
      cy.login();
      cy.createRancherResource('v1', 'pods', JSON.stringify(errorPod), false);
    });

    it('It should activate the sliding badge from: Sortable Table row', () => {
      const homePage = new HomePagePo();

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

      history.open();

      const chatItem = history.chatItem(0);

      chatItem.self().contains('Please analyse the Cluster "local" and troubleshoot any problems.');

      chatItem.showTooltip();

      chatItem.tooltip().containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
      chatItem.tooltip().notContainsText('Explain what the "active" state means');
      chatItem.tooltip().containsText('Started on');
    });

    it('It should activate the sliding badge from: Details State banner', () => {
      const podDetails = new WorkLoadsPodDetailsPagePo(errorPod.metadata.name);

      podDetails.goTo();
      podDetails.waitForPage();

      // Remove title from pod details page to make sure the sliding badge is visible
      podDetails.self().get('.resource-name.masthead-resource-title').invoke('remove');

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const slidingBadge = new SlidingBadgePo('.title > .badge-state.bg-info');

      slidingBadge.click();

      const message = chat.getMessage(2);

      message.containsText('Please analyse the Pod "error-pod" and troubleshoot any problems.');
      message.containsText('See More');

      const response = chat.getMessage(3);

      response.isCompleted();

      history.open();

      const chatItem = history.chatItem(0);

      chatItem.self().contains('Please analyse the Pod "error-pod" and troubleshoot any problems.');

      chatItem.showTooltip();

      chatItem.tooltip().containsText('Please analyse the Pod "error-pod" and troubleshoot any problems.');
      chatItem.tooltip().notContainsText('Explain what');
      chatItem.tooltip().containsText('Started on');
    });

    it('It should activate the sliding badge from: Status banner', () => {
      const podDetails = new WorkLoadsPodDetailsPagePo(errorPod.metadata.name);

      podDetails.goTo();
      podDetails.waitForPage();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const slidingBadge = new SlidingBadgePo('[data-testid="banner-content"]');

      slidingBadge.click();

      const message = chat.getMessage(2);

      message.containsText('Hey Liz, please analyse the "containers with unready status: [container-0]" message and troubleshoot any problems.');
      message.containsText('See More');

      const response = chat.getMessage(3);

      response.isCompleted();

      history.open();

      const chatItem = history.chatItem(0);

      chatItem.self().contains('Hey Liz, please analyse the "containers with unready status: [container-0]" message and troubleshoot any problems.');

      chatItem.showTooltip();

      chatItem.tooltip().containsText('Hey Liz, please analyse the "containers with unready status: [container-0]" message and troubleshoot any problems.');
      chatItem.tooltip().notContainsText('Explain what');
      chatItem.tooltip().containsText('Started on');
    });

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

    after(() => {
      cy.deleteRancherResource('v1', 'pods', `${ errorPod.metadata.namespace }/${ errorPod.metadata.name }`, false);
    });
  });

  after(() => {
    cy.cleanChatHistory();
  });
});
