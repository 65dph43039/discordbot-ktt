const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Send a hug GIF to a member')
    .addUserOption((option) => option.setName('target').setDescription('User to hug').setRequired(true)),
  async execute(interaction, { config }) {
    const target = interaction.options.getUser('target', true);

    await interaction.reply({
      content: `${interaction.user} sends a warm hug to ${target}!`,
      allowedMentions: { users: [target.id] }
    });

    await interaction.followUp(config.gifs.hug);
  }
};
