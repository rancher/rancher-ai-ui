import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class DeleteChatPromptPo extends ComponentPo {
  constructor() {
    super(cy.get('[data-testid="card"].prompt-remove'));
  }

  confirmButton() {
    return this.self().getId('prompt-remove-confirm-button');
  }

  confirm() {
    return this.confirmButton().click();
  }
}