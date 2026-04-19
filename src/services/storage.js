const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_PUNISHMENT_DATA = { punishments: [] };

async function ensureFile(filePath, defaultContent = DEFAULT_PUNISHMENT_DATA) {
  const absolutePath = path.resolve(filePath);
  const dirPath = path.dirname(absolutePath);

  await fs.mkdir(dirPath, { recursive: true });

  try {
    await fs.access(absolutePath);
  } catch {
    await fs.writeFile(absolutePath, JSON.stringify(defaultContent, null, 2));
  }

  return absolutePath;
}

async function readJson(filePath) {
  const absolutePath = await ensureFile(filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');

  return JSON.parse(content);
}

async function writeJson(filePath, payload) {
  const absolutePath = await ensureFile(filePath, payload);
  await fs.writeFile(absolutePath, JSON.stringify(payload, null, 2));
}

module.exports = {
  readJson,
  writeJson
};
