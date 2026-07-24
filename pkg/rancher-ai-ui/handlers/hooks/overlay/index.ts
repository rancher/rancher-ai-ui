import { Context } from '../../../types';
import { Store } from 'vuex';

/**
 * Abstract class representing a hooks overlay within the Rancher AI UI.
 *
 * - Each hooks overlay is responsible for rendering contextual information
 * and actions related to specific UI elements based on the provided context.
 *
 * - Each overlay is associated with a specific CSS selector that determines
 * which elements the overlay will be applied to. It must be unique across
 * all overlays.
 *
 * - Each overlay must implement methods for creation, action handling,
 * destruction, and theme setting.
 */
export abstract class HooksOverlay {
  protected selector = '';
  protected static defaultClassPrefix = 'context-overlay';
  protected static allHooksKeyPressed = false;
  // eslint-disable-next-line no-unused-vars
  abstract create(store: Store<any>, target: HTMLElement, el: HTMLElement, ctx: Context, globalCtx?: Context[]): void;
  // eslint-disable-next-line no-unused-vars
  abstract action(store: Store<any>, e: Event, overlay: HTMLElement, ctx: Context, globalCtx?: Context[]): void;
  // eslint-disable-next-line no-unused-vars
  abstract destroy(target: HTMLElement, el: HTMLElement, immediate?: boolean): void;

  static setAllHooksKeyPressed(value: boolean): void {
    HooksOverlay.allHooksKeyPressed = value;
  }

  // eslint-disable-next-line no-unused-vars
  abstract setTheme(target: HTMLElement, theme: string): void;

  getSelector() {
    return this.selector;
  }
}
