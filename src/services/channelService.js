'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../core/config');
const logger = require('../core/logger');

/**
 * Return the guild's designated prison channel, creating it if it does not exist.
 * The channel is only visible to members who have been explicitly granted access.
 *
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<import('discord.js').TextChannel>}
 */
async function getOrCreatePrisonChannel(guild) {
  let channel = guild.channels.cache.find(
    c => c.name === config.prisonChannelName && c.type === ChannelType.GuildText,
  );
  if (!channel) {
    channel = await guild.channels.create({
      name: config.prisonChannelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        // Hide from everyone by default; prisoners get explicit access via member overwrite.
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ],
      reason: 'Bot auto-created prison channel',
    });
    logger.info('Created prison channel', { guild: guild.id, channel: channel.id });
  }
  return channel;
}

/**
 * Add per-member permission overwrites to every text/voice channel in the guild
 * that denies ViewChannel, except `allowedChannel` (the prison channel).
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').GuildChannel|null} allowedChannel
 * @returns {Promise<string[]>} IDs of channels that were modified
 */
async function denyAllChannels(guild, member, allowedChannel) {
  await guild.channels.fetch();
  const promises = [];
  const modified = [];
  for (const channel of guild.channels.cache.values()) {
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildVoice &&
      channel.type !== ChannelType.GuildAnnouncement &&
      channel.type !== ChannelType.GuildForum
    ) continue;
    if (allowedChannel && channel.id === allowedChannel.id) continue;
    promises.push(
      channel.permissionOverwrites
        .create(member, { ViewChannel: false, SendMessages: false }, { reason: 'Prison punishment' })
        .then(() => modified.push(channel.id))
        .catch(err => logger.warn('Failed to overwrite channel', { channel: channel.id, error: err.message })),
    );
  }
  await Promise.allSettled(promises);
  return modified;
}

/**
 * Grant a member explicit ViewChannel + SendMessages access to a single channel.
 *
 * @param {import('discord.js').GuildChannel} channel
 * @param {import('discord.js').GuildMember} member
 */
async function allowChannel(channel, member) {
  await channel.permissionOverwrites.create(
    member,
    { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
    { reason: 'Prison channel access' },
  );
}

/**
 * Add per-member permission overwrites to all text channels that deny sending
 * messages and using slash commands (isolation mode).
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<string[]>} IDs of channels that were modified
 */
async function isolateMember(guild, member) {
  await guild.channels.fetch();
  const promises = [];
  const modified = [];
  for (const channel of guild.channels.cache.values()) {
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) continue;
    promises.push(
      channel.permissionOverwrites
        .create(
          member,
          { SendMessages: false, UseApplicationCommands: false, AddReactions: false },
          { reason: 'Isolation punishment' },
        )
        .then(() => modified.push(channel.id))
        .catch(err => logger.warn('Failed to overwrite channel', { channel: channel.id, error: err.message })),
    );
  }
  await Promise.allSettled(promises);
  return modified;
}

/**
 * Remove all user-specific permission overwrites that the bot created during a punishment.
 * Safe to call when no overwrites exist (no-op in that case).
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} member
 */
async function removeAllOverwrites(guild, member) {
  await guild.channels.fetch();
  const promises = [];
  for (const channel of guild.channels.cache.values()) {
    // Thread channels do not have their own permissionOverwrites – skip them.
    const overwrite = channel.permissionOverwrites?.cache?.get(member.id);
    if (overwrite) {
      promises.push(overwrite.delete('Punishment expired').catch(() => {}));
    }
  }
  await Promise.allSettled(promises);
}

module.exports = {
  getOrCreatePrisonChannel,
  denyAllChannels,
  allowChannel,
  isolateMember,
  removeAllOverwrites,
};
