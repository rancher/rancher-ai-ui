import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class ContextPo extends ComponentPo {
  constructor() {
    super('.chat-context');
  }

  panel() {
    return this.self();
  }

  tag(value: string) {
    return cy.get(`[data-testid="rancher-ai-ui-context-tag-${ value }"]`);
  }

  removeTag(value: string) {
    return this.tag(value).parent('.vs__selected').find('.vs__deselect').click();
  }

  addContextTrigger() {
    return cy.get('.context-trigger');
  }

  resetButton() {
    return cy.get('.context-reset button');
  }

  noContextLabel() {
    return cy.get('.no-context');
  }

  isDisabled() {
    return cy.get('.chat-context.disabled-panel').should('exist');
  }
}
