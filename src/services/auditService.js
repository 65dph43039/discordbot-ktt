'use strict';

const { EmbedBuilder, Colors } = require('discord.js');
const config = require('../core/config');
const logger = require('../core/logger');

/**
 * Send a structured log message to the configured audit channel.
 * Silently does nothing if no audit channel is configured or it cannot be fetched.
 *
 * @param {import('discord.js').Guild} guild
 * @param {{ action: string, actor: string, target: string, type?: string, duration?: string, reason?: string }} opts
 */
async function logAction(guild, { action, actor, target, type, duration, reason }) {
  if (!config.auditChannelId) return;
  try {
    const channel = await guild.channels.fetch(config.auditChannelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(action.startsWith('restore') || action.startsWith('release') ? Colors.Green : Colors.Orange)
      .setTitle(`📋 Audit: ${action}`)
      .addFields(
        { name: 'Target', value: target, inline: true },
        { name: 'Actor', value: actor, inline: true },
        { name: 'Type', value: type || '-', inline: true },
      )
      .setTimestamp();

    if (duration) embed.addFields({ name: 'Duration', value: duration, inline: true });
    if (reason) embed.addFields({ name: 'Reason', value: reason });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.warn('Failed to log to audit channel', { error: err.message });
  }
}

module.exports = { logAction };
