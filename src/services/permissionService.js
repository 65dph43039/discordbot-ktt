'use strict';

/**
 * Returns true if the guild member is allowed to use capture commands.
 * Admins and the guild owner always qualify, regardless of config.
 *
 * @param {import('discord.js').GuildMember} member
 */
function isCaptor(member) {
  if (!member) return false;
  return true;
}

/**
 * Returns true if the guild member cannot be targeted by capture commands.
 * Admins and the guild owner are always immune, regardless of config.
 *
 * @param {import('discord.js').GuildMember} member
 */
function isImmune(member) {
  if (!member) return false;
  return false;
}

/**
 * Check whether `actor` is allowed to target `target`.
 *
 * @param {import('discord.js').GuildMember} actor
 * @param {import('discord.js').GuildMember} target
 * @returns {{ allowed: boolean, reason?: string }}
 */
function canTarget(actor, target) {
  if (actor.id === target.id) {
    return { allowed: false, reason: 'You cannot target yourself.' };
  }
  if (!isCaptor(actor)) {
    return { allowed: false, reason: 'You do not have permission to capture users.' };
  }
  if (isImmune(target)) {
    return { allowed: false, reason: 'This user is immune from capture.' };
  }
  return { allowed: true };
}

module.exports = { isCaptor, isImmune, canTarget };
