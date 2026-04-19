'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Events } = require('discord.js');
const cron = require('node-cron');

const config = require('./core/config');
const logger = require('./core/logger');
const { connect } = require('./storage/adapter');
const registry = require('./commands/registry');
const punishmentManager = require('./features/capture/punishmentManager');
const { handleCommandError } = require('./middleware/errorHandler');
const repo = require('./storage/repositories/punishmentRepository');
const { restore } = require('./services/restoreService');

// ── Startup validation ───────────────────────────────────────────────────────

if (!config.token) {
  logger.error('DISCORD_TOKEN is not set. Add it to your .env file and restart.');
  process.exit(1);
}

if (!config.clientId) {
  logger.error('CLIENT_ID is not set. Add it to your .env file and restart.');
  process.exit(1);
}

// ── Database ─────────────────────────────────────────────────────────────────

connect();

// ── Command registry ─────────────────────────────────────────────────────────

registry.loadCommands();

// ── Discord client ────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// ── Event: ready ─────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async () => {
  logger.info('Bot is online', { tag: client.user.tag, id: client.user.id });

  // Restore any punishments that expired while the bot was offline,
  // and reschedule timers for those still active.
  await punishmentManager.reloadActiveOnStartup(client);

  // Start the periodic reconciliation job as a safety net
  startReconciliationJob(client);
});

// ── Event: interaction ────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = registry.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (err) {
      await handleCommandError(interaction, err);
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = registry.get(interaction.commandName);
    if (command?.autocomplete) {
      await command.autocomplete(interaction).catch(err =>
        logger.error('Autocomplete error', {
          command: interaction.commandName,
          error: err.message,
        }),
      );
    }
  }
});

// ── Reconciliation job ────────────────────────────────────────────────────────

/**
 * Runs on a configurable cron schedule to catch any punishments whose
 * in-memory timer was missed (e.g. due to a crash or very long delay).
 *
 * @param {import('discord.js').Client} discordClient
 */
function startReconciliationJob(discordClient) {
  const interval = config.reconciliationIntervalMinutes ?? 5;
  cron.schedule(`*/${interval} * * * *`, async () => {
    logger.debug('Running reconciliation job');
    const expired = repo.findAllActiveGlobal().filter(r => Date.now() >= r.expires_at);
    for (const record of expired) {
      await restore(discordClient, record.id).catch(err =>
        logger.error('Reconciliation restore failed', { id: record.id, error: err.message }),
      );
    }
  });
  logger.info('Reconciliation job started', { intervalMinutes: interval });
}

// ── Login ─────────────────────────────────────────────────────────────────────

client.login(config.token).catch(err => {
  logger.error('Failed to login to Discord', { error: err.message });
  process.exit(1);
});
