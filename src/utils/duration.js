'use strict';

const UNIT_MS = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parse a human-readable duration string into milliseconds.
 * Accepts values like "30s", "10m", "2h", "1d" (case-insensitive).
 * Decimal values are allowed (e.g. "1.5h").
 *
 * @param {string} str
 * @returns {number|null} Milliseconds, or null if parsing fails or result is zero/negative.
 */
function parseDuration(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().match(/^(\d+(?:\.\d+)?)\s*([smhd])$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const ms = value * (UNIT_MS[unit] ?? 0);
  return ms > 0 ? ms : null;
}

/**
 * Format a millisecond value into the most appropriate human-readable unit.
 *
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms < 60_000) return `${Math.round(ms / 1_000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

module.exports = { parseDuration, formatDuration };
