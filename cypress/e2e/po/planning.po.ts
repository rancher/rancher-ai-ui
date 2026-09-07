import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

class PlanningItemPo extends ComponentPo {
  constructor(index: number) {
    super(`[data-testid="rancher-ai-ui-planning-status-info-item-${ index }"]`);
  }

  label() {
    return this.self().get('.label');
  }

  icon() {
    return this.self().get('.icon');
  }

  agent() {
    return this.self().get('[data-testid^="rancher-ai-ui-context-tag"]');
  }
}

export default class PlanningPo extends ComponentPo {
  header() {
    return this.self().get('.planning-state-header');
  }

  item(index: number) {
    return new PlanningItemPo(index);
  }

  approvalInfo() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-approval-info"]');
  }

  status() {
    return this.self().get('.planning-state-result');
  }

  startButton() {
    return this.self().get('.rc-button').contains('Start');
  }

  cancelButton() {
    return this.self().get('.rc-button').contains('Cancel');
  }

  approve() {
    this.startButton().click();
  }

  cancel() {
    this.cancelButton().click();
  }
}
