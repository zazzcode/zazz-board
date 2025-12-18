/**
 * Tag Colors Utility
 * Curated list of colors that work well in both light and dark modes
 */

// Carefully selected colors that provide good contrast in both light and dark themes
const TAG_COLORS = [
  '#3B82F6', // Blue - reliable, professional
  '#10B981', // Emerald - fresh, positive
  '#F59E0B', // Amber - warm, attention-grabbing
  '#EF4444', // Red - urgent, important
  '#8B5CF6', // Violet - creative, distinctive
  '#06B6D4', // Cyan - cool, modern
  '#84CC16', // Lime - energetic, growth
  '#F97316', // Orange - vibrant, friendly
  '#EC4899', // Pink - playful, standout
  '#6366F1', // Indigo - deep, trustworthy
];

/**
 * Get a random color from the curated list
 * @returns {string} Hex color code
 */
export function getRandomTagColor() {
  const randomIndex = Math.floor(Math.random() * TAG_COLORS.length);
  return TAG_COLORS[randomIndex];
}

/**
 * Get all available tag colors
 * @returns {string[]} Array of hex color codes
 */
export function getAllTagColors() {
  return [...TAG_COLORS];
}

/**
 * Validate if a color is in our curated list
 * @param {string} color - Hex color code
 * @returns {boolean} True if color is in the curated list
 */
export function isValidTagColor(color) {
  return TAG_COLORS.includes(color);
}
