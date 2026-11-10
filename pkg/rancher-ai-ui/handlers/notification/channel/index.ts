import { Store } from 'vuex';
import { PRODUCT_NAME } from '../../../product';
// @ts-expect-error FIXME: Cannot find module
import extensionIcon from '../../../assets/extension-icon.svg';
import { warn } from '../../../utils/log';
import { NotificationType } from '../../../types';
import Chat from '../../chat';

const NOTIFICATION_API = 'Notification';
const DESKTOP_NOTIFICATION_TIMEOUT = 5000;

interface DesktopNotificationOptions {
  title: string;
  summary: string;
  onClick: () => void;
}

export abstract class NotificationChannel {
  // eslint-disable-next-line no-unused-vars
  abstract send(store: Store<any>, storage: { get: Function }, payload: object): void;

  // eslint-disable-next-line no-unused-vars
  abstract clear(store: Store<any>): void;

  protected sendNotification(
    store: Store<any>,
    type: NotificationType,
    { title, summary }: { title: string; summary: string },
    options?: { enableDesktopNotifications: boolean }
  ) {
    // Add notification to store
    store.commit(`${ PRODUCT_NAME }/notification/addNotification`, {
      type,
      description: summary
    });

    // Send desktop notification when enabled and the page is not focused
    const isEnabled = options?.enableDesktopNotifications;
    const isNotFocused = !document.hasFocus() || document.hidden;

    if (isEnabled && isNotFocused) {
      this.sendDesktopNotification({
        title,
        summary,
        onClick: () => {
          if (!Chat.isOpen(store)) {
            Chat.open(store);
          }
        }
      });
    }
  }

  protected clearNotifications(store: Store<any>, type: NotificationType): void {
    // Clear notifications of the specified type from the store
    store.commit(`${ PRODUCT_NAME }/notification/clearNotifications`, type);
  }

  private sendDesktopNotification(options: DesktopNotificationOptions) {
    // Check if browser supports Notification API
    if (!(NOTIFICATION_API in window)) {
      return;
    }

    // Request permission if not already granted
    if (Notification.permission === 'granted') {
      this.createDesktopNotification(options);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this.createDesktopNotification(options);
        }
      });
    }
  }

  private createDesktopNotification(options: DesktopNotificationOptions) {
    const {
      title,
      summary,
      onClick
    } = options;

    try {
      const notification = new Notification(title, {
        icon:               extensionIcon,
        body:               summary,
        tag:                `${ PRODUCT_NAME }-notification`,
        requireInteraction: false
      });

      // Auto-close notification after 5 seconds
      const timeoutId = setTimeout(() => {
        notification.close();
      }, DESKTOP_NOTIFICATION_TIMEOUT);

      // Clear timeout when notification is clicked
      notification.onclick = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        window.focus();

        onClick();

        notification.close();
      };

      // Clear timeout when notification closes (by any means)
      notification.onclose = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    } catch (error) {
      warn('Error creating notification:', error);
    }
  }
}