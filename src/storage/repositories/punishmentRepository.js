'use strict';

const { getDb } = require('../adapter');

/**
 * @typedef {Object} PunishmentRecord
 * @property {number}        id
 * @property {string}        guild_id
 * @property {string}        target_id
 * @property {string}        actor_id
 * @property {string}        type          - 'shock' | 'prison' | 'isolation'
 * @property {number}        started_at    - Unix timestamp ms
 * @property {number}        expires_at    - Unix timestamp ms
 * @property {number|null}   restored_at   - Unix timestamp ms, or null if still active
 * @property {string[]|null} rolesSnapshot - Parsed role ID list
 * @property {Object|null}   meta          - Parsed extra metadata
 */

/**
 * Persist a new punishment and return its auto-generated id.
 */
function save(punishment) {
  const stmt = getDb().prepare(`
    INSERT INTO punishments
      (guild_id, target_id, actor_id, type, started_at, expires_at, roles_snapshot, meta)
    VALUES
      (@guild_id, @target_id, @actor_id, @type, @started_at, @expires_at, @roles_snapshot, @meta)
  `);
  const result = stmt.run({
    guild_id: punishment.guildId,
    target_id: punishment.targetId,
    actor_id: punishment.actorId,
    type: punishment.type,
    started_at: punishment.startedAt,
    expires_at: punishment.expiresAt,
    roles_snapshot: punishment.rolesSnapshot ? JSON.stringify(punishment.rolesSnapshot) : null,
    meta: punishment.meta ? JSON.stringify(punishment.meta) : null,
  });
  return result.lastInsertRowid;
}

/** Find the most recent active punishment for a specific guild member. */
function findActiveByTarget(guildId, targetId) {
  return getDb()
    .prepare(`
      SELECT * FROM punishments
      WHERE guild_id = ? AND target_id = ? AND restored_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `)
    .get(guildId, targetId);
}

/** Find all active punishments in a guild. */
function findAllActive(guildId) {
  return getDb()
    .prepare(`
      SELECT * FROM punishments
      WHERE guild_id = ? AND restored_at IS NULL
    `)
    .all(guildId);
}

/** Find all active punishments across all guilds (used for startup recovery). */
function findAllActiveGlobal() {
  return getDb()
    .prepare('SELECT * FROM punishments WHERE restored_at IS NULL')
    .all();
}

/** Mark a punishment as restored at the current time. */
function markRestored(id) {
  getDb()
    .prepare('UPDATE punishments SET restored_at = ? WHERE id = ?')
    .run(Date.now(), id);
}

/** Fetch a punishment record by its primary key. */
function findById(id) {
  return getDb().prepare('SELECT * FROM punishments WHERE id = ?').get(id);
}

/**
 * Parse the JSON columns in a raw database row.
 * Returns null if the record is falsy.
 *
 * @param {Object|null} record
 * @returns {PunishmentRecord|null}
 */
function parseRecord(record) {
  if (!record) return null;
  return {
    ...record,
    rolesSnapshot: record.roles_snapshot ? JSON.parse(record.roles_snapshot) : null,
    meta: record.meta ? JSON.parse(record.meta) : null,
  };
}

module.exports = {
  save,
  findActiveByTarget,
  findAllActive,
  findAllActiveGlobal,
  markRestored,
  findById,
  parseRecord,
};
