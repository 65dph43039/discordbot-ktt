'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');

const settingsPath = path.join(__dirname, '../../config/settings.json');
let settings = {};
try {
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }
} catch {
  // settings.json is optional
}

function parseProbability(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  /** Set GUILD_ID for instant dev command registration; leave blank for global. */
  guildId: process.env.GUILD_ID || null,
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/bot.db'),
  /** Comma-separated role IDs that may use capture commands (admins are always allowed). */
  captorRoleIds: (process.env.CAPTOR_ROLE_IDS || '').split(',').filter(Boolean),
  /** Comma-separated role IDs that cannot be captured (admins are always immune). */
  immuneRoleIds: (process.env.IMMUNE_ROLE_IDS || '').split(',').filter(Boolean),
  /** Slash command name for the media shock command. */
  shockCommandName: process.env.SHOCK_COMMAND_NAME || 'shock',
  /** Success probability for capture attempts that apply prison/isolation. */
  captureSuccessRate: parseProbability(process.env.CAPTURE_SUCCESS_RATE, 0.25),
  /** Channel ID for audit log messages. */
  auditChannelId: process.env.AUDIT_CHANNEL_ID || null,
  prisonChannelName: 'prison',
  reconciliationIntervalMinutes: 5,
  commandCooldownSeconds: 3,
  // Merge file-based settings (lower priority than env vars)
  ...settings,
};

module.exports = config;
