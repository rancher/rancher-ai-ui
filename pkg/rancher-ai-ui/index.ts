import { defineAsyncComponent } from 'vue';
import { importTypes } from '@rancher/auto-import';
import { ActionLocation, IPlugin } from '@shell/core/types';
import { warn } from './utils/log';
import extensionRouting from './routing/extension-routing';
import connectionStore from './store/connection';
import chatStore from './store/chat';
import inputStore from './store/input';
import contextStore from './store/context';
import Chat from './handlers/chat';
import Hooks from './handlers/hooks/index';
import BadgeSlidingOverlay from './handlers/hooks/overlay/badge-sliding';
import BannerButtonOverlay from  './handlers/hooks/overlay/banner-button';
import { NotificationLevel } from '@shell/types/notifications';

// Init the package
export default function(plugin: IPlugin, { store }: any): void {
  const isDev = (plugin as any).builtin; // Running in development mode
  const isPrime = plugin.environment.isPrime;

  if (!isDev && !isPrime) {
    warn('Rancher Prime subscription required');

    plugin.addNavHooks({
      onLogin: async(store: any) => {
        store.dispatch('notifications/add', {
          id:      'rancher-ai-requires-prime',
          level:   NotificationLevel.Error,
          // Note: Hard-coded strings due to issue where onLogin called before i18n loaded from extension
          title:   'Rancher AI Assistant requires Rancher Prime',
          message: 'The Rancher AI Assistant requires a Rancher Prime subscription. Please upgrade to Prime or uninstall this extension.'
        });
      }
    });

    return;
  }

  // Auto-import model, detail, edit from the folders
  importTypes(plugin);

  // Provide extension metadata from package.json
  plugin.metadata = require('./package.json');

  // Load a product
  plugin.addProduct(require('./product'));

  // Add Vue Routes
  plugin.addRoutes(extensionRouting);

  // Register the Chat component
  plugin.register('component', 'ChatComponent', defineAsyncComponent(() => import('./pages/Chat.vue')) as Function);

  // Open chat window action
  plugin.addAction(
    ActionLocation.HEADER,
    {},
    {
      labelKey:   'ai.action.openChat',
      tooltipKey: 'ai.action.openChat',
      shortcut: { 
        windows: ['alt', 'k'], 
        // Meta + Shift + K doesn't work on INPUT/textarea elements
        // So there is a bugfix on Console.vue to close it to avoid the bug
        mac: ['meta', 'shift', 'k'] 
      },
      icon: 'icon-ai',
      invoke: () => {
        Chat.isOpen(store) ? Chat.close(store) : Chat.open(store);
      },
    }
  );

  // Add stores
  plugin.addDashboardStore(connectionStore.config.namespace, connectionStore.specifics, connectionStore.config);
  plugin.addDashboardStore(chatStore.config.namespace, chatStore.specifics, chatStore.config);
  plugin.addDashboardStore(inputStore.config.namespace, inputStore.specifics, inputStore.config);
  plugin.addDashboardStore(contextStore.config.namespace, contextStore.specifics, contextStore.config);

  // Inject hooks in the main window
  Hooks.inject(BadgeSlidingOverlay, store);
  Hooks.inject(BannerButtonOverlay, store);
  // Add more overlays here
}
