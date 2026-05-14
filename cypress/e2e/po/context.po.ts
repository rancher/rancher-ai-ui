import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class ContextTagPo extends ComponentPo {
  constructor(label: string) {
    super(`[data-testid="rancher-ai-ui-context-tag-${ label }"]`);
  }

  remove() {
    return this.self().parent().find('.vs__deselect').click();
  }
}

export default class ContextPo extends ComponentPo {
  constructor() {
    super('.chat-context');
  }

  panel() {
    return this.self();
  }

  removeTag(label: string) {
    return this.tag(label).remove();
  }

  addContextTrigger() {
    return cy.get('.context-trigger');
  }

  isDisabled() {
    return this.self().should('have.class', 'disabled-panel');
  }

  isEnabled() {
    return this.self().should('not.have.class', 'disabled-panel');
  }

  openDropdown() {
    return this.self().find('.context-trigger').click();
  }

  dropdownItem(label: string) {
    return cy.get(`[data-testid="rancher-ai-ui-context-dropdown-item-${ label }"]`);
  }

  tag(label: string) {
    return new ContextTagPo(label);
  }

  allTags() {
    return this.self().find('[data-testid^="rancher-ai-ui-context-tag-"]');
  }

  resetButton() {
    return this.self().find('.context-reset button');
  }

  noContextLabel() {
    return this.self().find('.no-context');
  }
}
