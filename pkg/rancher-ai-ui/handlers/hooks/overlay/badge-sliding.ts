import { nextTick } from 'vue';
import { Store } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { randomStr } from '@shell/utils/string';
import { warn } from '../../../utils/log';
import { hexToRgb, hasTransparency } from '../../../utils/colors';
import { Context, HookContextTag } from '../../../types';
import { HooksOverlay } from './index';
import TemplateMessage from '../template-message';
import Chat from '../../chat';

const enum Theme {
  Light = 'light', // eslint-disable-line no-unused-vars
  Dark = 'dark', // eslint-disable-line no-unused-vars
}

interface ColorProperties {
  background: string;
  color: string;
}

/**
 * Overlay that adds a sliding badge to status badges allowing
 * users to quickly create an AI chat message about the badged state.
 */
class BadgeSlidingOverlay extends HooksOverlay {
  constructor(selector: string) {
    super();
    this.selector = selector;
  }

  private hookContextTag: HookContextTag | null = null;

  /**
   * Get the theme's background color from CSS variables.
   *
   * @returns Object with r, g, b properties representing the theme's background color.
   */
  private getBlendColor(theme: Theme): { r: number; g: number; b: number } {
    let bodyBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--body-bg')
      .trim();

    if (!bodyBg) {
      bodyBg = getComputedStyle(document.body)
        .getPropertyValue('--body-bg')
        .trim();
    }

    const parsed = hexToRgb(bodyBg);

    if (parsed) {
      return parsed;
    }

    // Fallback to hadcoded colors
    if (theme === Theme.Dark) {
      return {
        r: 37,
        g: 40,
        b: 47
      };
    }

    return {
      r: 255,
      g: 255,
      b: 255
    };
  }

  /**
   * Blend a transparent color with the background color based on the theme.
   *
   * @param rgba The RGBA color string to blend (e.g., "rgba(31, 103, 219, 0.1)").
   * @param theme The theme to apply (light or dark).
   * @returns The blended color as a solid RGB string (e.g., "rgb(255, 255, 255)").
   */
  private blendTransparentColor(rgba: string, theme: Theme): string {
    // Extract RGBA components from strings like "rgba(31, 103, 219, 0.1)"
    const match = rgba.match(/rgba?\(([^)]+)\)/);

    if (!match) {
      return rgba;
    }

    const parts = match[1].split(',').map((s) => s.trim());
    const r = parseInt(parts[0]);
    const g = parseInt(parts[1]);
    const b = parseInt(parts[2]);
    const a = parts[3] ? parseFloat(parts[3]) : 1;

    const blendBg = this.getBlendColor(theme);

    const blendedR = Math.round(r * a + blendBg.r * (1 - a));
    const blendedG = Math.round(g * a + blendBg.g * (1 - a));
    const blendedB = Math.round(b * a + blendBg.b * (1 - a));

    return `rgb(${ blendedR }, ${ blendedG }, ${ blendedB })`;
  }

  /**
   * Compute the color properties for the badge and overlay,
   * taking into account the theme and any transparency in the badge's background color.
   *
   * In order to avoid overlay overlapping issues, we need to ensure that the badge's background color is solid and not transparent.
   *
   * @param badge The badge element to compute properties for.
   * @param theme The theme to apply (light or dark).
   * @returns An object containing the computed properties for the badge and overlay.
   */
  private computeColorProperties(badge: HTMLElement, theme: Theme): { badge: ColorProperties, overlay: ColorProperties } {
    const out = {
      badge:   {
        background: '',
        color:      ''
      },
      overlay: {
        background: '#496192',
        color:      'var(--primary-text)',
      },
    };

    if (!badge) {
      return out;
    }

    // Temporarily clear the inline background style to get the real computed color from the class
    const originalBackground = badge.style.background;
    const originalBackgroundColor = badge.style.backgroundColor;

    badge.style.background = '';
    badge.style.backgroundColor = '';

    const classBgColor = getComputedStyle(badge).backgroundColor;

    // Restore the original inline styles
    if (originalBackground) {
      badge.style.background = originalBackground;
    }
    if (originalBackgroundColor) {
      badge.style.backgroundColor = originalBackgroundColor;
    }

    if (hasTransparency(classBgColor)) {
      // Convert transparent color to solid by blending with theme background
      out.badge.background = this.blendTransparentColor(classBgColor, theme);
    } else {
      out.badge.background = classBgColor;
    }

    return out;
  }

  /**
   * Handle changes in the container's position (e.g. due to scrolling or table resizing).
   * @param target The target element.
   * @param container The container element.
   * @param badge The badge element.
   * @param overlay The overlay element.
   */
  private handleContainerPositionChange(target: HTMLElement, container: HTMLElement, badge: HTMLElement, overlay: HTMLElement) {
    // Destroy overlay if the container moves (position changes)
    let lastContainerRect = container.getBoundingClientRect();
    let rafId: number | null = null;

    const onContainerPosChange = () => {
      // Debounce with RAF to avoid ResizeObserver loop errors
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        try {
          const r = container.getBoundingClientRect();

          if (r.top !== lastContainerRect.top || r.left !== lastContainerRect.left) {
            // The container moved -> remove overlays for this target, immediately
            this.destroy(target, badge, true);
          } else {
            lastContainerRect = r;
          }
        } catch (e) {
          warn('Error checking container position change', e);
        }
      });
    };

    const containerRO = new ResizeObserver(onContainerPosChange);

    containerRO.observe(container);

    const containerMO = new MutationObserver(onContainerPosChange);

    containerMO.observe(container, {
      attributes:      true,
      attributeFilter: ['style', 'class']
    });

    const scrollHandler = () => onContainerPosChange();

    window.addEventListener('scroll', scrollHandler, true);

    // Store cleanup function to be called when the overlay is destroyed
    (overlay as any).__containerPositionCleanup = () => {
      try {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      } catch (e) {
        warn('Error canceling RAF', e);
      }
      try {
        containerRO.disconnect();
      } catch (e) {
        warn('Error disconnecting ResizeObserver', e);
      }
      try {
        containerMO.disconnect();
      } catch (e) {
        warn('Error disconnecting MutationObserver', e);
      }
      try {
        window.removeEventListener('scroll', scrollHandler, true);
      } catch (e) {
        warn('Error removing scroll event listener', e);
      }
    };
  }

  /**
   * Cleanup container position change handlers
   */
  private cleanupContainerPosition(overlay: any) {
    try {
      if (typeof overlay.__containerPositionCleanup === 'function') {
        overlay.__containerPositionCleanup();
      }
    } catch (e) {
      warn('Error during container position cleanup', e);
    }
  }

  create(store: Store<any>, target: HTMLElement, badge: HTMLElement, ctx: Context, globalCtx: Context[] = []) {
    this.hookContextTag = ctx.tag as HookContextTag;

    const { t } = useI18n(store);
    const theme = store.getters['prefs/theme'] as Theme;

    const {
      badge: badgeProps,
      overlay: overlayProps
    } = this.computeColorProperties(badge, theme);

    const overlay = badge.cloneNode(true) as HTMLElement;

    const badgeRect = badge.getBoundingClientRect();
    const badgeStyle = getComputedStyle(badge);

    const id = randomStr(8);

    overlay.setAttribute('data-testid', 'rancher-ai-ui-hook-overlay');
    overlay.setAttribute(`${ HooksOverlay.defaultClassPrefix }-${ this.getSelector() }`, id);

    overlay.style.zIndex = '10';
    overlay.style.backgroundColor = overlayProps.background;
    overlay.style.color = 'transparent';
    overlay.style.position = 'fixed';
    overlay.style.fontSize = badgeStyle.fontSize;
    overlay.style.top = `${ badgeRect.top }px`;
    overlay.style.left = `${ badgeRect.left + 2 }px`;
    overlay.style.height = `${ badgeRect.height }px`;
    overlay.style.width = `${ badgeRect.width - 2 - parseFloat(badgeStyle.marginRight) - parseFloat(badgeStyle.marginLeft) }px`;
    overlay.style.paddingRight = '3px';
    overlay.style.transition = 'width 0.2s cubic-bezier(0.4,0,0.2,1)';
    overlay.style.cursor = 'pointer';
    overlay.textContent = t('ai.hooks.overlay.badgeSliding.label');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'flex-end';
    overlay.style.whiteSpace = 'nowrap';
    overlay.style.overflow = 'hidden';
    overlay.style.boxSizing = 'border-box'; // ensure padding is included in size

    badge.style.zIndex = Math.max(parseInt(badge.style.zIndex || '0'), 12).toString();
    badge.style.background = badgeProps.background;

    (badge as any).__cleanupStyle = () => {
      // Clear badge styles if no related overlays exist for this badge
      const container = this.getContainer(target);

      if (!container.querySelector(`[${ HooksOverlay.defaultClassPrefix }-${ this.getSelector() }="${ id }"]`)) {
        badge.style.background = '';
        badge.style.backgroundColor = '';
        badge.style.zIndex = '';
      }
    };

    const icon = document.createElement('i');

    icon.classList.add('icon-ai');
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.flex = '0 0 auto';
    icon.style.width = `${ Math.max(16, Math.round(badgeRect.height * 0.6)) }px`;
    icon.style.height = `${ Math.max(16, Math.round(badgeRect.height * 0.6)) }px`;
    icon.style.marginLeft = `${ Math.round(badgeRect.height * 0.3) }px`;
    icon.style.marginRight = `${ Math.round(badgeRect.height * 0.2) }px`;
    icon.style.lineHeight = '1';
    icon.style.color = overlayProps.color;
    icon.style.boxSizing = 'content-box';

    overlay.appendChild(icon);

    const container = this.getContainer(target);

    container.appendChild(overlay);

    // Animate width expansion after a short delay
    setTimeout(() => {
      overlay.style.width = `${ parseInt(overlay.style.width) + 30 }px`;
    }, 10);

    this.handleContainerPositionChange(target, container, badge, overlay);

    overlay.addEventListener('click', (e) => {
      this.action(store, e, overlay, ctx, globalCtx);
      this.removeOverlayAndRestoreBadge(overlay, badge);
    });

    overlay.addEventListener('mouseenter', () => {
      badge.style.background = badgeProps.background;
      overlay.style.width = `${ parseInt(overlay.style.width) + (20 + (overlay.textContent?.length || 0) + parseInt(badgeStyle.fontSize) * 1.4 + parseFloat(badgeStyle.marginRight) + parseFloat(badgeStyle.marginLeft)) }px`;
      overlay.style.color = overlayProps.color;
    });

    overlay.addEventListener('mouseleave', () => {
      if (!HooksOverlay.allHooksKeyPressed) {
        this.destroy(target, badge);
      } else {
        overlay.style.width = `${ parseInt(overlay.style.width) - (20 + (overlay.textContent?.length || 0) + parseInt(badgeStyle.fontSize) * 1.4 + parseFloat(badgeStyle.marginRight) + parseFloat(badgeStyle.marginLeft)) }px`;
      }
    });
  }

  action(store: Store<any>, e: Event, overlay: HTMLElement, ctx: Context, globalCtx: Context[]) {
    e.stopPropagation();

    const message = TemplateMessage.fill(store, ctx, globalCtx);

    store.commit('rancher-ai-ui/chat/addToMessageBox', {
      chatId: 'default',
      message,
    });

    Chat.open(store);
  }

  destroy(target: HTMLElement, badge: HTMLElement, immediate = false) {
    const container = this.getContainer(target);
    const selector = `[${ HooksOverlay.defaultClassPrefix }-${ this.getSelector() }]`;

    container.querySelectorAll(selector).forEach((overlay: any) => {
      if (overlay) {
        if (immediate) {
          this.cleanupContainerPosition(overlay);
          this.removeOverlayAndRestoreBadge(overlay, badge);
        } else if (!(overlay.matches(':hover') || (overlay.querySelector(':hover') !== null))) {
          this.cleanupContainerPosition(overlay);

          // Animate width shrink before removing
          overlay.style.transition = 'width 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.3s';
          overlay.style.width = '0px';
          overlay.style.opacity = '0';

          setTimeout(() => {
            this.removeOverlayAndRestoreBadge(overlay, badge);
          }, 150);
        }
      }
    });
  }

  // Select the appropriate container based on the context tag
  getContainer(target: HTMLElement): HTMLElement {
    let container;

    switch (this.hookContextTag) {
    case HookContextTag.SortableTableRow:
      container = target.closest('tbody');
      break;
    default:
      container = target.parentElement;
    }

    return (container || target.parentElement || target) as HTMLElement;
  }

  removeOverlayAndRestoreBadge(overlay: HTMLElement, badge: HTMLElement) {
    if (overlay) {
      overlay.remove();
    }

    const cleanup = (badge as any)?.__cleanupStyle;

    if (cleanup) {
      cleanup();
    }
  }

  setTheme(badge: HTMLElement, theme: Theme) {
    nextTick(() => {
      const { badge: badgeProps } = this.computeColorProperties(badge, theme);

      if (badge) {
        badge.style.background = badgeProps.background;
      }
    });
  }
}

export default new BadgeSlidingOverlay('badge-state');
