import { describe, it, expect } from '@jest/globals';
import { hasTransparency, hexToRgb, rgbToHex } from '../colors';

describe('Color utility functions', () => {
  describe('hasTransparency', () => {
    it('should return true for rgba with alpha < 1', () => {
      const result = hasTransparency('rgba(31, 103, 219, 0.1)');

      expect(result).toBe(true);
    });

    it('should return true for rgba with alpha = 0.5', () => {
      const result = hasTransparency('rgba(255, 0, 0, 0.5)');

      expect(result).toBe(true);
    });

    it('should return false for rgba with alpha = 1', () => {
      const result = hasTransparency('rgba(31, 103, 219, 1)');

      expect(result).toBe(false);
    });

    it('should return false for rgb color (no alpha channel)', () => {
      const result = hasTransparency('rgb(31, 103, 219)');

      expect(result).toBe(false);
    });

    it('should return true for hsla with alpha < 1', () => {
      const result = hasTransparency('hsla(120, 100%, 50%, 0.3)');

      expect(result).toBe(true);
    });

    it('should return false for hsl color (no alpha channel)', () => {
      const result = hasTransparency('hsl(120, 100%, 50%)');

      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = hasTransparency('');

      expect(result).toBe(false);
    });
  });

  describe('hexToRgb', () => {
    it('should convert hex color to RGB object', () => {
      const result = hexToRgb('#FFFFFF');

      expect(result).toEqual({
        r: 255,
        g: 255,
        b: 255
      });
    });

    it('should convert hex without # to RGB object', () => {
      const result = hexToRgb('000000');

      expect(result).toEqual({
        r: 0,
        g: 0,
        b: 0
      });
    });

    it('should convert hex with lowercase to RGB object', () => {
      const result = hexToRgb('#ff9800');

      expect(result).toEqual({
        r: 255,
        g: 152,
        b: 0
      });
    });

    it('should return null for invalid hex string', () => {
      const result = hexToRgb('#FFF');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = hexToRgb('');

      expect(result).toBeNull();
    });

    it('should return null for non-hex string', () => {
      const result = hexToRgb('not-a-color');

      expect(result).toBeNull();
    });

    it('should handle specific test colors', () => {
      const darkBg = hexToRgb('#25282F');

      expect(darkBg).toEqual({
        r: 37,
        g: 40,
        b: 47
      });

      const lightBg = hexToRgb('#ffffff');

      expect(lightBg).toEqual({
        r: 255,
        g: 255,
        b: 255
      });
    });
  });

  describe('rgbToHex', () => {
    it('should convert rgb color to hex', () => {
      const result = rgbToHex('rgb(255, 255, 255)');

      expect(result).toBe('#FFFFFF');
    });

    it('should handle rgb with spaces', () => {
      const result = rgbToHex('rgb(100, 100, 100)');

      expect(result).toBe('#646464');
    });

    it('should convert rgb(0, 0, 0) to black hex', () => {
      const result = rgbToHex('rgb(0, 0, 0)');

      expect(result).toBe('#000000');
    });

    it('should return null for hex color', () => {
      const result = rgbToHex('#ff9800');

      expect(result).toBeNull();
    });

    it('should return null for hex without hash', () => {
      const result = rgbToHex('FF9800');

      expect(result).toBeNull();
    });

    it('should return null for non-rgb format', () => {
      const hexColor = '#FF0000';
      const result = rgbToHex(hexColor);

      expect(result).toBeNull();
    });

    it('should return null for rgba format', () => {
      const rgbaColor = 'rgba(255, 0, 0, 0.5)';
      const result = rgbToHex(rgbaColor);

      expect(result).toBeNull();
    });

    it('should pad single digit hex values with zeros', () => {
      // rgb(15, 15, 15) = #0F0F0F
      const result = rgbToHex('rgb(15, 15, 15)');

      expect(result).toBe('#0F0F0F');
    });
  });
});
