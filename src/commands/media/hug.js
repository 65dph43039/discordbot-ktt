'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { checkCooldown } = require('../../middleware/cooldown');
const { handleCommandError } = require('../../middleware/errorHandler');
const { buildMediaEmbed, buildErrorEmbed } = require('../../utils/embed');
const mediaAction = require('../../features/media/mediaAction');
const config = require('../../core/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.localization.commandNames.hug)
    .setDescription('Send a warm hug to another server member. 🤗')
    .addUserOption(opt =>
      opt.setName('target').setDescription('The user to hug').setRequired(true),
    ),

  async execute(interaction) {
    try {
      if (!await checkCooldown(interaction, 'hug')) return;

      const targetUser = interaction.options.getUser('target');
      const gifUrl = mediaAction.getRandomGif('hug');

      if (!gifUrl) {
        return interaction.reply({
          embeds: [buildErrorEmbed('No hug GIFs are configured yet. Add some to `config/media.json`!')],
          ephemeral: true,
        });
      }

      await interaction.reply({
        embeds: [
          buildMediaEmbed({
            action: 'hug',
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
