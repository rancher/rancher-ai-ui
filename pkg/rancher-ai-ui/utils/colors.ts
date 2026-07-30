/**
 * Convert hex color to RGB.
 *
 * @param hex Hex color string (e.g., "#FFFFFF" or "FFFFFF").
 * @returns Object with r, g, b properties or null if invalid.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{6})$/i);

  if (match) {
    return {
      r: parseInt(match[1].substring(0, 2), 16),
      g: parseInt(match[1].substring(2, 4), 16),
      b: parseInt(match[1].substring(4, 6), 16)
    };
  }

  return null;
}

/**
 * Convert RGB color string to hex format.
 *
 * @param color The color string to convert (e.g., "rgb(255, 255, 255)").
 * @returns Hex color string
 */
export function rgbToHex(color: string): string | null {
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');

    return `#${ r }${ g }${ b }`.toUpperCase();
  }

  return null;
}

/**
 * Check if a color string has transparency (alpha < 1).
 *
 * @param color The color string to check (e.g., "rgba(31, 103, 219, 0.1)").
 * @returns True if the color has transparency (alpha < 1), false otherwise.
 */
export function hasTransparency(color = ''): boolean {
  const hasOpacity = color.includes('rgba') || color.includes('hsla');

  if (hasOpacity) {
    const alphaMatch = color.match(/[\d.]+\s*\)$/);

    if (alphaMatch) {
      const alpha = parseFloat(alphaMatch[0]);

      return alpha < 1;
    }
  }

  return false;
}