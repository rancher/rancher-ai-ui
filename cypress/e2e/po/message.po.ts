import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import ToolPo from '@/cypress/e2e/po/ui-tools/tool.po';

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

  timestamp() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-timestamp"]');
  }

  context(label: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-context-tag-${ label }"]`);
  }

  sourceLink(index: number) {
    return this.self().get(`[data-testid="rancher-ai-ui-chat-message-source-link-${ index }"]`);
  }

  resourceButton(resourceIdPrefix: string) {
    return this.self().get(`[data-testid^="rancher-ai-ui-chat-message-action-button-${ resourceIdPrefix }"]`);
  }

  bubbleButton(icon: string) {
    this.self().trigger('mouseenter', { force: true });

    return this.self().find(`[data-testid="rancher-ai-ui-bubble-btn-${ icon }"]`);
  }

  tool() {
    return new ToolPo(this.self());
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
    return this.bubbleButton('icon-thinking-process');
  }

  resendButton() {
    return this.bubbleButton('icon-backup');
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
    super(`[data-testid="rancher-ai-ui-chat-system-error-message-box-${ id }"]`, id);
  }
}