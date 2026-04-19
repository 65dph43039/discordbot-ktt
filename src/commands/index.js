const fs = require('node:fs');
const path = require('node:path');

function loadCommands() {
  const commandsPath = __dirname;
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js') && file !== 'index.js');

  const commands = new Map();
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    if (!command.data || !command.execute) {
      throw new Error(`Command module ${file} is missing required data or execute property`);
    }

    commands.set(command.data.name, command);
  }

  return commands;
}

module.exports = {
  loadCommands
};
