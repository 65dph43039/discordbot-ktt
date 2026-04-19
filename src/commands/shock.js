const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shock')
    .setDescription('Trigger an electric shock roleplay action')
    .addUserOption((option) => option.setName('target').setDescription('User to shock').setRequired(true)),
  async execute(interaction, { config }) {
    const target = interaction.options.getUser('target', true);

    await interaction.reply({
      content: `⚡ ${interaction.user} shocks ${target}!`,
      allowedMentions: { users: [target.id] }
    });

    await interaction.followUp(config.gifs.shock);
  }
};
