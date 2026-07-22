import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class ContextPo extends ComponentPo {
  constructor() {
    super('.chat-context');
  }

  panel() {
    return this.self();
  }

  tag(label: string) {
    return this.self().find(`[data-testid="rancher-ai-ui-context-tag-${ label }"]`);
  }

  removeTag(label: string) {
    return this.tag(label).parent('.vs__selected').find('.vs__deselect').click();
  }

  /**
   * Removes the first visible context tag.
   * Uses vue-select's internal .vs__deselect button within selected tags.
   */
  removeFirstTag() {
    return this.self().find('.vs__selected.tag .vs__deselect').first().click();
  }

  addContextTrigger() {
    return this.self().find('.context-trigger');
  }

  openDropdown() {
    return this.self().find('.context-trigger').click();
  }

  /**
   * Selects an item from the context dropdown.
   * Uses floating-vue's .v-popper__popper since the dropdown is teleported outside the component tree.
   */
  selectDropdownItem(label: string) {
    return cy.get('.v-popper__popper').filter(':visible').contains(label).click();
  }

  dropdownItem(label: string) {
    return cy.get(`[data-testid="rancher-ai-ui-context-dropdown-item-${ label }"]`);
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

  isDisabled() {
    return this.self().should('have.class', 'disabled-panel');
  }

  isNotDisabled() {
    return this.self().should('not.have.class', 'disabled-panel');
  }
}
