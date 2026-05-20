import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class BubbleButtonPo extends ComponentPo {
  constructor(icon: string, parent: Cypress.Chainable) {
    super(`[data-testid="rancher-ai-ui-bubble-btn-${ icon }"]`, parent);
  }

  click() {
    this.self().first().click({ force: true });
  }
}