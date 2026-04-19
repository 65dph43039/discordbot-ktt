'use strict';

const shockEffect = require('./effects/shock');
const prisonEffect = require('./effects/prison');
const isolationEffect = require('./effects/isolation');

/** @type {Map<string, { name: string, apply: Function, restore: Function }>} */
const registry = new Map();

/**
 * Register a new effect handler.
 * Each handler must expose:
 *   - name    {string}   – unique effect identifier
 *   - apply   {Function} – async ({ interaction, target, actor, durationMs, guild }) => void
 *   - restore {Function} – async (client, punishment) => void
 *
 * @param {{ name: string, apply: Function, restore: Function }} effect
 */
function register(effect) {
  if (!effect.name || typeof effect.apply !== 'function') {
    throw new Error('Effect must have a name and an apply() function.');
  }
  registry.set(effect.name, effect);
}

/**
 * Retrieve a registered effect by name.
 * Throws if the effect is unknown.
 *
 * @param {string} name
 */
function get(name) {
  const effect = registry.get(name);
  if (!effect) throw new Error(`Unknown effect type: "${name}"`);
  return effect;
}

/**
 * Return all registered effect names.
 *
 * @returns {string[]}
 */
function list() {
  return [...registry.keys()];
}

// ── Register built-in effects ────────────────────────────────────────────────
register(shockEffect);
register(prisonEffect);
register(isolationEffect);

module.exports = { register, get, list };
