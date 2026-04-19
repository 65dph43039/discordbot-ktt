'use strict';

const channelService = require('../../../services/channelService');
const roleService = require('../../../services/roleService');
const { buildPunishmentEmbed } = require('../../../utils/embed');
const mediaAction = require('../../media/mediaAction');
const { formatDuration } = require('../../../utils/duration');

/**
 * Prison effect – restricts the target to a single "prison" channel.
 *
 * What this does:
 *  1. Creates (or fetches) the guild's "Prisoner" role.
 *  2. Creates (or fetches) the "#prison" channel, visible only to those explicitly allowed.
 *  3. Adds per-member ViewChannel: false overwrites to every other channel.
 *  4. Grants the target explicit access to the prison channel.
 *  5. Assigns the Prisoner role to the target.
 *
 * Restoration is handled generically by restoreService (removes overwrites + role).
 */
const effect = {
  name: 'prison',

  async apply({ interaction, target, actor, durationMs, guild }) {
    await interaction.editReply({ content: '🔒 Applying prison restrictions…' });

    const [prisonerRole, prisonChannel] = await Promise.all([
      roleService.getOrCreateRole(guild, 'Prisoner'),
      channelService.getOrCreatePrisonChannel(guild),
    ]);

    // Deny target from all channels except the prison channel
    await channelService.denyAllChannels(guild, target, prisonChannel);

    // Grant access to the prison channel specifically
    await channelService.allowChannel(prisonChannel, target);

    // Assign the Prisoner role
    await roleService.addRole(target, prisonerRole);

    const gifUrl = mediaAction.getRandomGif('prison');
    const embed = buildPunishmentEmbed({
      type: 'prison',
      target: `<@${target.id}>`,
      actor: `<@${actor.id}>`,
      duration: formatDuration(durationMs),
      description: `🔒 **${target.displayName}** has been thrown in prison!`,
    });
    if (gifUrl) embed.setImage(gifUrl);

    await interaction.editReply({ content: null, embeds: [embed] });

    // Notify the target in the prison channel
    await prisonChannel
      .send({
        content: `<@${target.id}> You have been imprisoned for **${formatDuration(durationMs)}**. Sit tight.`,
      })
      .catch(() => {});
  },

  async restore(_client, _punishment) {
    // Handled generically by restoreService
  },
};

module.exports = effect;
