'use strict';

const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const { handleCommandError } = require('../../middleware/errorHandler');
const repo = require('../../storage/repositories/punishmentRepository');
const { formatDuration } = require('../../utils/duration');
const config = require('../../core/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.localization.commandNames.punishmentStatus)
    .setDescription('Check the active punishment status of a server member.')
    .addUserOption(opt =>
      opt.setName('target').setDescription('The user to check').setRequired(true),
    ),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('target');
      const raw = repo.findActiveByTarget(interaction.guildId, targetUser.id);

      if (!raw) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Green)
              .setDescription(`✅ <@${targetUser.id}> has no active punishments.`),
          ],
          ephemeral: true,
        });
      }

      const punishment = repo.parseRecord(raw);
      const remaining = Math.max(0, punishment.expires_at - Date.now());

      const embed = new EmbedBuilder()
        .setColor(Colors.Orange)
        .setTitle('⚠️ Active Punishment')
        .addFields(
          { name: 'Target', value: `<@${punishment.target_id}>`, inline: true },
          {
            name: 'Type',
            value: config.localization.punishmentTypes[punishment.type] || punishment.type,
            inline: true,
          },
          { name: 'Time Remaining', value: formatDuration(remaining), inline: true },
          { name: 'Applied By', value: `<@${punishment.actor_id}>`, inline: true },
          { name: 'Started', value: `<t:${Math.floor(punishment.started_at / 1000)}:R>`, inline: true },
          { name: 'Expires', value: `<t:${Math.floor(punishment.expires_at / 1000)}:R>`, inline: true },
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await handleCommandError(interaction, err);
    }
  },
};
