import { Store } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Message, NotificationType, Role, StorageKey } from '../../../types';
import { NotificationChannel } from './index';

class NotificationMessageChannel extends NotificationChannel {
  send(store: Store<any>, storage: { get: Function }, message: Message): void {
    // Only notify for assistant messages
    if (message.role !== Role.Assistant) {
      return;
    }

    // Only notify if message is actually completed
    if (!message.completed) {
      return;
    }

    const { t } = useI18n(store);

    const title = t('ai.notifications.message.title');
    const summary = this.extractMessageSummary(t, message);

    this.sendNotification(store, NotificationType.MESSAGE, {
      title,
      summary
    }, { enableDesktopNotifications: storage.get(StorageKey.ENABLE_DESKTOP_NOTIFICATIONS) });
  }

  clear(store: Store<any>): void {
    this.clearNotifications(store, NotificationType.MESSAGE);
  }

  private extractMessageSummary(t: Function, message: Message): string {
    if (message.messageContent) {
      return t('ai.notifications.message.summary.message');
    }

    if (message.planningContent) {
      return t('ai.notifications.message.summary.planning', { count: message.planningContent.tasks?.length || 0 });
    }

    return t('ai.notifications.message.summary.idle');
  }
}

export default new NotificationMessageChannel();