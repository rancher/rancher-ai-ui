import { Context } from '../../types';
import { Store } from 'vuex';
import { watch } from 'vue';
import { HooksOverlay } from './overlay';
import { debounce } from 'lodash';

interface Target {
  target: HTMLElement;
  ctx: Context;
  handlers?: {
    mouseenter?: any;
    mouseleave?: any;
  };
}

/**
 * Handler for managing hooks overlays within the Rancher AI UI.
 *
 * - It listens for context changes and attaches/detaches overlays
 * to the appropriate elements based on user interaction and key presses.
 *
 * - Overlays can be injected into the handler, allowing for modular
 * addition of different types of hooks overlays.
 */
class HooksHandler {
  private targets: Set<Target> = new Set();
  private overlays: HooksOverlay[] = [];

  private static initialized = false;
  private static headerBtn: HTMLElement | null = null;
  private static allHooksKeyPressed = false;

  // Key chain: Ctrl + Alt + L
  private isShowAllHooksKey(e: KeyboardEvent) {
    if (HooksHandler.allHooksKeyPressed) {
      return e.type === 'keyup' && (e.key === 'Control' || e.key === 'Alt' || e.key?.toLowerCase() === 'l');
    } else {
      return e.ctrlKey && e.altKey && e.key?.toLowerCase() === 'l';
    }
  };

  /**
   * Add an easter egg to the header AI button to toggle all hooks overlays on hover.
   * @param store The Vuex store instance.
   */
  private addEasterEgg(store: Store<any>) {
    if (HooksHandler.headerBtn) {
      const prev = (HooksHandler.headerBtn as any).__easterHandlers;

      if (prev) {
        try {
          HooksHandler.headerBtn.removeEventListener('mouseenter', prev.onEnter);
        } catch {}
        try {
          HooksHandler.headerBtn.removeEventListener('mouseleave', prev.onLeave);
        } catch {}
        try {
          HooksHandler.headerBtn.removeEventListener('click', prev.onClick);
        } catch {}
      }
      (HooksHandler.headerBtn as any).__easterHandlers = undefined;
      HooksHandler.headerBtn = null;
    }

    HooksHandler.headerBtn = document.querySelector('.header-btn .icon-ai')?.closest('.header-btn') as HTMLElement | null;

    if (HooksHandler.headerBtn) {
      const onEnter = debounce(() => {
        this.toggleAllHooksOverlay(store, true);
      }, 150);
      const onLeave = debounce(() => {
        this.toggleAllHooksOverlay(store, false);
      }, 150);
      const onClick = debounce(() => {
        this.toggleAllHooksOverlay(store, false);
      }, 150);

      (HooksHandler.headerBtn as any).__easterHandlers = {
        onEnter,
        onLeave,
        onClick
      };
      HooksHandler.headerBtn.addEventListener('mouseenter', onEnter);
      HooksHandler.headerBtn.addEventListener('mouseleave', onLeave);
      HooksHandler.headerBtn.addEventListener('click', onClick);
    }
  }

  /**
   * Get the overlay HTML element for a specific target element.
   * @param target The target element to find the overlay for.
   * @param overlay The overlay instance to find the element for.
   * @returns The overlay HTML element, or null if not found.
   */
  private getOverlayHTMLElement(target: HTMLElement, overlay: HooksOverlay) {
    return target.classList.contains(overlay.getSelector()) ? target : (target.querySelector(`.${ overlay.getSelector() }`) as HTMLElement);
  }

  /**
   * Clear all registered target elements and their event handlers.
   */
  private clearTargets() {
    for (const t of this.targets) {
      if (t.handlers) {
        try {
          t.target.removeEventListener('mouseenter', t.handlers.mouseenter!);
        } catch {}
        try {
          t.target.removeEventListener('mouseleave', t.handlers.mouseleave!);
        } catch {}
      }
      try {
        t.target.removeAttribute('ux-context-hook-status');
      } catch {}
    }
    this.targets.clear();
  }

  /**
   * Toggle overlays for a specific target element.
   * @param store The Vuex store instance.
   * @param target The target element to toggle overlays for.
   * @param ctx The context for the overlay.
   * @param show Whether to show or hide the overlay.
   */
  private toggleOverlays(store: Store<any>, target: HTMLElement, ctx: Context, show: boolean) {
    this.overlays.forEach((overlay) => {
      // Get the first element with the overlay selector class, including the target itself
      const el = this.getOverlayHTMLElement(target, overlay);

      if (!el) {
        return;
      }

      if (show) {
        // Only create the overlay if the element is visible (not hidden or collapsed)
        const isVisible = el.offsetParent !== null && el.offsetHeight > 0 && el.offsetWidth > 0;

        if (isVisible) {
          overlay.create(store, target, el, ctx, store.getters['rancher-ai-ui/context/all']);
        }
      } else if (!(el.matches(':hover') || (el.querySelector(':hover') !== null))) {
        overlay.destroy(target, el);
      }
    });
  }

  /**
   * Initialize the hooks handler.
   * Init is called the first time the HooksHandler is used.
   *
   * @param store The Vuex store instance.
   */
  private init(store: Store<any>) {
    // Debounce the expensive handler so only the last update is processed
    const handleHooksChange = debounce(async(hooks: Context[]) => {
      this.addEasterEgg(store);
      this.clearTargets();

      hooks.forEach((ctx: Context) => {
        const target = document.querySelector(`[ux-context-hook-id="${ ctx.hookId }"]`) as HTMLElement;

        if (target) {
          const onEnter = () => {
            if (!HooksHandler.allHooksKeyPressed) {
              this.toggleOverlays(store, target, ctx, true);
            }
          };
          const onLeave = () => {
            if (!HooksHandler.allHooksKeyPressed) {
              this.toggleOverlays(store, target, ctx, false);
            }
          };

          target.addEventListener('mouseenter', onEnter);
          target.addEventListener('mouseleave', onLeave);

          this.targets.add({
            target,
            ctx,
            handlers: {
              mouseenter: onEnter,
              mouseleave: onLeave
            },
          });

          target.setAttribute('ux-context-hook-status', 'bound');
        }
      });
    }, 300);

    /**
     * Watch for changes in the hooks context to update overlays accordingly.
     *
     * Updates are debounced to avoid excessive processing
     * and because we are only interested in the latest changes in the hooks context.
     */
    watch(
      () => store.getters['ui-context/all'].filter((c: Context) => !!c.hookId),
      (hooks) => handleHooksChange(hooks),
      {
        immediate: true,
        deep:      true
      },
    );

    /**
     * Watch for theme changes to update overlays accordingly.
     */
    watch(() => store.getters['prefs/theme'], (newTheme) => {
      this.targets.forEach(({ target }) => {
        this.overlays.forEach((overlay) => {
          const el = this.getOverlayHTMLElement(target, overlay);

          overlay.setTheme(el, newTheme);
        });
      });
    });

    window.addEventListener('keydown', (e) => {
      if (this.isShowAllHooksKey(e)) {
        this.toggleAllHooksOverlay(store, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.isShowAllHooksKey(e)) {
        this.toggleAllHooksOverlay(store, false);
      }
    });
  }

  /**
   * Inject a new hooks overlay into the handler.
   * @param overlay The hooks overlay to inject.
   * @param store The Vuex store instance.
   * @returns The injected hooks overlay.
   */
  public inject(overlay: HooksOverlay, store: Store<any>) {
    if (!HooksHandler.initialized) {
      this.init(store);
      HooksHandler.initialized = true;
    }

    if (this.overlays.find((o) => o.getSelector() === overlay.getSelector())) {
      return;
    }

    this.overlays.push(overlay);
  };

  public toggleAllHooksOverlay(store: Store<any>, value: boolean) {
    HooksHandler.allHooksKeyPressed = value;
    HooksOverlay.setAllHooksKeyPressed(value);
    this.targets.forEach(({ target, ctx }) => this.toggleOverlays(store, target, ctx, value));
  }
}

export default new HooksHandler();
