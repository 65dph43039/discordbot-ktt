'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { checkCooldown } = require('../../middleware/cooldown');
const { handleCommandError } = require('../../middleware/errorHandler');
const { canTarget } = require('../../services/permissionService');
const { parseDuration } = require('../../utils/duration');
const config = require('../../core/config');
const { buildErrorEmbed } = require('../../utils/embed');
const punishmentManager = require('../../features/capture/punishmentManager');
const repo = require('../../storage/repositories/punishmentRepository');

const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1_000; // 7 days

module.exports = {
  data: new SlashCommandBuilder()
    .setName('capture')
    .setDescription('Capture a user and apply a roleplay punishment.')
    .addUserOption(opt =>
      opt.setName('target').setDescription('The user to capture').setRequired(true),
    )
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('The punishment type to apply')
        .setRequired(true)
        .addChoices(
          { name: '⚡ Shock – roleplay electric shock (visual only)', value: 'shock' },
          { name: '🔒 Prison – confined to the prison channel', value: 'prison' },
          { name: '🔇 Isolation – can see but not send messages', value: 'isolation' },
        ),
    )
    .addStringOption(opt =>
      opt
        .setName('duration')
        .setDescription('How long the punishment lasts (e.g. 10m, 2h, 1d)')
        .setRequired(true),
    ),

  async execute(interaction, client) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          embeds: [buildErrorEmbed('This command can only be used inside a server.')],
          ephemeral: true,
        });
      }
      if (!await checkCooldown(interaction, 'capture')) return;

      const targetUser = interaction.options.getUser('target');
      const type = interaction.options.getString('type');
      const durationStr = interaction.options.getString('duration');

      // Validate duration
      const durationMs = parseDuration(durationStr);
      if (!durationMs) {
        return interaction.reply({
          embeds: [buildErrorEmbed('Invalid duration. Use formats like `30s`, `10m`, `2h`, `1d`.')],
          ephemeral: true,
        });
      }
      if (durationMs > MAX_DURATION_MS) {
        return interaction.reply({
          embeds: [buildErrorEmbed('Maximum punishment duration is **7 days**.')],
          ephemeral: true,
        });
      }

      // Resolve the target guild member
      const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!target) {
        return interaction.reply({
          embeds: [buildErrorEmbed('Could not find that user in this server.')],
          ephemeral: true,
        });
      }

      // Permission check
      const check = canTarget(interaction.member, target);
      if (!check.allowed) {
        return interaction.reply({ embeds: [buildErrorEmbed(check.reason)], ephemeral: true });
      }

      // Prevent double-punishment
      const existing = repo.findActiveByTarget(interaction.guild.id, target.id);
      if (existing) {
        return interaction.reply({
          embeds: [buildErrorEmbed(`<@${target.id}> is already captured (**${existing.type}**). Release them first.`)],
          ephemeral: true,
        });
      }

      const requiresCaptureRoll = type === 'prison' || type === 'isolation';
      if (requiresCaptureRoll && Math.random() >= config.captureSuccessRate) {
        return interaction.reply({
          embeds: [buildErrorEmbed(`Capture failed. You can only use **${type}** after a successful capture.`)],
          ephemeral: true,
        });
      }

      // Defer so we have time to apply overwrites (may involve many API calls)
      await interaction.deferReply();

      await punishmentManager.apply({
        interaction,
        target,
        actor: interaction.member,
        type,
        durationMs,
        client,
      });
    } catch (err) {
      await handleCommandError(interaction, err);
    }
  },
};
