'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { checkCooldown } = require('../../middleware/cooldown');
const { handleCommandError } = require('../../middleware/errorHandler');
const { buildMediaEmbed, buildErrorEmbed } = require('../../utils/embed');
const mediaAction = require('../../features/media/mediaAction');
const config = require('../../core/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.shockCommandName)
    .setDescription('Zap another user with an electric shock! ⚡')
    .addUserOption(opt =>
      opt.setName('target').setDescription('The user to shock').setRequired(true),
    ),

  async execute(interaction) {
    try {
      if (!await checkCooldown(interaction, 'shock')) return;

      const targetUser = interaction.options.getUser('target');
      const gifUrl = mediaAction.getRandomGif('shock');

      if (!gifUrl) {
        return interaction.reply({
          embeds: [buildErrorEmbed('No shock GIFs are configured yet. Add some to `config/media.json`!')],
          ephemeral: true,
        });
      }

      await interaction.reply({
        embeds: [
          buildMediaEmbed({
            action: 'shock',
            actor: interaction.member?.displayName ?? interaction.user.username,
            target: targetUser.username,
            gifUrl,
          }),
        ],
      });
    } catch (err) {
      await handleCommandError(interaction, err);
    }
  },
};
