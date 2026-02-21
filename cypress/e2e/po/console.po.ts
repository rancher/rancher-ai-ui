import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

class AgentItemPo extends ComponentPo {
  constructor(name: string) {
    super(`[data-testid="rancher-ai-ui-multi-agent-select-option-${ name }"]`);
  }

  select() {
    this.self().click();
  }

  checkSelected() {
    this.self().find('.icon-checkmark').should('exist');
  }

  checkNotSelected() {
    this.self().find('.icon-checkmark').should('not.exist');
  }
}

class SelectAgentPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-multi-agent-select"]');
  }

  open() {
    this.self().click();
  }

  agentItem(name: string) {
    return new AgentItemPo(name);
  }
}

export class ConsolePo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-chat-console"]');
  }

  textarea() {
    return this.self().get('textarea[data-testid="rancher-ai-ui-chat-input-textarea"]');
  }

  selectAgent() {
    return new SelectAgentPo();
  }

  sendMessage(value: string) {
    this.textarea().type(value).type('{enter}');
  }
}