import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class ApplySettingsPromptPo extends ComponentPo {
  constructor() {
    super(cy.get('[data-testid="modal-manager-component"].prompt-apply-settings'));
  }

  confirm() {
    return this.self().getId('prompt-apply-settings-confirm-button').click();
  }
}