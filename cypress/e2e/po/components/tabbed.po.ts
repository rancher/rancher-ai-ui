import DefaultTabbedPo from '@rancher/cypress/e2e/po/components/tabbed.po';

export default class TabbedPo extends DefaultTabbedPo {
  constructor(selector: string) {
    super(selector);
  }

  addTab() {
    return this.self().get('[data-testid="tab-list-add"]').click();
  }

  removeTab() {
    return this.self().get('[data-testid="tab-list-remove"]').click();
  }

  assertTabHasLabelIcon(selector: string, iconName: string) {
    return this.self().find(`${ selector } > a > .tab-label-icon.${ iconName }`).should('exist');
  }
}