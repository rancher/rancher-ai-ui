import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import { MessagePo } from '@/cypress/e2e/po/message.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';

export default class ChatPo extends ComponentPo {
  rancherHeader: RancherHeaderPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-container"]');
    this.rancherHeader = new RancherHeaderPo();
  }

  phase(label: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-processing-phase-${ label }"]`);
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

  isReady() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-panel-ready"]').should('exist');
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

  toggleHistory() {
    this.historyButton().click();
  }

  getMessage(id: string | number) {
    return new MessagePo(id.toString());
  }

  sendMessage(value: string) {
    this.console().sendMessage(value);
  }
}
