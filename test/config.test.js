const test = require('node:test');
const assert = require('node:assert/strict');
const { getConfig } = require('../src/config');

test('getConfig parses capture role ids', () => {
  const previousCaptureRoles = process.env.CAPTURE_ROLE_IDS;
  process.env.CAPTURE_ROLE_IDS = '111, 222 ,333';

  try {
    const config = getConfig();
    assert.deepEqual(config.captureRoleIds, ['111', '222', '333']);
  } finally {
    if (previousCaptureRoles === undefined) {
      delete process.env.CAPTURE_ROLE_IDS;
    } else {
      process.env.CAPTURE_ROLE_IDS = previousCaptureRoles;
    }
  }
});

test('getConfig uses default gifs when env vars missing', () => {
  const previousHug = process.env.HUG_GIF_URL;
  const previousShock = process.env.SHOCK_GIF_URL;
  delete process.env.HUG_GIF_URL;
  delete process.env.SHOCK_GIF_URL;

  try {
    const config = getConfig();
    assert.match(config.gifs.hug, /^https?:\/\//);
    assert.match(config.gifs.shock, /^https?:\/\//);
  } finally {
    if (previousHug === undefined) {
      delete process.env.HUG_GIF_URL;
    } else {
      process.env.HUG_GIF_URL = previousHug;
    }
    if (previousShock === undefined) {
      delete process.env.SHOCK_GIF_URL;
    } else {
      process.env.SHOCK_GIF_URL = previousShock;
    }
  }
});
