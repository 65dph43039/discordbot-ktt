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

const DEFAULT_LOCALIZATION = {
  commandNames: {
    capture: 'batcoc',
    release: 'thatu',
    punishmentStatus: 'trangthaiphat',
    action: 'hanhdong',
    hug: 'om',
    shock: 'chichdien',
  },
  punishmentTypes: {
    shock: 'chichdien',
    prison: 'nhottu',
    isolation: 'colap',
  },
  mediaAliases: {
    om: 'hug',
    var: 'slap',
    chichdien: 'shock',
    nhottu: 'prison',
    colap: 'isolation',
  },
  defaultCaptureType: 'shock',
};

const configuredLocalization = settings.localization ?? {};
const localization = {
  commandNames: {
    ...DEFAULT_LOCALIZATION.commandNames,
    ...(configuredLocalization.commandNames ?? {}),
  },
  punishmentTypes: {
    ...DEFAULT_LOCALIZATION.punishmentTypes,
    ...(configuredLocalization.punishmentTypes ?? {}),
  },
  mediaAliases: {
    ...DEFAULT_LOCALIZATION.mediaAliases,
    ...(configuredLocalization.mediaAliases ?? {}),
  },
  defaultCaptureType:
    process.env.DEFAULT_CAPTURE_TYPE ||
    configuredLocalization.defaultCaptureType ||
    DEFAULT_LOCALIZATION.defaultCaptureType,
};

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
  /** Channel ID for audit log messages. */
  auditChannelId: process.env.AUDIT_CHANNEL_ID || null,
  prisonChannelName: 'prison',
  reconciliationIntervalMinutes: 5,
  commandCooldownSeconds: 3,
  // Merge file-based settings (lower priority than env vars)
  ...settings,
  /** Slash command name for the media shock command. */
  shockCommandName:
    process.env.SHOCK_COMMAND_NAME ||
    settings.shockCommandName ||
    localization.commandNames.shock,
  /** Success probability for capture attempts that apply prison/isolation. */
  captureSuccessRate: parseProbability(process.env.CAPTURE_SUCCESS_RATE, 0.25),
  /** Default duration used when /capture duration is omitted. */
  captureDefaultDuration:
    process.env.CAPTURE_DEFAULT_DURATION || settings.captureDefaultDuration || '10m',
  localization,
};

module.exports = config;
