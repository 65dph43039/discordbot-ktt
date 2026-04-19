'use strict';

const logger = require('../core/logger');
const repo = require('../storage/repositories/punishmentRepository');
const { removeAllOverwrites } = require('./channelService');
const { removeRole } = require('./roleService');
const auditService = require('./auditService');

// Role names created by each punishment type (must match effect handlers)
const PUNISHMENT_ROLES = {
  prison: 'Prisoner',
  isolation: 'Isolated',
};

/**
 * Restore a member's permissions after a punishment expires or is manually removed.
 * This function is idempotent: calling it multiple times for the same punishment id
 * is safe and produces no additional side effects after the first successful call.
 *
 * @param {import('discord.js').Client} client
 * @param {number} punishmentId
 */
async function restore(client, punishmentId) {
  const raw = repo.findById(punishmentId);
  if (!raw) {
    logger.warn('Restore: punishment record not found', { id: punishmentId });
    return;
  }

  const punishment = repo.parseRecord(raw);

  if (punishment.restored_at) {
    logger.debug('Restore: already restored, skipping', { id: punishmentId });
    return;
  }

  const guild = await client.guilds.fetch(punishment.guild_id).catch(() => null);
  if (!guild) {
    logger.warn('Restore: guild not found – marking restored anyway', { guild: punishment.guild_id });
    repo.markRestored(punishmentId);
    return;
  }

  const member = await guild.members.fetch(punishment.target_id).catch(() => null);
  if (!member) {
    logger.warn('Restore: member not found – marking restored anyway', { target: punishment.target_id });
    repo.markRestored(punishmentId);
    return;
  }

  try {
    // Remove any per-channel overwrites the bot added during punishment
    await removeAllOverwrites(guild, member);

    // Remove punishment-specific role if applicable
    const roleName = PUNISHMENT_ROLES[punishment.type];
    if (roleName) {
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (role) await removeRole(member, role);
    }

    repo.markRestored(punishmentId);
    logger.info('Punishment restored', {
      id: punishmentId,
      target: punishment.target_id,
      type: punishment.type,
    });

    await auditService.logAction(guild, {
      action: 'restore (auto)',
      actor: 'Bot',
      target: `<@${punishment.target_id}>`,
      type: punishment.type,
    });
  } catch (err) {
    logger.error('Restore failed', { id: punishmentId, error: err.message, stack: err.stack });
  }
}

module.exports = { restore };
