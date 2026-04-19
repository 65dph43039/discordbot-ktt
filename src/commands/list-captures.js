const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('captures').setDescription('List active captures in this server'),
  async execute(interaction, { punishmentService, config }) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'This command only works in a server.', ephemeral: true });
      return;
    }

    if (!punishmentService.isAuthorized(interaction.member, config.captureRoleIds)) {
      await interaction.reply({ content: 'You are not allowed to view captures.', ephemeral: true });
      return;
    }

    const captures = punishmentService.listActiveByGuild(interaction.guild.id);
    if (captures.length === 0) {
      await interaction.reply('No active captures.');
      return;
    }

    const lines = captures.map((capture) => {
      const remaining = Math.max(1, Math.floor((capture.expiresAt - Date.now()) / 1000));
      return `• <@${capture.userId}> - **${capture.mode}** (${remaining}s left)`;
    });

    await interaction.reply(lines.join('\n'));
  }
};
