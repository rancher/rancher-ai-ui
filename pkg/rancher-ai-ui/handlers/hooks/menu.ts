import { Store } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Context } from '../../types';
import { nextTick } from 'vue';
import Chat from '../chat';

interface MenuItems {
  ctx: Context[];
  labelKey: string;
  label?: string;
}

/**
 * Factory for creating context menus based on the current context.
 *
 * Not used at the moment.
 */
class MenuFactory {
  buildItems(store: Store<any>, context: Context): MenuItems[] {
    const { t } = useI18n(store);
    const items: MenuItems[] = [];

    if (context.value && typeof context.value === 'object') {
      const obj = context.value as any;

      const ctx: Context[] = [{
        tag:         obj?.kind?.toLowerCase(),
        description: obj?.kind,
        icon:        context.icon,
        value:       obj?.name
      }];

      if (obj.stateDescription && obj.state !== 'active') {
        items.push({
          ctx,
          labelKey: 'troubleshoot',
          label:    t(`ai.hooks.menu.itemMessages.troubleshoot`, {
            kind: obj.kind || '',
            name: obj.name || ''
          }, true)
        });
        items.push({
          ctx,
          labelKey: 'recover',
          label:    t(`ai.hooks.menu.itemMessages.recover`, {
            kind: obj.kind || '',
            name: obj.name || ''
          }, true)
        });
      }

      items.push({
        ctx,
        labelKey: 'inspect',
        label:    t(`ai.hooks.menu.itemMessages.inspect`, {
          kind: obj.kind || '',
          name: obj.name || ''
        }, true)
      });
    }

    if (context.value && typeof context.value === 'string') {
      if (context.tag === '__sortable-table-row-description') {
        items.push({
          ctx:      [],
          labelKey: 'explain',
          label:    t(`ai.hooks.menu.itemMessages.explain`, { error: context.value || '' }, true)
        });
      }
    }

    return items;
  }

  build(store: Store<any>, context: Context): HTMLElement {
    const { t } = useI18n(store);

    const menuItems = this.buildItems(store, context);

    const btn = document.createElement('div');

    btn.className = 'context-action-btn';
    btn.style.position = 'absolute';
    btn.style.display = 'none';
    btn.style.fontSize = '12px';
    btn.style.padding = '8px 10px';
    btn.style.background = 'var(--body-bg)';
    btn.style.border = '1.5px solid var(--border)';
    btn.style.borderRadius = '8px';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    btn.style.minWidth = '150px';
    btn.style.width = 'min-content';
    btn.style.zIndex = '1000';

    btn.innerHTML = `
      <style scoped>
        .menu-container {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          position: relative;
        }
        .menu-header {
          display: flex;
          align-items: center;
          position: absolute;
          top: 8px;
          background: var(--tertiary-header, var(--header-btn-bg));
          color: var(--on-tertiary-header, var(--header-btn-text));
        }
        .menu-header-title {
          margin-left: 6px;
          font-weight: 500;
          font-size: 13px;
        }
        .menu-header-icon {
          width: 18px;
          height: 18px;
          margin: 0;
        }
        .menu-item {
          min-height: 30px;
          height: 30px;
          width: 100%;
          padding: 4px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;

          &:hover {
            background: #e0e7ff !important;
            color: var(--on-secondary) !important;
            border-radius: 6px !important;
          }
        }
      </style>

      <div
        class="menu-container"
      >
        <div
          class="menu-header"
        >
          <i
            class="icon icon-ai"
          />
          <span
            class="menu-header-title"
          >
            ${ t('ai.hooks.menu.header.title') }
          </span>
        </div>
        <div style="height: 35px;"></div>
    `;

    menuItems.forEach(({ labelKey }) => {
      btn.innerHTML += `
        <button
          class="menu-item menu-item-${ labelKey }"
        >
          ${ t(`ai.hooks.menu.items.${ labelKey }`) }
        </button>
      `;
    });

    btn.innerHTML += `</div>`;

    menuItems.forEach(({ labelKey, label, ctx }) => {
      const element = btn.querySelector(`.menu-item-${ labelKey }`);

      if (element) {
        element.addEventListener('click', () => {
          Chat.open(store);
          nextTick(() => {
            store.commit('rancher-ai-ui/input/text', label);

            store.commit('rancher-ai-ui/context/reset');
            if (ctx && ctx.length) {
              store.commit('rancher-ai-ui/context/add', ctx);
            }
            // Hide and remove the menu after click
            btn.style.display = 'none';
            if (btn.parentElement) {
              btn.parentElement.removeChild(btn);
            }
          });
        });
      }
    });

    return btn;
  }
}

export default new MenuFactory();