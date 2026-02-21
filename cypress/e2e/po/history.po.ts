import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import TooltipPo from '@/cypress/e2e/po/components/tooltip.po';

export class HistoryChatItemMenuActionPo extends ComponentPo {
  constructor(actionId: string) {
    super(`[data-testid="rancher-ai-ui-chat-history-chat-item-menu-button-option-${ actionId }"]`);
  }

  doAction() {
    this.self().click({ force: true });
  }
}

export class HistoryChatItemMenuPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-chat-history-chat-item-menu-button"]');
  }

  open() {
    this.self().realMouseUp();
    this.self().realClick();
  }

  doAction(actionId: string) {
    this.open();

    new HistoryChatItemMenuActionPo(actionId).doAction();
  }
}

export class HistoryChatItemPo extends ComponentPo {
  constructor(index: number) {
    super(`[data-testid="rancher-ai-ui-chat-history-chat-item-${ index }"]`);
  }

  isActive() {
    this.self().should('have.class', 'focused');
  }

  name() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-history-item-name"]');
  }

  nameInput() {
    return cy.get('[data-testid="rancher-ai-ui-chat-history-item-name-input"]');
  }

  tooltip() {
    return new TooltipPo();
  }

  menu() {
    this.self().realMouseUp();

    return new HistoryChatItemMenuPo();
  }

  select() {
    this.self().click();
  }

  showTooltip() {
    this.self().realMouseUp();
  }
}

export class HistoryPo extends ComponentPo {
  private chat: ChatPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-history-panel"]');
    this.chat = new ChatPo();
  }

  historyButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-history-header-button"]');
  }

  panelOverlay() {
    return cy.get('[data-testid="rancher-ai-ui-chat-history-panel-overlay"]');
  }

  createChatButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-history-create-chat-button"]');
  }

  chatItems() {
    return this.self().get('[data-testid^="rancher-ai-ui-chat-history-chat-item-"]');
  }

  chatItem(index: number) {
    return new HistoryChatItemPo(index);
  }

  isOpen() {
    return this.checkExists();
  }

  isClosed() {
    return this.checkNotExists();
  }

  open() {
    this.chat.openHistory();
    cy.wait(500); // Wait for panel transition
  }

  closeByClickOutside() {
    this.panelOverlay().click({ force: true });
  }

  closeByClickButton() {
    this.historyButton().click();
    cy.wait(500); // Wait for panel transition
  }

  createChat() {
    this.createChatButton().click();
  }
}