import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class BubbleButtonPo extends ComponentPo {
  private readonly icon: string;
  private readonly parentEl: Cypress.Chainable;

  constructor(icon: string, parent: Cypress.Chainable) {
    super(`[data-testid="rancher-ai-ui-bubble-btn-${ icon }"]`, parent);
    this.icon = icon;
    this.parentEl = parent;
  }

  // Override self() to scope within the parent element so the correct button
  // is targeted when multiple messages with the same button type are visible.
  self() {
    return this.parentEl.find(`[data-testid="rancher-ai-ui-bubble-btn-${ this.icon }"]`);
  }

  click() {
    this.self().first().click({ force: true });
  }
}