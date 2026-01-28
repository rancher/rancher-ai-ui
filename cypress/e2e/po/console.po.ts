import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class ConsolePo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-chat-console"]');
  }

  textarea() {
    return this.self().get('textarea[data-testid="rancher-ai-ui-chat-input-textarea"]');
  }

  sendMessage(value: string) {
    this.textarea().type(value).type('{enter}');
  }
}