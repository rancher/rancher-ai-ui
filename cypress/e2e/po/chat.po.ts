import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import HeaderPo from '@/cypress/e2e/po/components/header.po';

export default class ChatPo extends ComponentPo {
  rancherHeader: HeaderPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-container"]');
    this.rancherHeader = new HeaderPo();
  }

  isOpen(): Cypress.Chainable<boolean> {
    return this.self().should('exist');
  }

  isClosed(): Cypress.Chainable<boolean> {
    return this.self().should('not.exist');
  }

  open() {
    this.rancherHeader.askLizButton().click();
    this.isOpen();
  }

  close() {
    this.self().find('[data-testid="rancher-ai-ui-chat-close-button"]').click();
    this.isClosed();
  }

  messages() {
    return this.self().get('[data-testid^="rancher-ai-ui-chat-message"]');
  }

  getMessage(index: number) {
    return this.messages().eq(index);
  }

  getTemplateMessage(templateName: string) {
    return this.self().find(`[data-testid="rancher-ai-ui-chat-message-template-${ templateName }"]`);
  }
}
