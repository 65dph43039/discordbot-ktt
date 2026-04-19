'use strict';

const { buildErrorEmbed } = require('../utils/embed');
const { getDb } = require('../storage/adapter');
const config = require('../core/config');

/**
 * Per-user command cooldown check backed by the SQLite `cooldowns` table.
 * If the user is still on cooldown, replies with an ephemeral error and returns false.
 * Otherwise records the new cooldown expiry and returns true.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} commandName
 * @returns {Promise<boolean>} true if the command should proceed
 */
async function checkCooldown(interaction, commandName) {
  const cooldownMs = (config.commandCooldownSeconds ?? 3) * 1_000;
  const userId = interaction.user.id;
  const now = Date.now();

  try {
    const db = getDb();
    const row = db
      .prepare('SELECT expires_at FROM cooldowns WHERE user_id = ? AND command = ?')
      .get(userId, commandName);

    if (row && row.expires_at > now) {
      const remaining = ((row.expires_at - now) / 1_000).toFixed(1);
      await interaction.reply({
        embeds: [buildErrorEmbed(`You're on cooldown. Try again in **${remaining}s**.`)],
        ephemeral: true,
      });
      return false;
    }

    db.prepare(
      'INSERT OR REPLACE INTO cooldowns (user_id, command, expires_at) VALUES (?, ?, ?)',
    ).run(userId, commandName, now + cooldownMs);

    return true;
  } catch {
    // If the DB is unavailable, allow the command to proceed rather than blocking the user.
    return true;
  }
}

module.exports = { checkCooldown };
