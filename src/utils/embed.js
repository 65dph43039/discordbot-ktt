'use strict';

const { EmbedBuilder, Colors } = require('discord.js');

const PUNISHMENT_COLORS = {
  shock: Colors.Yellow,
  prison: Colors.DarkRed,
  isolation: Colors.DarkGrey,
};

/**
 * Build an embed announcing a punishment has been applied.
 */
function buildPunishmentEmbed({ type, target, actor, duration, description }) {
  return new EmbedBuilder()
    .setColor(PUNISHMENT_COLORS[type] ?? Colors.Blue)
    .setTitle(`⚠️ ${capitalize(type)} applied`)
    .setDescription(description ?? `**${target}** has been subjected to **${type}**.`)
    .addFields(
      { name: 'Target', value: target, inline: true },
      { name: 'By', value: actor, inline: true },
      { name: 'Duration', value: duration, inline: true },
    )
    .setTimestamp();
}

/**
 * Build an embed announcing a punishment has expired / been removed.
 */
function buildRestorationEmbed({ type, target }) {
  return new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle(`✅ ${capitalize(type)} expired`)
    .setDescription(`**${target}** has been released from **${type}**.`)
    .setTimestamp();
}

/**
 * Build a media action embed (hug, shock, pat, etc.).
 */
function buildMediaEmbed({ action, actor, target, gifUrl }) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setDescription(`**${actor}** ${action}s **${target}**! 🎉`)
    .setTimestamp();
  if (gifUrl) embed.setImage(gifUrl);
  return embed;
}

/**
 * Build a simple error embed.
 */
function buildErrorEmbed(message) {
  return new EmbedBuilder().setColor(Colors.Red).setDescription(`❌ ${message}`);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  buildPunishmentEmbed,
  buildRestorationEmbed,
  buildMediaEmbed,
  buildErrorEmbed,
};
