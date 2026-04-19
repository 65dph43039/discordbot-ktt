'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { handleCommandError } = require('../../middleware/errorHandler');
const { buildErrorEmbed, buildRestorationEmbed } = require('../../utils/embed');
const punishmentManager = require('../../features/capture/punishmentManager');
const config = require('../../core/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.localization.commandNames.release)
    .setDescription('Manually release a captured user before their punishment expires.')
    .addUserOption(opt =>
      opt.setName('target').setDescription('The user to release').setRequired(true),
    ),

  async execute(interaction, client) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          embeds: [buildErrorEmbed('This command can only be used inside a server.')],
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser('target');
      await interaction.deferReply();

      const punishment = await punishmentManager.release({
        client,
        guild: interaction.guild,
        targetId: targetUser.id,
        actorId: interaction.user.id,
      });

      if (!punishment) {
        return interaction.editReply({
          embeds: [buildErrorEmbed(`<@${targetUser.id}> has no active punishment to release.`)],
        });
      }

      await interaction.editReply({
        embeds: [
          buildRestorationEmbed({
            type: punishment.type,
            target: `<@${targetUser.id}>`,
          }),
        ],
      });
    } catch (err) {
      await handleCommandError(interaction, err);
    }
  },
};
