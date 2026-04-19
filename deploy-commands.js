'use strict';

/**
 * deploy-commands.js
 *
 * Registers all slash commands with Discord.
 *
 * Usage:
 *   node deploy-commands.js
 *
 * If GUILD_ID is set in .env the commands are registered to that specific guild
 * (instant propagation – ideal for development).
 * Without GUILD_ID they are registered globally (takes up to 1 hour to propagate).
 */

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const registry = require('./src/commands/registry');
const config = require('./src/core/config');
const logger = require('./src/core/logger');

if (!config.token) {
  logger.error('DISCORD_TOKEN is not set. Check your .env file.');
  process.exit(1);
}

if (!config.clientId) {
  logger.error('CLIENT_ID is not set. Check your .env file.');
  process.exit(1);
}

registry.loadCommands();
const commandPayloads = registry.getAll().map(cmd => cmd.data.toJSON());

const rest = new REST().setToken(config.token);

(async () => {
  try {
    logger.info(`Registering ${commandPayloads.length} slash command(s)…`);

    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandPayloads },
      );
      logger.info('Guild slash commands registered (instant).', { guildId: config.guildId });
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandPayloads },
      );
      logger.info('Global slash commands registered (may take up to 1 hour to appear).');
    }
  } catch (err) {
    logger.error('Failed to register slash commands', { error: err.message });
    process.exit(1);
  }
})();
