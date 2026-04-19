const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release a captured member before timer expiry')
    .addUserOption((option) => option.setName('target').setDescription('User to release').setRequired(true)),
  async execute(interaction, { punishmentService, config }) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'This command only works in a server.', ephemeral: true });
      return;
    }

    if (!punishmentService.isAuthorized(interaction.member, config.captureRoleIds)) {
      await interaction.reply({ content: 'You are not allowed to release members.', ephemeral: true });
      return;
    }

    const target = interaction.options.getUser('target', true);
    const released = await punishmentService.releasePunishment(interaction.guild.id, target.id, 'Released by command');

    if (!released) {
      await interaction.reply({ content: 'That user has no active punishment.', ephemeral: true });
      return;
    }

    await interaction.reply(`🔓 Released ${target} from **${released.mode}** mode.`);
  }
};
