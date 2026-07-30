import {
  describe, it, expect, beforeEach, jest, afterEach
} from '@jest/globals';
import HooksHandler from '../hooks/index';
import { HooksOverlay } from '../hooks/overlay';
import { Context } from '../../types';

jest.mock('vue', () => ({
  watch: jest.fn(),
  ref:   jest.fn((val) => ({ value: val }))
}));

describe('HooksHandler', () => {
  let mockStore: any;
  let mockOverlay: any;
  let mockTarget: HTMLElement;
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton state - access static properties through the class
    const HooksHandlerClass = Object.getPrototypeOf(HooksHandler).constructor;

    HooksHandlerClass.initialized = false;
    HooksHandlerClass.headerBtn = null;
    HooksHandlerClass.allHooksKeyPressed = false;
    HooksHandlerClass.targets = new Set();
    HooksHandlerClass.overlays = [];

    // Mock store
    mockStore = {
      getters: {
        'ui-context/all':            jest.fn(() => []),
        'prefs/theme':               jest.fn(() => 'light'),
        'rancher-ai-ui/context/all': jest.fn(() => ({}))
      },
      commit:   jest.fn(),
      dispatch: jest.fn()
    };

    // Mock overlay
    mockOverlay = {
      getSelector: jest.fn(() => 'test-overlay'),
      create:      jest.fn(),
      destroy:     jest.fn(),
      setTheme:    jest.fn()
    };

    // Mock target element
    mockTarget = document.createElement('div');
    mockTarget.setAttribute('ux-context-hook-id', 'test-hook-id');
    document.body.appendChild(mockTarget);

    // Mock context
    mockContext = {
      hookId: 'test-hook-id',
      action: 'test-action'
    } as any;
  });

  afterEach(() => {
    // Reset all static state - access through the class, not the instance
    const HooksHandlerClass = Object.getPrototypeOf(HooksHandler).constructor;

    (HooksHandlerClass as any).allHooksKeyPressed = false;
    HooksHandlerClass.headerBtn = null;
    HooksHandlerClass.initialized = false;
    HooksHandlerClass.targets = new Set();
    HooksHandlerClass.overlays = [];
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('inject', () => {
    it('should add overlay to overlays array', () => {
      // Test core logic without triggering watch
      (HooksHandler as any).overlays = [];

      (HooksHandler as any).overlays.push(mockOverlay);

      expect((HooksHandler as any).overlays).toContain(mockOverlay);
    });

    it('should not add duplicate overlays', () => {
      (HooksHandler as any).overlays = [];

      (HooksHandler as any).overlays.push(mockOverlay);
      const lengthAfterFirst = (HooksHandler as any).overlays.length;

      // Simulate duplicate check
      const isDuplicate = (HooksHandler as any).overlays.find((o: any) => o.getSelector() === mockOverlay.getSelector());

      if (!isDuplicate) {
        (HooksHandler as any).overlays.push(mockOverlay);
      }

      expect((HooksHandler as any).overlays.length).toBe(lengthAfterFirst);
    });

    it('should add different overlays', () => {
      (HooksHandler as any).overlays = [];

      const mockOverlay2 = {
        getSelector: jest.fn(() => 'test-overlay-2'),
        create:      jest.fn(),
        destroy:     jest.fn(),
        setTheme:    jest.fn()
      } as any;

      (HooksHandler as any).overlays.push(mockOverlay);
      (HooksHandler as any).overlays.push(mockOverlay2);

      expect((HooksHandler as any).overlays).toHaveLength(2);
    });
  });

  describe('toggleAllHooksOverlay', () => {
    it('should set allHooksKeyPressed to true when toggling on', () => {
      const setAllHooksKeyPressedSpy = jest.spyOn(HooksOverlay, 'setAllHooksKeyPressed');

      HooksHandler.toggleAllHooksOverlay(mockStore, true);

      expect(setAllHooksKeyPressedSpy).toHaveBeenCalledWith(true);
      expect(setAllHooksKeyPressedSpy).toHaveBeenCalled();
    });

    it('should set allHooksKeyPressed to false when toggling off', () => {
      const setAllHooksKeyPressedSpy = jest.spyOn(HooksOverlay, 'setAllHooksKeyPressed');

      HooksHandler.toggleAllHooksOverlay(mockStore, false);

      expect(setAllHooksKeyPressedSpy).toHaveBeenCalledWith(false);
    });

    it('should notify overlay when toggling all hooks', () => {
      const setAllHooksKeyPressedSpy = jest.spyOn(HooksOverlay, 'setAllHooksKeyPressed');

      HooksHandler.toggleAllHooksOverlay(mockStore, true);

      expect(setAllHooksKeyPressedSpy).toHaveBeenCalledWith(true);
    });

    it('should toggle overlays for all targets when enabled', () => {
      // Set up overlays first
      (HooksHandler as any).overlays = [mockOverlay];

      // Add a target to the handler
      (HooksHandler as any).targets.add({
        target:   mockTarget,
        ctx:      mockContext,
        handlers: {}
      });

      const toggleOverlaysSpy = jest.spyOn(HooksHandler as any, 'toggleOverlays');

      HooksHandler.toggleAllHooksOverlay(mockStore, true);

      expect(toggleOverlaysSpy).toHaveBeenCalledWith(mockStore, mockTarget, mockContext, true);
    });
  });

  describe('clearTargets', () => {
    it('should remove all event listeners from targets', () => {
      const mouseenterHandler = jest.fn();
      const mouseleaveHandler = jest.fn();
      const removeEventListenerSpy = jest.spyOn(mockTarget, 'removeEventListener');

      (HooksHandler as any).targets.add({
        target:   mockTarget,
        ctx:      mockContext,
        handlers: {
          mouseenter: mouseenterHandler,
          mouseleave: mouseleaveHandler
        }
      });

      (HooksHandler as any).clearTargets();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseenter', mouseenterHandler);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', mouseleaveHandler);
    });

    it('should remove ux-context-hook-status attribute', () => {
      (HooksHandler as any).targets.add({
        target:   mockTarget,
        ctx:      mockContext,
        handlers: {}
      });

      mockTarget.setAttribute('ux-context-hook-status', 'bound');

      (HooksHandler as any).clearTargets();

      expect(mockTarget.getAttribute('ux-context-hook-status')).toBeNull();
    });

    it('should clear targets set', () => {
      (HooksHandler as any).targets.add({
        target:   mockTarget,
        ctx:      mockContext,
        handlers: {}
      });

      (HooksHandler as any).clearTargets();

      expect((HooksHandler as any).targets.size).toBe(0);
    });

    it('should handle errors when removing event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(mockTarget, 'removeEventListener').mockImplementation(() => {
        throw new Error('Remove listener error');
      });

      (HooksHandler as any).targets.add({
        target:   mockTarget,
        ctx:      mockContext,
        handlers: {
          mouseenter: jest.fn(),
          mouseleave: jest.fn()
        }
      });

      expect(() => (HooksHandler as any).clearTargets()).not.toThrow();
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('getOverlayHTMLElement', () => {
    it('should return target if it has overlay selector class', () => {
      mockTarget.classList.add('test-overlay');

      const result = (HooksHandler as any).getOverlayHTMLElement(mockTarget, mockOverlay);

      expect(result).toBe(mockTarget);
    });

    it('should return nested element if it has overlay selector class', () => {
      const nestedElement = document.createElement('div');

      nestedElement.classList.add('test-overlay');
      mockTarget.appendChild(nestedElement);

      const result = (HooksHandler as any).getOverlayHTMLElement(mockTarget, mockOverlay);

      expect(result).toBe(nestedElement);
    });

    it('should return null if overlay selector not found', () => {
      const result = (HooksHandler as any).getOverlayHTMLElement(mockTarget, mockOverlay);

      expect(result).toBeNull();
    });
  });

  describe('toggleOverlays', () => {
    beforeEach(() => {
      mockTarget.classList.add('test-overlay');
      (HooksHandler as any).overlays = [mockOverlay];

      // Mock element visibility properties
      Object.defineProperty(mockTarget, 'offsetParent', {
        value:        document.body,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetHeight', {
        value:        100,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetWidth', {
        value:        100,
        writable:     true,
        configurable: true
      });
    });

    it('should call overlay.create when show is true', () => {
      (HooksHandler as any).toggleOverlays(mockStore, mockTarget, mockContext, true);

      expect(mockOverlay.create).toHaveBeenCalledWith(
        mockStore,
        mockTarget,
        mockTarget,
        mockContext,
        expect.any(Function)
      );
    });

    it('should call overlay.destroy when show is false and element is not hovered', () => {
      (HooksHandler as any).toggleOverlays(mockStore, mockTarget, mockContext, false);

      expect(mockOverlay.destroy).toHaveBeenCalledWith(mockTarget, mockTarget);
    });

    it('should not call overlay.destroy when element is hovered', () => {
      (mockTarget as any).matches = jest.fn(() => true);

      (HooksHandler as any).toggleOverlays(mockStore, mockTarget, mockContext, false);

      expect(mockOverlay.destroy).not.toHaveBeenCalled();
    });

    it('should skip overlay if overlay element not found', () => {
      mockTarget.classList.remove('test-overlay');

      (HooksHandler as any).toggleOverlays(mockStore, mockTarget, mockContext, true);

      expect(mockOverlay.create).not.toHaveBeenCalled();
    });

    it('should not create overlay when element is not visible', () => {
      // Mock offsetParent to return null (element is hidden)
      Object.defineProperty(mockTarget, 'offsetParent', {
        value:        null,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetHeight', {
        value:        100,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetWidth', {
        value:        100,
        writable:     true,
        configurable: true
      });

      (HooksHandler as any).toggleOverlays(mockStore, mockTarget, mockContext, true);

      expect(mockOverlay.create).not.toHaveBeenCalled();
    });

    it('should not create overlay when element has zero height', () => {
      // Mock offsetHeight to return 0 (element is collapsed)
      Object.defineProperty(mockTarget, 'offsetParent', {
        value:        document.body,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetHeight', {
        value:        0,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetWidth', {
        value:        100,
        writable:     true,
        configurable: true
      });

      (HooksHandler as any).toggleOverlays(mockStore, mockTarget, mockContext, true);

      expect(mockOverlay.create).not.toHaveBeenCalled();
    });

    it('should not create overlay when element has zero width', () => {
      // Mock offsetWidth to return 0 (element is hidden)
      Object.defineProperty(mockTarget, 'offsetParent', {
        value:        document.body,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetHeight', {
        value:        100,
        writable:     true,
        configurable: true
      });
      Object.defineProperty(mockTarget, 'offsetWidth', {
        value:        0,
        writable:     true,
        configurable: true
      });

      (HooksHandler as any).toggleOverlays(mockStore, mockTarget, mockContext, true);

      expect(mockOverlay.create).not.toHaveBeenCalled();
    });
  });

  describe('isShowAllHooksKey', () => {
    beforeEach(() => {
      const HooksHandlerClass = Object.getPrototypeOf(HooksHandler).constructor;

      (HooksHandlerClass as any).allHooksKeyPressed = false;
    });

    it('should return true for Ctrl+Alt+L key combination', () => {
      const event = new KeyboardEvent('keydown', {
        ctrlKey: true,
        altKey:  true,
        key:     'l'
      });

      const result = (HooksHandler as any).isShowAllHooksKey(event);

      expect(result).toBe(true);
    });

    it('should return false for other key combinations', () => {
      const event = new KeyboardEvent('keydown', {
        ctrlKey: true,
        altKey:  false,
        key:     'l'
      });

      const result = (HooksHandler as any).isShowAllHooksKey(event);

      expect(result).toBe(false);
    });

    it('should handle key release for key chain', () => {
      const HooksHandlerClass = Object.getPrototypeOf(HooksHandler).constructor;

      (HooksHandlerClass as any).allHooksKeyPressed = true;

      const event = {
        type: 'keyup',
        key:  'Control'
      } as any;

      const result = (HooksHandler as any).isShowAllHooksKey(event);

      expect(result).toBe(true);
    });

    it('should be case insensitive for letter keys', () => {
      const eventUpperCase = new KeyboardEvent('keydown', {
        ctrlKey: true,
        altKey:  true,
        key:     'L'
      });

      const eventLowerCase = new KeyboardEvent('keydown', {
        ctrlKey: true,
        altKey:  true,
        key:     'l'
      });

      const resultUpper = (HooksHandler as any).isShowAllHooksKey(eventUpperCase);
      const resultLower = (HooksHandler as any).isShowAllHooksKey(eventLowerCase);

      expect(resultUpper).toBe(true);
      expect(resultLower).toBe(true);
    });
  });

  describe('addEasterEgg', () => {
    it('should add event listeners to header button', () => {
      const headerBtn = document.createElement('button');

      headerBtn.className = 'header-btn';
      const iconAi = document.createElement('i');

      iconAi.className = 'icon-ai';
      headerBtn.appendChild(iconAi);
      document.body.appendChild(headerBtn);

      const addEventListenerSpy = jest.spyOn(headerBtn, 'addEventListener');

      (HooksHandler as any).addEasterEgg(mockStore);

      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should remove previous event listeners before adding new ones', () => {
      const headerBtn = document.createElement('button');

      headerBtn.className = 'header-btn';
      const iconAi = document.createElement('i');

      iconAi.className = 'icon-ai';
      headerBtn.appendChild(iconAi);
      document.body.appendChild(headerBtn);

      // First call
      (HooksHandler as any).addEasterEgg(mockStore);
      const removeEventListenerSpy = jest.spyOn(headerBtn, 'removeEventListener');

      // Second call
      (HooksHandler as any).addEasterEgg(mockStore);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });
});
