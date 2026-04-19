const {
  ChannelType,
  PermissionFlagsBits,
  OverwriteType
} = require('discord.js');
const { readJson, writeJson } = require('./storage');

const PRISON_CHANNEL_NAME = 'rp-prison';
const BASEMENT_CHANNEL_NAME = 'rp-basement';

class PunishmentService {
  constructor({ client, dataFilePath }) {
    this.client = client;
    this.dataFilePath = dataFilePath;
    this.activePunishments = new Map();
    this.timers = new Map();
  }

  buildKey(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  async init() {
    const payload = await readJson(this.dataFilePath);
    const punishments = Array.isArray(payload.punishments) ? payload.punishments : [];

    for (const punishment of punishments) {
      const key = this.buildKey(punishment.guildId, punishment.userId);
      this.activePunishments.set(key, punishment);

      if (Date.now() >= punishment.expiresAt) {
        await this.releasePunishmentByKey(key, 'Timer expired while bot was offline');
      } else {
        this.scheduleRelease(key);
      }
    }
  }

  listActiveByGuild(guildId) {
    return [...this.activePunishments.values()].filter((p) => p.guildId === guildId);
  }

  isAuthorized(member, captureRoleIds) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    return captureRoleIds.some((roleId) => member.roles.cache.has(roleId));
  }

  async applyPunishment({ actor, target, mode, durationSeconds }) {
    const key = this.buildKey(target.guild.id, target.id);
    if (this.activePunishments.has(key)) {
      throw new Error('Target already has an active punishment.');
    }

    const now = Date.now();
    const expiresAt = now + durationSeconds * 1000;

    const punishment = {
      guildId: target.guild.id,
      userId: target.id,
      mode,
      actorId: actor.id,
      startedAt: now,
      expiresAt,
      permissionSnapshot: []
    };

    if (mode === 'prison' || mode === 'isolation') {
      punishment.permissionSnapshot = this.snapshotMemberOverwrites(target.guild, target.id);
      const restrictedChannel = await this.ensureRestrictedChannel(target.guild, mode);
      punishment.restrictedChannelId = restrictedChannel.id;
      await this.applyChannelRestrictions(target, mode, restrictedChannel.id);
    }

    this.activePunishments.set(key, punishment);
    await this.save();
    this.scheduleRelease(key);

    return punishment;
  }

  async releasePunishment(guildId, userId, reason = 'Timer expired') {
    const key = this.buildKey(guildId, userId);
    return this.releasePunishmentByKey(key, reason);
  }

  async releasePunishmentByKey(key, reason) {
    const punishment = this.activePunishments.get(key);
    if (!punishment) {
      return null;
    }

    const guild = await this.client.guilds.fetch(punishment.guildId).catch(() => null);
    if (guild && (punishment.mode === 'prison' || punishment.mode === 'isolation')) {
      await this.restoreChannelRestrictions(guild, punishment.userId, punishment.permissionSnapshot, reason);
    }

    this.activePunishments.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    await this.save();

    return punishment;
  }

  snapshotMemberOverwrites(guild, userId) {
    return guild.channels.cache
      .filter((channel) => channel.permissionOverwrites)
      .map((channel) => {
        const overwrite = channel.permissionOverwrites.cache.get(userId);
        return {
          channelId: channel.id,
          overwrite: overwrite
            ? {
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.bitfield.toString(),
                deny: overwrite.deny.bitfield.toString()
              }
            : null
        };
      });
  }

  async ensureRestrictedChannel(guild, mode) {
    const channelName = mode === 'prison' ? PRISON_CHANNEL_NAME : BASEMENT_CHANNEL_NAME;
    const markerTopic = `discordbot-ktt:${mode}`;

    let channel = guild.channels.cache.find(
      (candidate) =>
        candidate.type === ChannelType.GuildText &&
        candidate.name === channelName &&
        candidate.topic === markerTopic
    );

    if (!channel) {
      channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: markerTopic,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: this.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels
            ]
          }
        ]
      });
    }

    return channel;
  }

  async applyChannelRestrictions(member, mode, restrictedChannelId) {
    const denyInAllChannels = {
      ViewChannel: false,
      SendMessages: false,
      SendMessagesInThreads: false,
      AddReactions: false,
      UseApplicationCommands: false,
      CreatePrivateThreads: false,
      CreatePublicThreads: false
    };

    const allowInRestrictedChannel =
      mode === 'prison'
        ? {
            ViewChannel: true,
            SendMessages: true,
            SendMessagesInThreads: true,
            ReadMessageHistory: true,
            UseApplicationCommands: true
          }
        : {
            ViewChannel: true,
            SendMessages: false,
            SendMessagesInThreads: false,
            ReadMessageHistory: true,
            UseApplicationCommands: false
          };

    const channels = member.guild.channels.cache.filter((channel) => channel.permissionOverwrites);
    for (const channel of channels.values()) {
      if (channel.id === restrictedChannelId) {
        await channel.permissionOverwrites.edit(member.id, allowInRestrictedChannel);
      } else {
        await channel.permissionOverwrites.edit(member.id, denyInAllChannels);
      }
    }
  }

  async restoreChannelRestrictions(guild, userId, snapshot, reason) {
    for (const item of snapshot) {
      const channel = guild.channels.cache.get(item.channelId);
      if (!channel || !channel.permissionOverwrites) {
        continue;
      }

      const existingWithoutUser = channel.permissionOverwrites.cache
        .filter((overwrite) => overwrite.id !== userId)
        .map((overwrite) => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.bitfield,
          deny: overwrite.deny.bitfield
        }));

      if (item.overwrite) {
        existingWithoutUser.push({
          id: userId,
          type: item.overwrite.type || OverwriteType.Member,
          allow: BigInt(item.overwrite.allow),
          deny: BigInt(item.overwrite.deny)
        });
      }

      await channel.permissionOverwrites.set(existingWithoutUser, reason);
    }
  }

  scheduleRelease(key) {
    const punishment = this.activePunishments.get(key);
    if (!punishment) {
      return;
    }

    const remainingMs = punishment.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.releasePunishmentByKey(key, 'Timer expired').catch(() => {});
      return;
    }

    const maxTimeout = 2_147_483_647;
    const timeoutMs = Math.min(remainingMs, maxTimeout);

    const timer = setTimeout(async () => {
      if (timeoutMs === remainingMs) {
        await this.releasePunishmentByKey(key, 'Timer expired');
      } else {
        this.scheduleRelease(key);
      }
    }, timeoutMs);

    this.timers.set(key, timer);
  }

  async save() {
    await writeJson(this.dataFilePath, {
      punishments: [...this.activePunishments.values()]
    });
  }
}

module.exports = {
  PunishmentService
};
