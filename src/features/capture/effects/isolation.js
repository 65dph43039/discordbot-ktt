'use strict';

const channelService = require('../../../services/channelService');
const roleService = require('../../../services/roleService');
const { buildPunishmentEmbed } = require('../../../utils/embed');
const mediaAction = require('../../media/mediaAction');
const { formatDuration } = require('../../../utils/duration');

/**
 * Isolation ("basement") effect – the target can still view channels but cannot
 * send messages or use slash commands in any of them.
 *
 * What this does:
 *  1. Creates (or fetches) the "Isolated" role.
 *  2. Adds per-member SendMessages: false / UseApplicationCommands: false overwrites
 *     to every text channel in the guild.
 *  3. Assigns the Isolated role to the target.
 *
 * Restoration is handled generically by restoreService (removes overwrites + role).
 */
const effect = {
  name: 'isolation',

  async apply({ interaction, target, actor, durationMs, guild }) {
    await interaction.editReply({ content: '🔇 Applying isolation…' });

    const isolatedRole = await roleService.getOrCreateRole(guild, 'Isolated');

    // Deny sending in all text channels
    await channelService.isolateMember(guild, target);

    // Assign the Isolated role
    await roleService.addRole(target, isolatedRole);

    const gifUrl = mediaAction.getRandomGif('isolation');
    const embed = buildPunishmentEmbed({
      type: 'isolation',
      target: `<@${target.id}>`,
      actor: `<@${actor.id}>`,
      duration: formatDuration(durationMs),
      description: `🔇 **${target.displayName}** has been placed in isolation!`,
    });
    if (gifUrl) embed.setImage(gifUrl);

    await interaction.editReply({ content: null, embeds: [embed] });
  },

  async restore(_client, _punishment) {
    // Handled generically by restoreService
  },
};

module.exports = effect;
