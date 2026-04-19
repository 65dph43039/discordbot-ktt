'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { checkCooldown } = require('../../middleware/cooldown');
const { handleCommandError } = require('../../middleware/errorHandler');
const { buildMediaEmbed, buildErrorEmbed } = require('../../utils/embed');
const mediaAction = require('../../features/media/mediaAction');

/**
 * Generic /action command – lets users trigger any GIF action defined in config/media.json.
 * Supports autocomplete to surface available action types.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('action')
    .setDescription('Trigger a roleplay action GIF (e.g. hug, pat, poke).')
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('The type of action to perform')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addUserOption(opt =>
      opt.setName('target').setDescription('The user to target').setRequired(true),
    ),

  async execute(interaction) {
    try {
      if (!await checkCooldown(interaction, 'action')) return;

      const actionType = interaction.options.getString('type');
      const targetUser = interaction.options.getUser('target');
      const gifUrl = mediaAction.getRandomGif(actionType);

      if (!gifUrl) {
        const available = mediaAction.listActions().join(', ') || 'none configured';
        return interaction.reply({
          embeds: [
            buildErrorEmbed(
              `No GIFs configured for **${actionType}**.\nAvailable actions: ${available}`,
            ),
          ],
          ephemeral: true,
        });
      }

      await interaction.reply({
        embeds: [
          buildMediaEmbed({
            action: actionType,
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

  /** Provide autocomplete suggestions from the media.json action keys. */
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = mediaAction
      .listActions()
      .filter(a => a.toLowerCase().startsWith(focused))
      .slice(0, 25)
      .map(a => ({ name: a, value: a }));
    await interaction.respond(choices);
  },
};
