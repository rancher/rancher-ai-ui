import { Store } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { waitFor } from '@shell/utils/async';
import { warn } from '../../../utils/log';
import { Context } from '../../../types';
import { nextTick } from 'vue';
import TemplateMessage from '../template-message';
import { HooksOverlay } from './index';
import Chat from '../../chat';
import { formatWSInputMessage } from '../../../utils/format';

/**
 * Overlay that adds a button to status banners allowing
 * users to quickly create an AI chat message about the bannered state.
 */
class BannerButtonOverlay extends HooksOverlay {
  constructor(selector: string) {
    super();
    this.selector = selector;
  }

  create(store: Store<any>, target: HTMLElement, banner: HTMLElement, ctx: Context, globalCtx: Context[] = []) {
    const { t } = useI18n(store);

    const overlay = document.createElement('button');

    const color = (ctx.value as any)?.bannerProps?.color || 'success';
    const height = 24;

    overlay.className = `${ HooksOverlay.defaultClassPrefix }-${ this.getSelector() }`;

    overlay.style.position = 'fixed';
    overlay.style.alignItems = 'center';
    overlay.style.minHeight = `${ height }px`;
    overlay.style.height = `${ height }px`;
    overlay.style.padding = '2px 5px';
    overlay.style.borderRadius = '20px';
    overlay.style.color = color === 'error' ? 'var(--on-error-banner)' : `var(--${ color }-text)` ;
    overlay.style.background = `var(--${ color })`;
    overlay.style.display = 'none';
    overlay.style.transition = '';

    const icon = document.createElement('i');

    icon.className = 'icon icon-ai';
    icon.style.margin = '0';

    const label = document.createElement('span');

    label.className = 'banner-label';
    label.textContent = t('ai.hooks.overlay.bannerButton.label');
    label.style.display = 'inline-block';
    label.style.whiteSpace = 'nowrap';
    label.style.overflow = 'hidden';
    label.style.boxSizing = 'content-box';
    label.style.maxWidth = '0px';
    label.style.opacity = '0';
    label.style.transform = 'translateX(6px)';
    label.style.transition = 'max-width 160ms ease, opacity 160ms ease, transform 160ms ease';
    label.style.willChange = 'max-width, opacity, transform';

    overlay.appendChild(label);
    overlay.appendChild(icon);

    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';

    if (banner) {
      const bannerRect = banner.getBoundingClientRect();

      const rightOffset = Math.max(8, window.innerWidth - bannerRect.right + 8);

      overlay.style.right = `${ rightOffset }px`;

      // align overlay to the bottom of the banner (with a small gap)
      const gap = 8;
      const viewportPadding = 8;
      let top = Math.round(bannerRect.bottom - height - gap);

      top = Math.min(Math.max(viewportPadding, top), window.innerHeight - height - viewportPadding);
      overlay.style.top = `${ top }px`;
    }

    target.appendChild(overlay);

    setTimeout(() => {
      overlay.style.display = 'inline-flex';
    }, 100); // slight delay to be consistent with the other overlays

    overlay.addEventListener('click', (e) => this.action(store, e, overlay, ctx, globalCtx));

    overlay.addEventListener('mouseenter', () => {
      const w = label.scrollWidth || (label.textContent || '').length * 8;

      label.style.maxWidth = `${ w + 6 }px`;
      label.style.marginLeft = '8px';
      label.style.opacity = '1';
      label.style.transform = 'translateX(0)';
      overlay.style.gap = '6px';
    });

    overlay.addEventListener('mouseleave', () => {
      label.style.maxWidth = '0px';
      label.style.marginLeft = '0';
      label.style.opacity = '0';
      label.style.transform = 'translateX(6px)';
      overlay.style.gap = '0';
    });
  }

  action(store: Store<any>, e: Event, overlay: HTMLElement, ctx: Context, globalCtx: Context[]) {
    e.stopPropagation();

    const message = TemplateMessage.fill(store, {
      ...ctx,
      value: {
        ...(ctx.value as any)?.resource || {},
        bannerProps: (ctx.value as any)?.bannerProps || {}
      }
    }, globalCtx);

    store.dispatch('rancher-ai-ui/chat/init', {
      chatId:   'default',
      messages: [message],
    });

    nextTick(async() => {
      Chat.open(store);

      // TODO remove hacky waitFor, the WS should be already available or opened by now
      try {
        await waitFor(() => !!store.getters['rancher-ai-ui/connection/ws'], 'Wait for ws open', 2000, 100, false);
      } catch (err) {
        warn('WebSocket not available, cannot send message', err);
      }

      const ws = store.getters['rancher-ai-ui/connection/ws'];

      if (!!ws) {
        ws.send(formatWSInputMessage(message.messageContent || '', message.contextContent || []));
      }

      overlay.remove();
    });
  }

  destroy(target: HTMLElement, immediate = false) {
    (target.parentElement as HTMLElement).querySelectorAll(`.${ HooksOverlay.defaultClassPrefix }-${ this.getSelector() }`).forEach((overlay: any) => {
      if (overlay && !(overlay.matches(':hover') || (overlay.querySelector(':hover') !== null))) {
        setTimeout(() => {
          overlay.remove();
        }, immediate ? 0 : 100);
      }
    });
  }

  setTheme() {
  }
}

export default new BannerButtonOverlay('state-banner');