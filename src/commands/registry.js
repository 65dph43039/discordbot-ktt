'use strict';

const path = require('path');
const fs = require('fs');
const logger = require('../core/logger');

/** @type {Map<string, { data: import('discord.js').SlashCommandBuilder, execute: Function, autocomplete?: Function }>} */
const commands = new Map();

/**
 * Auto-discover and load all command modules from subdirectories of this folder.
 *
 * Convention: every *.js file inside a subdirectory must export:
 *   - data     {SlashCommandBuilder}  slash command definition
 *   - execute  {Function}             async (interaction, client) => void
 *   - autocomplete? {Function}        async (interaction) => void  (optional)
 *
 * @returns {Map<string, Object>}
 */
function loadCommands() {
  const commandsDir = __dirname;
  const categories = fs
    .readdirSync(commandsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const command = require(filePath);

      if (!command.data || typeof command.execute !== 'function') {
        logger.warn('Skipping command file – missing data or execute export', { file: filePath });
        continue;
      }

      commands.set(command.data.name, command);
      logger.debug('Loaded command', { name: command.data.name, category, file });
    }
  }

  logger.info('Commands loaded', { count: commands.size });
  return commands;
}

/**
 * Look up a command by its registered slash-command name.
 *
 * @param {string} name
 * @returns {Object|undefined}
 */
function get(name) {
  return commands.get(name);
}

/**
 * Return all loaded command objects (useful for deploy-commands.js).
 *
 * @returns {Object[]}
 */
function getAll() {
  return [...commands.values()];
}

module.exports = { loadCommands, get, getAll };
