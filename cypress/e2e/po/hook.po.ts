import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

class TargetPo extends ComponentPo {
  constructor(element: Cypress.Chainable) {
    super(element);
  }

  /**
   * Checks if the target element has an action registered for its hook.
   */
  isReady() {
    this.self().get('[ux-context-hook-status="bound"]').should('exist');
  }
}

class HookPo {
  protected target: TargetPo;

  constructor(target: Cypress.Chainable) {
    this.target = new TargetPo(target);
  }
}

export class SlidingBadgePo extends HookPo {
  click() {
    this.target.isReady();

    // Trigger mouse enter on the target element to reveal the sliding badge's first stage
    this.target.self().trigger('mouseenter', { force: true });

    // Trigger mouse enter on the sliding badge to reveal its second stage
    const slidingBadge = this.target.self().get('[data-testid="rancher-ai-ui-sliding-badge"]');

    slidingBadge.trigger('mouseenter', { force: true });

    slidingBadge.click();
  }
}
