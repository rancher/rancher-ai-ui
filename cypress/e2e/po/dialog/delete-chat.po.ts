import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class DeleteChatPromptPo extends ComponentPo {
  constructor() {
    super(cy.get('[data-testid="modal-manager-component"].prompt-remove'));
  }

  confirm() {
    return this.self().getId('prompt-remove-confirm-button').click();
  }
}