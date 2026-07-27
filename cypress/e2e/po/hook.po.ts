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
  static hooks() {
    return cy.get('[ux-context-hook-status="bound"]');
  }

  static overlays() {
    return cy.get('[data-testid="rancher-ai-ui-hook-overlay"]');
  }

  overlay() {
    return this.target.self().get('[data-testid="rancher-ai-ui-hook-overlay"]');
  }

  showFirstStage() {
    this.target.isReady();

    // Trigger mouse enter on the target element to reveal the sliding badge's first stage
    this.target.self().trigger('mouseenter', { force: true });

    this.overlay().should('exist');
  }

  showSecondStage() {
    this.showFirstStage();

    // Trigger mouse enter on the sliding badge to reveal its second stage
    this.overlay().trigger('mouseenter', { force: true });

    // Wait for the overlay to expand
    this.overlay().invoke('width').should('be.greaterThan', 70);
  }

  dismiss() {
    this.overlay().trigger('mouseleave', { force: true });

    // Wait for the sliding badge to be dismissed (> 150ms)
    cy.wait(300);

    this.overlay().should('not.exist');
  }

  click() {
    this.showSecondStage();

    this.overlay().click({
      force:    true,
      multiple: true
    });
  }
}
