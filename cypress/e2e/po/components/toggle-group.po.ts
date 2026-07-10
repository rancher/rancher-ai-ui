import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class ToggleOptionPo extends ComponentPo {
  constructor(optionName: string) {
    super(`[data-testid="rancher-ai-ui-toggle-group-item-${ optionName }"]`);
  }

  select() {
    this.self().click();
  }

  isSelected() {
    return this.self().should('have.class', 'active');
  }
}

export class ToggleGroupPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-toggle-group"]');
  }

  toggleOption(optionName: string) {
    return new ToggleOptionPo(optionName);
  }
}