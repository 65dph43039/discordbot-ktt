'use strict';

const { buildErrorEmbed } = require('../utils/embed');
const { isCaptor } = require('../services/permissionService');

/**
 * Middleware that verifies the interaction author has captor-level permissions.
 * Replies with an ephemeral error and returns false if the check fails.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {Promise<boolean>} true if the command should proceed
 */
async function requireCaptor(interaction) {
  if (!interaction.guild) {
    await interaction.reply({
      embeds: [buildErrorEmbed('This command can only be used inside a server.')],
      ephemeral: true,
    });
    return false;
  }
  if (!isCaptor(interaction.member)) {
    await interaction.reply({
      embeds: [buildErrorEmbed('You do not have permission to use this command.')],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

module.exports = { requireCaptor };
