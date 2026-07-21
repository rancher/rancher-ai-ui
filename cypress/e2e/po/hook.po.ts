import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

class TargetPo extends ComponentPo {
  /**
   * Checks if the target element has an action registered for its hook.
   */
  isReady() {
    this.self().get('[ux-context-hook-status="bound"]').should('exist');
  }
}

class HookPo {
  protected target: TargetPo;

  constructor(target: string | Cypress.Chainable) {
    this.target = new TargetPo(target as any);
  }
}

export class SlidingBadgePo extends HookPo {
  click() {
    this.target.isReady();

    // Trigger mouse enter on the target element to reveal the sliding badge's first stage.
    // Scope to the first match: the target selector can transiently match more than one badge
    // while the resource's state is still settling (e.g. an extra bg-info badge during load).
    this.target.self().first().trigger('mouseenter', { force: true });

    // Trigger mouse enter on the sliding badge to reveal its second stage. Scope to the first
    // overlay too - a transient second matching badge produces a second overlay.
    const slidingBadge = this.target.self().get('[data-testid="rancher-ai-ui-hook-overlay"]').first();

    slidingBadge.trigger('mouseenter', { force: true });

    slidingBadge.click({ force: true });
  }
}
