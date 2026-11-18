import storage from '../storage';
import { PRODUCT_NAME } from '../../product';
import { StorageKey } from '../../types';

const { getters, mutations } = storage.specifics as any;

const USER = 'user-1';
const REVISION = 1;

function save(data: Record<string, any>, user = USER, revision = REVISION) {
  window.localStorage.setItem(PRODUCT_NAME, JSON.stringify({
    data,
    user,
    revision
  }));
}

describe('storage store', () => {
  let state: any;

  beforeEach(() => {
    window.localStorage.clear();
    state = { data: undefined };
  });

  describe('get', () => {
    it('should enable auto-scroll and desktop notifications for new users', () => {
      expect(getters.get(state)(USER, REVISION)).toStrictEqual({
        [StorageKey.ENABLE_AUTO_SCROLL]:           true,
        [StorageKey.ENABLE_DESKTOP_NOTIFICATIONS]: true,
      });
    });

    it('should enable desktop notifications for users who saved preferences before they existed', () => {
      save({ [StorageKey.ENABLE_AUTO_SCROLL]: false });

      expect(getters.get(state)(USER, REVISION)).toStrictEqual({
        [StorageKey.ENABLE_AUTO_SCROLL]:           false,
        [StorageKey.ENABLE_DESKTOP_NOTIFICATIONS]: true,
      });
    });

    it('should keep the saved preferences', () => {
      save({
        [StorageKey.ENABLE_AUTO_SCROLL]:           false,
        [StorageKey.ENABLE_DESKTOP_NOTIFICATIONS]: false,
      });

      expect(getters.get(state)(USER, REVISION)).toStrictEqual({
        [StorageKey.ENABLE_AUTO_SCROLL]:           false,
        [StorageKey.ENABLE_DESKTOP_NOTIFICATIONS]: false,
      });
    });

    it.each([
      ['another user', 'user-2', REVISION],
      ['another revision', USER, REVISION + 1],
    ])('should ignore preferences saved for %s', (_, user, revision) => {
      save({
        [StorageKey.ENABLE_AUTO_SCROLL]:           false,
        [StorageKey.ENABLE_DESKTOP_NOTIFICATIONS]: false,
      }, user, revision);

      expect(getters.get(state)(USER, REVISION)).toStrictEqual({
        [StorageKey.ENABLE_AUTO_SCROLL]:           true,
        [StorageKey.ENABLE_DESKTOP_NOTIFICATIONS]: true,
      });
    });
  });

  describe('set', () => {
    it('should keep desktop notifications enabled when changing auto-scroll on old preferences', () => {
      save({ [StorageKey.ENABLE_AUTO_SCROLL]: true });
      getters.get(state)(USER, REVISION);

      mutations.set(state, {
        key:      StorageKey.ENABLE_AUTO_SCROLL,
        value:    false,
        user:     USER,
        revision: REVISION
      });

      expect(JSON.parse(window.localStorage.getItem(PRODUCT_NAME) as string).data).toStrictEqual({
        [StorageKey.ENABLE_AUTO_SCROLL]:           false,
        [StorageKey.ENABLE_DESKTOP_NOTIFICATIONS]: true,
      });
    });
  });
});
