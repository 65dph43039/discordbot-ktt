'use strict';

const path = require('path');
const fs = require('fs');

const mediaPath = path.join(__dirname, '../../../config/media.json');

let media = {};
try {
  media = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));
  // Strip the meta comment key if present
  delete media['_comment'];
} catch {
  // media.json is optional; GIF features simply return null when unavailable
  media = {};
}

/**
 * Return a random GIF URL for the given action key (e.g. "hug", "shock").
 * Returns null if no GIFs are configured for the action.
 *
 * @param {string} action
 * @returns {string|null}
 */
function getRandomGif(action) {
  const gifs = media[action];
  if (!Array.isArray(gifs) || gifs.length === 0) return null;
  return gifs[Math.floor(Math.random() * gifs.length)];
}

/**
 * List all action keys that have at least one GIF configured.
 *
 * @returns {string[]}
 */
function listActions() {
  return Object.keys(media).filter(k => Array.isArray(media[k]) && media[k].length > 0);
}

module.exports = { getRandomGif, listActions };
