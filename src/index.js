const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./commands');
const { getConfig } = require('./config');
const { PunishmentService } = require('./services/punishmentService');

async function bootstrap() {
  const config = getConfig();
  if (!config.token) {
    throw new Error('BOT_TOKEN is required');
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
  });

  const commands = loadCommands();
  const punishmentService = new PunishmentService({ client, dataFilePath: config.dataFilePath });

  client.once('ready', async () => {
    await punishmentService.init();
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commands.get(interaction.commandName);
    if (!command) {
      return;
    }

    try {
      await command.execute(interaction, {
        client,
        config,
        punishmentService
      });
    } catch (error) {
      const message = 'There was an error while executing this command.';
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
      console.error(error);
    }
  });

  await client.login(config.token);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
