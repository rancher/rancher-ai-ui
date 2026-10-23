import { Store } from 'vuex';
import { PRODUCT_NAME } from '../../../product';
// @ts-expect-error FIXME: Cannot find module
import extensionIcon from '../../../assets/extension-icon.svg';
import { warn } from '../../../utils/log';

const NOTIFICATION_API = 'Notification';

interface DesktopNotificationOptions {
  title: string;
  summary: string;
  onClick: () => void;
}

export abstract class NotificationChannel {
  // eslint-disable-next-line no-unused-vars
  abstract send(store: Store<any>, payload: object): void;

  // eslint-disable-next-line no-unused-vars
  abstract clear(store: Store<any>): void;

  protected sendDesktopNotification(options: DesktopNotificationOptions) {
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
      }, 5000);

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