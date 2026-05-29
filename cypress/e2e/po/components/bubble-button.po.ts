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
    // Use .within() to guarantee the click is scoped to the parent message element.
    // This prevents .first() from picking the first matching button across all messages
    // when the same button type (e.g. icon-copy) appears on multiple messages.
    this.parentEl.within(() => {
      cy.get(`[data-testid="rancher-ai-ui-bubble-btn-${ this.icon }"]`).click({ force: true });
    });
  }
}