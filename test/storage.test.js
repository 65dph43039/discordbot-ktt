const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { readJson, writeJson } = require('../src/services/storage');

test('readJson initializes missing file with default punishment payload', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'discordbot-ktt-storage-'));
  const filePath = path.join(dir, 'nested', 'punishments.json');

  const payload = await readJson(filePath);

  assert.deepEqual(payload, { punishments: [] });
});

test('writeJson persists payload that can be read back', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'discordbot-ktt-storage-'));
  const filePath = path.join(dir, 'state.json');
  const expected = { punishments: [{ guildId: '1', userId: '2' }] };

  await writeJson(filePath, expected);
  const actual = await readJson(filePath);

  assert.deepEqual(actual, expected);
});
