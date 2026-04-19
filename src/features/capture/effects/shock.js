'use strict';

const { buildPunishmentEmbed } = require('../../../utils/embed');
const mediaAction = require('../../media/mediaAction');
const { formatDuration } = require('../../../utils/duration');

/**
 * Shock effect – a purely roleplay/visual action.
 * No permission changes are applied; restoration is a no-op.
 */
const effect = {
  name: 'shock',

  /**
   * @param {{ interaction, target, actor, durationMs }} opts
   */
  async apply({ interaction, target, actor, durationMs }) {
    const gifUrl = mediaAction.getRandomGif('shock');
    const embed = buildPunishmentEmbed({
      type: 'shock',
      target: `<@${target.id}>`,
      actor: `<@${actor.id}>`,
      duration: formatDuration(durationMs),
      description: `⚡ **${actor.displayName}** shocked **${target.displayName}**!`,
    });
    if (gifUrl) embed.setImage(gifUrl);
    await interaction.editReply({ embeds: [embed] });
  },

  /** Shock leaves no permission state to clean up. */
  async restore(_client, _punishment) {},
};

module.exports = effect;
