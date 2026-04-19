const fs = require('node:fs/promises');
const path = require('node:path');

async function ensureFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const dirPath = path.dirname(absolutePath);

  await fs.mkdir(dirPath, { recursive: true });

  try {
    await fs.access(absolutePath);
  } catch {
    await fs.writeFile(absolutePath, JSON.stringify({ punishments: [] }, null, 2));
  }

  return absolutePath;
}

async function readJson(filePath) {
  const absolutePath = await ensureFile(filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');

  return JSON.parse(content);
}

async function writeJson(filePath, payload) {
  const absolutePath = await ensureFile(filePath);
  await fs.writeFile(absolutePath, JSON.stringify(payload, null, 2));
}

module.exports = {
  readJson,
  writeJson
};
