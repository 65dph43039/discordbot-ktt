const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./commands');
const { getConfig } = require('./config');

async function deploy() {
  const config = getConfig();

  if (!config.token || !config.clientId || !config.guildId) {
    throw new Error('BOT_TOKEN, CLIENT_ID and GUILD_ID are required to deploy slash commands.');
  }

  const commands = [...loadCommands().values()].map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.token);

  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });

  console.log(`Registered ${commands.length} guild slash commands.`);
}

deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
