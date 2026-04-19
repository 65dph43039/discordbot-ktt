'use strict';

const repo = require('../../storage/repositories/punishmentRepository');
const scheduler = require('../../core/scheduler');
const effectRegistry = require('./effectRegistry');
const roleService = require('../../services/roleService');
const auditService = require('../../services/auditService');
const { restore } = require('../../services/restoreService');
const logger = require('../../core/logger');
const { formatDuration } = require('../../utils/duration');

/**
 * Apply a punishment to a guild member.
 *
 * Flow:
 *  1. Call the appropriate effect handler (applies Discord permission overwrites).
 *  2. Persist the punishment record in SQLite.
 *  3. Schedule the expiry timer.
 *  4. Log to the audit channel.
 *
 * @param {{
 *   interaction: import('discord.js').ChatInputCommandInteraction,
 *   target:      import('discord.js').GuildMember,
 *   actor:       import('discord.js').GuildMember,
 *   type:        string,
 *   durationMs:  number,
 *   client:      import('discord.js').Client,
 * }} opts
 * @returns {Promise<number>} The new punishment record id
 */
async function apply({ interaction, target, actor, type, durationMs, client }) {
  const guild = interaction.guild;
  const now = Date.now();
  const expiresAt = now + durationMs;

  // Snapshot roles before any changes
  const rolesSnapshot = roleService.snapshotRoles(target);

  // Delegate to the effect handler
  const effect = effectRegistry.get(type);
  await effect.apply({ interaction, target, actor, durationMs, guild });

  // Persist record
  const id = repo.save({
    guildId: guild.id,
    targetId: target.id,
    actorId: actor.id,
    type,
    startedAt: now,
    expiresAt,
    rolesSnapshot,
    meta: null,
  });

  // Schedule automatic expiry
  scheduler.schedule(id, expiresAt, () => restore(client, id));

  // Audit log
  await auditService.logAction(guild, {
    action: 'capture',
    actor: `<@${actor.id}>`,
    target: `<@${target.id}>`,
    type,
    duration: formatDuration(durationMs),
  });

  logger.info('Punishment applied', { id, type, target: target.id, guild: guild.id, expiresAt });
  return id;
}

/**
 * Manually release a captured member before their punishment expires.
 * Cancels the scheduled timer and immediately runs the restore flow.
 *
 * @param {{ client, guild, targetId, actorId }} opts
 * @returns {Promise<import('../../storage/repositories/punishmentRepository').PunishmentRecord|null>}
 *   The released punishment record, or null if the user was not captured.
 */
async function release({ client, guild, targetId, actorId }) {
  const raw = repo.findActiveByTarget(guild.id, targetId);
  if (!raw) return null;

  const punishment = repo.parseRecord(raw);
  scheduler.cancel(punishment.id);
  await restore(client, punishment.id);

  await auditService.logAction(guild, {
    action: 'release (manual)',
    actor: `<@${actorId}>`,
    target: `<@${targetId}>`,
    type: punishment.type,
  });

  return punishment;
}

/**
 * On bot startup: reload all active punishments from the database and either
 * restore those that already expired or reschedule timers for those still active.
 * This ensures no punishment is "stuck" after a bot restart or crash.
 *
 * @param {import('discord.js').Client} client
 */
async function reloadActiveOnStartup(client) {
  const records = repo.findAllActiveGlobal();
  logger.info('Reloading active punishments on startup', { count: records.length });

  for (const raw of records) {
    if (Date.now() >= raw.expires_at) {
      // Expired while the bot was offline – restore immediately
      await restore(client, raw.id).catch(err =>
        logger.error('Startup restore failed', { id: raw.id, error: err.message }),
      );
    } else {
      // Still active – reschedule the expiry timer
      scheduler.schedule(raw.id, raw.expires_at, () => restore(client, raw.id));
    }
  }
}

module.exports = { apply, release, reloadActiveOnStartup };
