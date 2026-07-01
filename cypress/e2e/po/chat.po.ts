import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import { HeaderPo } from '@/cypress/e2e/po/header.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';
import ContextPo from '@/cypress/e2e/po/context.po';
import MessagesPo from '@/cypress/e2e/po/messages.po';

export default class ChatPo extends ComponentPo {
  rancherHeader: RancherHeaderPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-container"]');
    this.rancherHeader = new RancherHeaderPo();
  }

  processingState(label?: string) {
    if (label) {
      return this.self().get(`[data-testid="rancher-ai-ui-processing-connection-state-${ label.toLowerCase().replace(/\s/g, '-') }"]`);
    }

    return this.self().get('[data-testid^="rancher-ai-ui-processing-connection-state-"]');
  }

  header() {
    return new HeaderPo();
  }

  messagesPanel() {
    return new MessagesPo();
  }

  context() {
    return new ContextPo();
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
