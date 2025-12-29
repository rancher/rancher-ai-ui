import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class MessagePo extends ComponentPo {
  private id: string;

  constructor(id: string) {
    super(`[data-testid="rancher-ai-ui-chat-message-box-${ id }"]`);
    this.id = id;
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

  showThinkingButton() {
    const thinkingLabel = this.thinkingLabel();

    thinkingLabel.should('exist');

    thinkingLabel.trigger('mouseenter', { force: true });

    return this.self().find('[data-testid="rancher-ai-ui-chat-message-show-thinking-button"]');
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

  containsText(value: string) {
    return this.self().within(() => {
      cy.contains(value).should('be.visible', { timeout: 10000 });
    });
  }
}