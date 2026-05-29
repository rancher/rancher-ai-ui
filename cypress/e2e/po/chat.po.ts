import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import { MessagePo, ErrorMessagePo } from '@/cypress/e2e/po/message.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';

export default class ChatPo extends ComponentPo {
  rancherHeader: RancherHeaderPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-container"]');
    this.rancherHeader = new RancherHeaderPo();
  }

  phase(label: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-processing-phase-${ label.toLowerCase().replace(/\s/g, '-') }"]`);
  }

  closeButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-close-button"]');
  }

  historyButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-history-button"]');
  }

  console() {
    return new ConsolePo();
  }

  scrollButton() {
    return new ComponentPo('[data-testid="rancher-ai-ui-scroll-button"]');
  }

  isReady(timeout = 10000) {
    return this.self().get('[data-testid="rancher-ai-ui-chat-panel-ready"]', { timeout }).should('exist');
  }

  isNotReady(timeout = 10000) {
    return this.self().get('[data-testid="rancher-ai-ui-chat-panel-not-ready"]', { timeout }).should('exist');
  }

  isOpen(): Cypress.Chainable<boolean> {
    return this.checkExists();
  }

  isClosed(): Cypress.Chainable<boolean> {
    return this.checkNotExists();
  }

  open() {
    this.rancherHeader.askLizButton().click();
    this.isOpen();
  }

  close() {
    this.closeButton().click();
    this.isClosed();
  }

  openHistory() {
    this.historyButton().click();
  }

  openViaKeyboard() {
    const isMac = Cypress.platform === 'darwin';

    // Use trigger('keydown') on the body to dispatch keyboard events reliably in CI headless mode.
    // cy.realPress does not fire events that reach Rancher's plugin.addAction shortcut handler.
    if (isMac) {
      cy.get('body').focus().trigger('keydown', { metaKey: true, shiftKey: true, key: 'k', keyCode: 75 });
    } else {
      cy.get('body').focus().trigger('keydown', { altKey: true, key: 'k', keyCode: 75 });
    }
    this.isOpen();
  }

  closeViaKeyboard() {
    const isMac = Cypress.platform === 'darwin';

    // Use trigger('keydown') on the body — consistent with openViaKeyboard.
    if (isMac) {
      cy.get('body').focus().trigger('keydown', { metaKey: true, shiftKey: true, key: 'k', keyCode: 75 });
    } else {
      cy.get('body').focus().trigger('keydown', { altKey: true, key: 'k', keyCode: 75 });
    }
    this.isClosed();
  }

  getMessage(id: string | number) {
    return new MessagePo(id.toString());
  }

  getErrorMessage(index: number) {
    return new MessagePo(index.toString());
  }

  getSystemErrorMessage(index: number) {
    return new ErrorMessagePo(index.toString());
  }

  sendMessage(value: string) {
    this.console().sendMessage(value);
  }
}
