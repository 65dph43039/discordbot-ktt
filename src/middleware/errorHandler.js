'use strict';

const logger = require('../core/logger');
const { buildErrorEmbed } = require('../utils/embed');

/**
 * Centralised error handler for slash command execution failures.
 * Logs the error and responds to the interaction with a generic error message.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {Error} error
 */
async function handleCommandError(interaction, error) {
  logger.error('Command error', {
    command: interaction.commandName,
    user: interaction.user.id,
    guild: interaction.guildId,
    error: error.message,
    stack: error.stack,
  });

  const embed = buildErrorEmbed('An unexpected error occurred. Please try again later.');
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed], content: null });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch {
    // If we cannot even send the error reply, swallow silently.
  }
}

module.exports = { handleCommandError };
