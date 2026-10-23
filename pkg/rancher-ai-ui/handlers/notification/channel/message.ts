import { Store } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { PRODUCT_NAME } from '../../../product';
import { Message, NotificationType, Role } from '../../../types';
import Chat from '../../chat';
import { NotificationChannel } from './index';

class NotificationMessageChannel extends NotificationChannel {
  send(store: Store<any>, message: Message): void {
    // Only notify for assistant messages
    if (message.role !== Role.Assistant) {
      return;
    }

    // Only notify if message is actually completed
    if (!message.completed) {
      return;
    }

    const { t } = useI18n(store);

    const summary = this.extractMessageSummary(t, message);

    // Add notification to store
    store.commit(`${ PRODUCT_NAME }/notification/addNotification`, {
      type:        NotificationType.MESSAGE,
      description: summary
    });

    // Send desktop notification when the page is not focused
    if (!document.hasFocus() || document.hidden) {
      this.sendDesktopNotification({
        title:   t('ai.notification.message.title'),
        summary,
        onClick: () => {
          if (!Chat.isOpen(store)) {
            Chat.open(store);
          }
        }
      });
    }
  }

  clear(store: Store<any>): void {
    store.commit(`${ PRODUCT_NAME }/notification/clearNotifications`, NotificationType.MESSAGE);
  }

  private extractMessageSummary(t: Function, message: Message): string {
    if (message.messageContent) {
      return t('ai.notification.message.summary.message');
    }

    if (message.planningContent) {
      return t('ai.notification.message.summary.planning', { count: message.planningContent.tasks?.length || 0 });
    }

    return t('ai.notification.message.summary.idle');
  }
}

export default new NotificationMessageChannel();