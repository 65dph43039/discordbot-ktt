const test = require('node:test');
const assert = require('node:assert/strict');
const { getConfig } = require('../src/config');

test('getConfig parses capture role ids', () => {
  process.env.CAPTURE_ROLE_IDS = '111, 222 ,333';

  const config = getConfig();

  assert.deepEqual(config.captureRoleIds, ['111', '222', '333']);
});

test('getConfig uses default gifs when env vars missing', () => {
  delete process.env.HUG_GIF_URL;
  delete process.env.SHOCK_GIF_URL;

  const config = getConfig();

  assert.match(config.gifs.hug, /^https?:\/\//);
  assert.match(config.gifs.shock, /^https?:\/\//);
});
