const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const MAX_DURATION_SECONDS = 60 * 60 * 24 * 7;
const MIN_DURATION_SECONDS = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('capture')
    .setDescription('Capture a member with a temporary roleplay punishment')
    .addUserOption((option) => option.setName('target').setDescription('User to capture').setRequired(true))
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Punishment mode')
        .setRequired(true)
        .addChoices(
          { name: 'Electric shock', value: 'shock' },
          { name: 'Prison mode', value: 'prison' },
          { name: 'Isolation mode', value: 'isolation' }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName('duration')
        .setDescription('Duration in seconds')
        .setRequired(true)
        .setMinValue(MIN_DURATION_SECONDS)
        .setMaxValue(MAX_DURATION_SECONDS)
    ),
  async execute(interaction, { punishmentService, config }) {
    const mode = interaction.options.getString('mode', true);
    const durationSeconds = interaction.options.getInteger('duration', true);
    const targetUser = interaction.options.getUser('target', true);

    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'This command only works in a server.', ephemeral: true });
      return;
    }

    const actorMember = interaction.member;
    if (!punishmentService.isAuthorized(actorMember, config.captureRoleIds)) {
      await interaction.reply({
        content: 'You are not allowed to use capture commands (need admin or configured capture role).',
        ephemeral: true
      });
      return;
    }

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({ content: 'You cannot capture yourself.', ephemeral: true });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: 'Target member was not found in this server.', ephemeral: true });
      return;
    }

    if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'You cannot capture an administrator.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const punishment = await punishmentService.applyPunishment({
        actor: interaction.user,
        target: targetMember,
        mode,
        durationSeconds
      });

      const untilUnix = Math.floor(punishment.expiresAt / 1000);
      let modeText = `Mode: **${mode}**`;
      if (mode === 'shock') {
        modeText += `\n${config.gifs.shock}`;
      }

      await interaction.editReply(
        `✅ ${targetUser} has been captured. ${modeText}\nDuration: **${durationSeconds}s** (until <t:${untilUnix}:R>).`
      );
    } catch (error) {
      await interaction.editReply(`Failed to apply punishment: ${error.message}`);
    }
  }
};
