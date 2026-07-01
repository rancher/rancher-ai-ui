import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import { MessagePo, ErrorMessagePo } from '@/cypress/e2e/po/message.po';

export default class MessagesPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-chat-messages"]');
  }

  processingState(label?: string) {
    if (label) {
      return this.self().get(`[data-testid="rancher-ai-ui-processing-message-state-${ label.toLowerCase().replace(/\s/g, '-') }"]`);
    }

    return this.self().get('[data-testid^="rancher-ai-ui-processing-message-state-"]');
  }

  scrollButton() {
    return new ComponentPo('[data-testid="rancher-ai-ui-scroll-button"]');
  }

  scrollTop() {
    this.self().scrollTo('top', {
      duration: 100,
      easing:   'linear'
    });
  }

  getMessage(id: string | number) {
    return new MessagePo(id.toString());
  }

  getErrorMessage(index: number) {
    return new MessagePo(index.toString());
  }

  getSystemErrorMessage(index: number) {
    return new ErrorMessagePo(index.toString());
  }
}
