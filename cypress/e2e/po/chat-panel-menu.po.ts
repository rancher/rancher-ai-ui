import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

/**
 * Page Object for the ⋮ chat panel menu (ChatPanelMenu.vue).
 * The menu trigger is inside .chat-console-menu-container within the chat container.
 * The dropdown content is teleported via floating-vue into .v-popper__popper (body-level).
 */
export default class ChatPanelMenuPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-chat-container"]');
  }

  /** Click the ⋮ (icon-actions) menu trigger */
  openMenu() {
    return this.self().find('.icon-actions').click();
  }

  /**
   * Click a menu option by its visible label text.
   * Uses .v-popper__popper because rc-dropdown teleports content outside the component tree.
   * Uses .filter(':visible').contains(label) to target the actual item element, not the popper
   * container — clicking the container center would hit the wrong item.
   */
  clickOption(label: string) {
    return cy.get('.v-popper__popper').filter(':visible').contains(label).click();
  }

  /**
   * Returns the shortcuts popover root element.
   * Teleported by floating-vue into body — not scoped to the component.
   */
  shortcutsPopover() {
    return cy.get('.v-popper__popper').find('.shortcuts');
  }

  shortcutsTitle() {
    return cy.get('.v-popper__popper').find('.shortcuts-title');
  }

  shortcutsRows() {
    return cy.get('.v-popper__popper').find('.shortcuts-row');
  }

  shortcutsActions() {
    return cy.get('.v-popper__popper').find('.shortcuts-action');
  }
}
