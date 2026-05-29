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
