import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class HeaderPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-chat-header"]');
  }

  closeButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-close-button"]');
  }

  historyButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-history-button"]');
  }
}