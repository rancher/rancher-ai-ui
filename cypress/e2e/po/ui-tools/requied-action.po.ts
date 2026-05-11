import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class RequiredActionPo extends ComponentPo {
  constructor() {
    super(`[data-testid="rancher-ai-ui-required-tools-action-message"]`);
  }

  containsText(value: string) {
    return this.self().within(() => {
      cy.contains(value).should('be.visible', { timeout: 10000 });
    });
  }

  actionLink() {
    return this.self().find('a.clickable-label');
  }
}