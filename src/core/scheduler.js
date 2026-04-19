'use strict';

const logger = require('./logger');

/**
 * In-memory map of punishmentId -> NodeJS timeout handle.
 * On restart all timers are lost; punishmentManager.reloadActiveOnStartup()
 * re-populates this map from the database.
 */
const timers = new Map();

/**
 * Schedule a callback to fire at `expiresAt` (Unix ms timestamp).
 * If the time is already in the past the callback fires on the next tick.
 * Calling schedule() with an id that already has a timer cancels the old one first.
 *
 * @param {number|string} id        - Unique identifier (punishment DB row id)
 * @param {number}        expiresAt - Unix timestamp in milliseconds
 * @param {Function}      callback  - Async function to execute on expiry
 */
function schedule(id, expiresAt, callback) {
  cancel(id);
  const delay = Math.max(0, expiresAt - Date.now());
  const handle = setTimeout(async () => {
    timers.delete(id);
    try {
      await callback();
    } catch (err) {
      logger.error('Scheduled job error', { id, error: err.message });
    }
  }, delay);
  timers.set(id, handle);
  logger.debug('Scheduled job', { id, delayMs: delay, expiresAt });
}

/**
 * Cancel a previously scheduled timer by id.
 * Safe to call even if no timer exists for the id.
 */
function cancel(id) {
  const handle = timers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    timers.delete(id);
  }
}

/** Returns the number of currently active timers (useful for health checks). */
function activeCount() {
  return timers.size;
}

module.exports = { schedule, cancel, activeCount };
