import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

class RawMessagePo extends ComponentPo {
  private id: string;

  constructor(selector: string, id: string) {
    super(selector);
    this.id = id;
  }

  selectedAgentLabel(agentName: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-chat-message-selected-agent-label-${ agentName }"]`);
  }

  content() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-formatted-content"]');
  }

  context(label: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-context-tag-${ label }"]`);
  }

  suggestion(index: number) {
    return this.self().get(`[data-testid="rancher-ai-ui-chat-message-suggestion-${ index }"]`);
  }

  sourceLink(index: number) {
    return this.self().get(`[data-testid="rancher-ai-ui-chat-message-source-link-${ index }"]`);
  }

  resourceButton(resourceIdPrefix: string) {
    return this.self().get(`[data-testid^="rancher-ai-ui-chat-message-action-button-${ resourceIdPrefix }"]`);
  }

  confirmButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-confirmation-confirm-button"]');
  }

  cancelButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-confirmation-cancel-button"]');
  }

  isCompleted() {
    return this.self().get(`[data-teststatus="rancher-ai-ui-chat-message-status-${ this.id }-completed"]`).should('exist');
  }

  isConfirmed() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-confirmation-confirmed"]').should('exist');
  }

  isCanceled() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-confirmation-canceled"]').should('exist');
  }

  thinkingLabel() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-thinking-label"]');
  }

  thinkingButton() {
    this.self().trigger('mouseenter', { force: true });

    return this.self().find('[data-testid="rancher-ai-ui-chat-message-show-thinking-button"]');
  }

  containsText(value: string) {
    return this.self().within(() => {
      cy.contains(value).should('be.visible', { timeout: 10000 });
    });
  }

  scrollIntoView() {
    return this.self().scrollIntoView();
  }
}

export class MessagePo extends RawMessagePo {
  constructor(id: string) {
    super(`[data-testid="rancher-ai-ui-chat-message-box-${ id }"]`, id);
  }
}

export class ErrorMessagePo extends RawMessagePo {
  constructor(id: string) {
    super(`[data-testid="rancher-ai-ui-chat-error-message-box-${ id }"]`, id);
  }
}