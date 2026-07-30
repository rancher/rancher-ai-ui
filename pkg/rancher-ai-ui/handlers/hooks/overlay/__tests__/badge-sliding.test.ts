import {
  describe, it, expect, beforeEach, jest, afterEach
} from '@jest/globals';
import BadgeSlidingOverlay from '../badge-sliding';
import { Context, HookContextTag } from '../../../../types';

// Mock dependencies
jest.mock('vue', () => ({
  nextTick: jest.fn((cb?: () => void) => {
    if (cb) {
      cb();
    }

    return Promise.resolve();
  })
}));

jest.mock('@shell/composables/useI18n', () => ({ useI18n: jest.fn(() => ({ t: jest.fn((key) => key) })) }));

jest.mock('../../template-message', () => ({
  __esModule: true,
  default:    { fill: jest.fn(() => 'test-message') }
}));

jest.mock('../../../chat', () => ({
  __esModule: true,
  default:    { open: jest.fn() }
}));

jest.mock('../../../../utils/log', () => ({ warn: jest.fn() }));

jest.mock('@shell/utils/string', () => ({ randomStr: jest.fn(() => 'test-id-12345') }));

describe('BadgeSlidingOverlay', () => {
  let mockStore: any;
  let targetElement: HTMLElement;
  let badgeElement: HTMLElement;
  let containerElement: HTMLElement;
  let mockContext: Context;
  let mockGlobalCtx: Context[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ResizeObserver and MutationObserver globally
    // eslint-disable-next-line no-undef
    (global as any).ResizeObserver = jest.fn(() => ({
      observe:    jest.fn(),
      disconnect: jest.fn(),
      unobserve:  jest.fn()
    })) as any;

    // eslint-disable-next-line no-undef
    (global as any).MutationObserver = jest.fn(() => ({
      observe:    jest.fn(),
      disconnect: jest.fn()
    })) as any;

    // Setup mock store
    mockStore = {
      getters:  { 'prefs/theme': jest.fn(() => 'light') },
      commit:   jest.fn(),
      dispatch: jest.fn()
    };

    // Setup mock context
    mockContext = {
      tag:    HookContextTag.SortableTableRow,
      hookId: 'test-hook',
      action: 'test-action'
    } as any;

    mockGlobalCtx = [];

    // Setup DOM elements
    containerElement = document.createElement('div');
    containerElement.style.position = 'relative';
    document.body.appendChild(containerElement);

    targetElement = document.createElement('div');
    targetElement.setAttribute('ux-context-hook-id', 'test-hook');
    containerElement.appendChild(targetElement);

    badgeElement = document.createElement('span');
    badgeElement.className = 'bg-warning';
    badgeElement.style.position = 'fixed';
    badgeElement.style.top = '10px';
    badgeElement.style.left = '10px';
    badgeElement.style.height = '24px';
    badgeElement.style.width = '60px';
    badgeElement.style.fontSize = '12px';
    badgeElement.style.marginRight = '0';
    badgeElement.style.marginLeft = '0';
    badgeElement.textContent = 'test-badge';
    containerElement.appendChild(badgeElement);

    const mockGetPropertyValue = jest.fn((prop: string) => {
      const cssVars: any = {
        '--body-bg':      '#ffffff',
        '--warning':      '#ff9800',
        '--error':        '#f44336',
        '--darker':       '#333333',
        '--primary-bg':   '#1d1d1d',
        '--primary-text': '#ffffff'
      };

      if (cssVars[prop]) {
        return cssVars[prop];
      }

      return '';
    });

    window.getComputedStyle = jest.fn(() => ({
      fontSize:         '12px',
      marginRight:      '0px',
      marginLeft:       '0px',
      zIndex:           '0',
      backgroundColor:  '#ff9800',
      getPropertyValue: mockGetPropertyValue
    })) as any;

    // Mock getBoundingClientRect
    badgeElement.getBoundingClientRect = jest.fn(() => ({
      top:    10,
      left:   10,
      width:  60,
      height: 24,
      bottom: 34,
      right:  70
    } as DOMRect));

    containerElement.getBoundingClientRect = jest.fn(() => ({
      top:    0,
      left:   0,
      width:  800,
      height: 600,
      bottom: 600,
      right:  800
    } as DOMRect));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('blendTransparentColor', () => {
    it('should blend rgba color with white in light theme', () => {
      const result = (BadgeSlidingOverlay as any).blendTransparentColor('rgba(31, 103, 219, 0.1)', 'light');

      // Result should be solid rgb color
      expect(result).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      // Should contain no alpha channel
      expect(result).not.toContain('rgba');
    });

    it('should blend rgba color with dark gray in dark theme', () => {
      const result = (BadgeSlidingOverlay as any).blendTransparentColor('rgba(31, 103, 219, 0.1)', 'dark');

      // Result should be solid rgb color
      expect(result).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      // Should contain no alpha channel
      expect(result).not.toContain('rgba');
    });

    it('should calculate correct blended values for light theme', () => {
      // rgba(100, 100, 100, 0.5) blended with white (255, 255, 255)
      // Result: (100 * 0.5 + 255 * 0.5, ...) = (177.5, 177.5, 177.5) -> (178, 178, 178)
      const result = (BadgeSlidingOverlay as any).blendTransparentColor('rgba(100, 100, 100, 0.5)', 'light');

      expect(result).toBe('rgb(178, 178, 178)');
    });

    it('should calculate correct blended values for dark theme', () => {
      // rgba(100, 100, 100, 0.5) blended with dark gray (37, 40, 47)
      // Result: (100 * 0.5 + 37 * 0.5, ...) = (68.5→69, 70, 73.5→74)
      const mockGetPropertyValue = jest.fn(() => ''); // Empty to trigger fallback

      (window.getComputedStyle as jest.Mock).mockReturnValueOnce({
        fontSize:         '12px',
        marginRight:      '0px',
        marginLeft:       '0px',
        zIndex:           '0',
        backgroundColor:  'rgba(100, 100, 100, 0.5)',
        getPropertyValue: mockGetPropertyValue
      });
      (window.getComputedStyle as jest.Mock).mockReturnValueOnce({ getPropertyValue: jest.fn(() => '') });

      const result = (BadgeSlidingOverlay as any).blendTransparentColor('rgba(100, 100, 100, 0.5)', 'dark');

      expect(result).toBe('rgb(69, 70, 74)');
    });

    it('should handle hsla colors', () => {
      const result = (BadgeSlidingOverlay as any).blendTransparentColor('hsla(120, 100%, 50%, 0.2)', 'light');

      // Should still return rgb format (not handling hsla parse specially, but should not error)
      expect(result).toBeDefined();
    });

    it('should return original color if no rgba/hsla match', () => {
      const hexColor = '#ff0000';
      const result = (BadgeSlidingOverlay as any).blendTransparentColor(hexColor, 'light');

      expect(result).toBe(hexColor);
    });

    it('should handle full opacity (alpha = 1) correctly', () => {
      // rgba(200, 100, 50, 1.0) blended with white
      // Result: (200 * 1 + 255 * 0, 100 * 1 + 255 * 0, 50 * 1 + 255 * 0) = (200, 100, 50)
      const result = (BadgeSlidingOverlay as any).blendTransparentColor('rgba(200, 100, 50, 1)', 'light');

      expect(result).toBe('rgb(200, 100, 50)');
    });

    it('should handle zero alpha correctly', () => {
      // rgba(100, 100, 100, 0) blended with white (255, 255, 255)
      // Result: (100 * 0 + 255 * 1, ...) = (255, 255, 255)
      const result = (BadgeSlidingOverlay as any).blendTransparentColor('rgba(100, 100, 100, 0)', 'light');

      expect(result).toBe('rgb(255, 255, 255)');
    });
  });

  describe('computeColorProperties', () => {
    it('should compute light theme properties for warning badge', () => {
      const result = (BadgeSlidingOverlay as any).computeColorProperties(badgeElement, 'light');

      expect(result).toHaveProperty('badge');
      expect(result).toHaveProperty('overlay');
      expect(result.overlay.background).toBe('#496192');
      expect(result.overlay.color).toBe('var(--primary-text)');
    });

    it('should compute dark theme properties with different opacity', () => {
      const result = (BadgeSlidingOverlay as any).computeColorProperties(badgeElement, 'dark');

      expect(result).toHaveProperty('badge');
      expect(result).toHaveProperty('overlay');
      expect(result.badge.background).toBeDefined();
    });

    it('should have background property in badge color properties', () => {
      const result = (BadgeSlidingOverlay as any).computeColorProperties(badgeElement, 'light');

      expect(result.badge).toHaveProperty('background');
      expect(result.badge.background).not.toBe('');
    });

    it('should use CSS variable --body-bg for blending when available', () => {
      // Blended with white (255, 255, 255) should give: rgb(178, 178, 178)
      (window.getComputedStyle as jest.Mock).mockReturnValueOnce({
        fontSize:         '12px',
        marginRight:      '0px',
        marginLeft:       '0px',
        zIndex:           '0',
        backgroundColor:  'rgba(100, 100, 100, 0.5)',
        getPropertyValue: jest.fn((prop: string) => {
          if (prop === '--body-bg') {
            return '#ffffff';
          }

          return '';
        })
      });

      const result = (BadgeSlidingOverlay as any).computeColorProperties(badgeElement, 'light');

      expect(result.badge.background).toBe('rgb(178, 178, 178)');
    });

    it('should fallback to hardcoded colors when CSS variable not available', () => {
      // Blended with dark fallback (37, 40, 47) should give: rgb(69, 70, 74)
      const mockEmptyGetPropertyValue = jest.fn(() => '');

      (window.getComputedStyle as jest.Mock).mockReturnValueOnce({
        fontSize:         '12px',
        marginRight:      '0px',
        marginLeft:       '0px',
        zIndex:           '0',
        backgroundColor:  'rgba(100, 100, 100, 0.5)',
        getPropertyValue: mockEmptyGetPropertyValue
      });

      (window.getComputedStyle as jest.Mock).mockReturnValueOnce({ getPropertyValue: jest.fn(() => '') });

      (window.getComputedStyle as jest.Mock).mockReturnValueOnce({ getPropertyValue: jest.fn(() => '') });

      const result = (BadgeSlidingOverlay as any).computeColorProperties(badgeElement, 'dark');

      expect(result.badge.background).toBe('rgb(69, 70, 74)');
    });
  });

  describe('create', () => {
    it('should create and append overlay to DOM with correct attributes', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      const overlays = containerElement.querySelectorAll('[data-testid="rancher-ai-ui-hook-overlay"]');

      expect(overlays.length).toBeGreaterThan(0);
      expect(overlays[0].hasAttribute(`context-overlay-badge-state`)).toBe(true);
    });

    it('should set overlay styling correctly', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      const overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]') as HTMLElement;

      expect(overlay).toBeTruthy();
      expect(overlay.style.position).toBe('fixed');
      expect(overlay.style.zIndex).toBe('10');
      // Accept both hex and rgb color formats
      const bgColor = overlay.style.backgroundColor;

      expect(bgColor === '#496192' || bgColor === 'rgb(73, 97, 146)').toBe(true);
      expect(overlay.style.cursor).toBe('pointer');
    });

    it('should increase badge zIndex to prevent overlay from covering it', () => {
      const initialZIndex = badgeElement.style.zIndex;

      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      expect(badgeElement.style.zIndex).not.toBe(initialZIndex);
      expect(parseInt(badgeElement.style.zIndex)).toBeGreaterThan(parseInt(initialZIndex || '0'));
    });

    it('should create AI icon element inside overlay', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      const overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]') as HTMLElement;
      const icon = overlay?.querySelector('.icon-ai');

      expect(icon).toBeTruthy();
    });
  });

  describe('restore badge style', () => {
    it('should restore badge background when overlay is removed', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      // Manually set background to simulate what create() does in real scenarios
      badgeElement.style.background = '#ff9800';

      // Verify cleanup function is attached
      expect((badgeElement as any).__cleanupStyle).toBeDefined();

      // Use destroy to test the actual removal flow
      BadgeSlidingOverlay.destroy(targetElement, badgeElement, true);

      // Background should be cleared by cleanup
      expect(badgeElement.style.background).toBe('');
    });

    it('should clear badge zIndex when last overlay is removed', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      // Manually set zIndex to simulate what create() does
      badgeElement.style.zIndex = '12';

      // Use destroy to test the actual removal flow
      BadgeSlidingOverlay.destroy(targetElement, badgeElement, true);

      // zIndex should be cleared by cleanup
      expect(badgeElement.style.zIndex).toBe('');
    });

    it('should preserve badge styles if other overlays still exist', () => {
      // Create two overlays
      const badge2 = document.createElement('span');

      badge2.className = 'bg-error';
      containerElement.appendChild(badge2);

      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);
      BadgeSlidingOverlay.create(mockStore, targetElement, badge2, mockContext, mockGlobalCtx);

      const initialZIndex = badgeElement.style.zIndex;

      // Destroy overlays for badge2, leaving badge1 and its overlay intact
      BadgeSlidingOverlay.destroy(targetElement, badge2, true);

      // badge1's zIndex should still be set since its overlay still exists
      expect(badgeElement.style.zIndex).toBe(initialZIndex);
      expect(badgeElement.style.zIndex).not.toBe('');
    });
  });

  describe('overlay interactions', () => {
    it('should emit click event and call action', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);
      const overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]') as HTMLElement;

      overlay?.click();

      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addToMessageBox',
        expect.any(Object)
      );
    });

    it('should expand overlay on mouseenter', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);
      const overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]') as HTMLElement;
      const initialWidth = parseInt(overlay.style.width);

      const enterEvent = new MouseEvent('mouseenter', { bubbles: true });

      overlay?.dispatchEvent(enterEvent);

      const expandedWidth = parseInt(overlay.style.width);

      expect(expandedWidth).toBeGreaterThan(initialWidth);
    });

    it('should collapse overlay on mouseleave when allHooksKeyPressed is false', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);
      const overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]') as HTMLElement;

      const enterEvent = new MouseEvent('mouseenter', { bubbles: true });

      overlay?.dispatchEvent(enterEvent);

      const leaveEvent = new MouseEvent('mouseleave', { bubbles: true });

      overlay?.dispatchEvent(leaveEvent);

      // Animation should start (width and opacity set to 0)
      expect(overlay.style.width).toBe('0px');
      expect(overlay.style.opacity).toBe('0');
    });
  });

  describe('getContainer', () => {
    it('should return parent element for default context', () => {
      const context = { tag: HookContextTag.DetailsState } as any;

      (BadgeSlidingOverlay as any).hookContextTag = context.tag;

      const container = (BadgeSlidingOverlay as any).getContainer(targetElement);

      expect(container).toBe(containerElement);
    });

    it('should return closest tbody for SortableTableRow context', () => {
      const tbody = document.createElement('tbody');
      const tr = document.createElement('tr');
      const td = document.createElement('td');

      tbody.appendChild(tr);
      tr.appendChild(td);
      document.body.appendChild(tbody);

      const context = { tag: HookContextTag.SortableTableRow } as any;

      (BadgeSlidingOverlay as any).hookContextTag = context.tag;

      const container = (BadgeSlidingOverlay as any).getContainer(td);

      expect(container).toBe(tbody);

      tbody.remove();
    });
  });

  describe('destroy', () => {
    it('should remove overlay immediately when immediate=true', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      let overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]');

      expect(overlay).toBeTruthy();

      BadgeSlidingOverlay.destroy(targetElement, badgeElement, true);

      overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]');
      expect(overlay).toBeFalsy();
    });

    it('should animate overlay removal when immediate=false', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);
      const overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]') as HTMLElement;

      expect(overlay).toBeTruthy();
      expect(overlay.style.opacity).not.toBe('0');

      BadgeSlidingOverlay.destroy(targetElement, badgeElement, false);

      // Check animation started
      expect(overlay.style.width).toBe('0px');
      expect(overlay.style.opacity).toBe('0');
    });
  });

  describe('setTheme', () => {
    it('should update badge background on theme change', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);

      // Spy on computeColorProperties to ensure it returns a background color
      const computeSpy = jest.spyOn(BadgeSlidingOverlay as any, 'computeColorProperties');

      computeSpy.mockReturnValue({
        badge:   {
          background: '#ff9800',
          color:      ''
        },
        overlay: {
          background: '#496192',
          color:      'var(--primary-text)'
        }
      });

      // Simulate theme change
      mockStore.getters['prefs/theme'] = jest.fn(() => 'dark');
      BadgeSlidingOverlay.setTheme(badgeElement, 'dark' as any);

      // Background should be set to a color value after setTheme is called
      const updatedBackground = badgeElement.style.background;

      expect(updatedBackground === '#ff9800' || updatedBackground === 'rgb(255, 152, 0)').toBe(true);
    });
  });

  describe('removeOverlayAndRestoreBadge', () => {
    it('should remove overlay and call cleanup style', () => {
      BadgeSlidingOverlay.create(mockStore, targetElement, badgeElement, mockContext, mockGlobalCtx);
      const overlay = containerElement.querySelector('[data-testid="rancher-ai-ui-hook-overlay"]') as HTMLElement;

      const cleanupMock = jest.fn();

      (badgeElement as any).__cleanupStyle = cleanupMock;

      (BadgeSlidingOverlay as any).removeOverlayAndRestoreBadge(overlay, badgeElement);

      expect(overlay.parentElement).toBeFalsy();
      expect(cleanupMock).toHaveBeenCalled();
    });

    it('should handle missing cleanup function gracefully', () => {
      const overlay = document.createElement('div');

      containerElement.appendChild(overlay);

      expect(() => {
        (BadgeSlidingOverlay as any).removeOverlayAndRestoreBadge(overlay, badgeElement);
      }).not.toThrow();
    });
  });
});
