import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import { HeaderPo } from '@/cypress/e2e/po/header.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';
import MessagesPo from '@/cypress/e2e/po/messages.po';

export default class ChatPo extends ComponentPo {
  rancherHeader: RancherHeaderPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-container"]');
    this.rancherHeader = new RancherHeaderPo();
  }

  processingState(label?: string) {
    return this.messagesPanel().processingState(label);
  }

  header() {
    return new HeaderPo();
  }

  messagesPanel() {
    return new MessagesPo();
  }

  console() {
    return new ConsolePo();
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
    this.header().closeButton().click();
    this.isClosed();
  }

  openHistory() {
    this.header().historyButton().click();
  }

  openViaKeyboard() {
    // v-shortkey disables its document listener when NODE_ENV=test (shortkey.js:208).
    // Trigger the same 'shortkey' CustomEvent that v-shortkey would dispatch,
    // exercising the @shortkey → handleExtensionAction → invoke path.
    this.rancherHeader.askLizButton().trigger('shortkey');
    this.isOpen();
  }

  closeViaKeyboard() {
    this.rancherHeader.askLizButton().trigger('shortkey');
    this.isClosed();
  }

  getMessage(id: string | number) {
    return this.messagesPanel().getMessage(id);
  }

  getErrorMessage(index: number) {
    return this.messagesPanel().getErrorMessage(index);
  }

  getSystemErrorMessage(index: number) {
    return this.messagesPanel().getSystemErrorMessage(index);
  }

  sendMessage(value: string) {
    this.console().sendMessage(value);
  }
}
