import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import TooltipPo from '@/cypress/e2e/po/components/tooltip.po';

const CHAT_ITEM_MENU_BUTTON = '[data-testid="rancher-ai-ui-chat-history-chat-item-menu-button"]';
const CHAT_ITEM_NAME = '[data-testid="rancher-ai-ui-chat-history-item-name"]';

// Matches chat items only: the shared `chat-item-` prefix also covers the menu button and its
// dropdown options, so those are excluded explicitly.
const CHAT_ITEM_SELECTOR = '[data-testid^="rancher-ai-ui-chat-history-chat-item-"]:not([data-testid*="menu-button"])';

export class HistoryChatItemMenuActionPo extends ComponentPo {
  constructor(actionId: string) {
    super(`[data-testid="rancher-ai-ui-chat-history-chat-item-menu-button-option-${ actionId }"]`);
  }

  doAction() {
    this.self().click({ force: true });
  }
}

export class HistoryChatItemMenuPo extends ComponentPo {
  // Scoped to its own item: the menu button is rendered per hovered item, so a document-wide
  // lookup can match more than one once several items have been hovered.
  constructor(item: HistoryChatItemPo) {
    super(() => item.self().find(CHAT_ITEM_MENU_BUTTON));
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
    // find, not get: get queries the whole document and would match every item's name span.
    return this.self().find(CHAT_ITEM_NAME);
  }

  nameInput() {
    return cy.get('[data-testid="rancher-ai-ui-chat-history-item-name-input"]');
  }

  tooltip() {
    return new TooltipPo();
  }

  menu() {
    // The per-item menu button is only rendered while the item is hovered (the item's @mouseover
    // handler sets the hover flag). Dispatch mouseover synthetically instead of simulating a real
    // hover (realHover/realMouseUp), which is flaky in CI, so the button reliably renders.
    this.self().scrollIntoView();
    this.self().trigger('mouseover');

    return new HistoryChatItemMenuPo(this);
  }

  select() {
    this.self().click();
  }

  showTooltip() {
    // The name tooltip (v-clean-tooltip / floating-vue) is bound to the name span and opens on its
    // mouseenter event. Dispatch mouseenter synthetically - the proven @rancher/cypress TooltipPo
    // pattern - rather than simulating a real hover (realHover/realMouseUp), which is ~50% flaky in
    // CI because it depends on cursor position, scroll and hover timing. Scope with find (not get,
    // which queries the whole document and would match every item's name span).
    this.self().find(CHAT_ITEM_NAME).scrollIntoView();
    this.self().find(CHAT_ITEM_NAME).trigger('mouseenter');
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
    // The `chat-item-` prefix also matches the per-item menu button and its dropdown options
    // (`...chat-item-menu-button`, `...chat-item-menu-button-option-*`), which stay mounted while
    // an item is hovered - so a bare prefix match counts menu elements as chats. Exclude them, and
    // scope with find (get would query the whole document, picking up the teleported dropdown).
    return this.self().find(CHAT_ITEM_SELECTOR);
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