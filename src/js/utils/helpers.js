/**
 * Converts degrees to radians
 * @param {number} degrees - The angle in degrees
 * @returns {number} The angle in radians
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Creates a delay using a Promise
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamps a value between a minimum and maximum
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

/**
 * Linear interpolation between two values
 * @param {number} a - Starting value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Get a random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
export function random(min, max) {
  return Math.random() * (max - min) + min;
}
