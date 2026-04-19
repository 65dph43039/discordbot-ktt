'use strict';

const logger = require('../core/logger');

/**
 * Fetch an existing role by name, or create it if it does not yet exist.
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} name
 * @param {import('discord.js').RoleCreateOptions} [options]
 * @returns {Promise<import('discord.js').Role>}
 */
async function getOrCreateRole(guild, name, options = {}) {
  let role = guild.roles.cache.find(r => r.name === name);
  if (!role) {
    role = await guild.roles.create({
      name,
      permissions: [],
      reason: 'Bot auto-created role',
      ...options,
    });
    logger.info('Created role', { guild: guild.id, role: role.name, id: role.id });
  }
  return role;
}

/**
 * Add `role` to `member` (no-op if they already have it).
 */
async function addRole(member, role) {
  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role, 'Punishment applied');
  }
}

/**
 * Remove `role` from `member` (no-op if they do not have it).
 */
async function removeRole(member, role) {
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role, 'Punishment expired');
  }
}

/**
 * Return an array of all role IDs the member currently holds, excluding @everyone.
 *
 * @param {import('discord.js').GuildMember} member
 * @returns {string[]}
 */
function snapshotRoles(member) {
  return member.roles.cache
    .filter(r => r.id !== member.guild.id)
    .map(r => r.id);
}

module.exports = { getOrCreateRole, addRole, removeRole, snapshotRoles };
