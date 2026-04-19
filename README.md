# discordbot-ktt

A Discord bot with a **roleplay punishment / capture** system and extendable media-action commands, built with Node.js and [discord.js v14](https://discord.js.org/).

---

## Features

| Feature | Description |
|---|---|
| `/capture @user <type> <duration>` | Capture a user and apply shock / prison / isolation |
| `/release @user` | Manually release a captured user early |
| `/punishment-status @user` | Check remaining punishment time |
| `/hug @user` | Send a hug GIF |
| `/shock @user` | Send a shock GIF (visual-only, no permission changes; name can be changed) |
| `/action <type> @user` | Generic GIF action (autocomplete from `config/media.json`) |

### Punishment modes

| Mode | Effect |
|---|---|
| `shock` | Roleplay-only message + GIF – no permission changes |
| `prison` | Target can only see and write in the auto-created **#prison** channel (requires successful capture roll) |
| `isolation` | Target can see all channels but cannot send messages or use slash commands (requires successful capture roll) |

All punishments **automatically expire** after the specified duration and restore the member's original access. Timers survive bot restarts via SQLite persistence and a startup-recovery mechanism.

---

## Tech stack

- **Runtime**: Node.js ≥ 18
- **Discord**: discord.js v14
- **Database**: SQLite via `better-sqlite3` (zero external dependencies)
- **Scheduler**: In-memory `setTimeout` + `node-cron` reconciliation job
- **Tests**: Jest

---

## Quick start

### 1. Clone & install

```bash
git clone https://github.com/65dph43039/discordbot-ktt.git
cd discordbot-ktt
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in DISCORD_TOKEN and CLIENT_ID
```

### 3. Register slash commands

```bash
# Guild-scoped (instant, good for development) – set GUILD_ID in .env first
npm run deploy

# Global commands (up to 1 h propagation)
# Remove GUILD_ID from .env, then:
npm run deploy
```

### 4. Start the bot

```bash
npm start
# or for development with auto-restart:
npm run dev
```

---

## Configuration

### `.env` variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from the [Developer Portal](https://discord.com/developers/applications) |
| `CLIENT_ID` | ✅ | Application (client) ID |
| `GUILD_ID` | optional | Register commands to a single guild for instant dev updates |
| `CAPTOR_ROLE_IDS` | optional | Legacy setting (capture commands are now open to everyone) |
| `IMMUNE_ROLE_IDS` | optional | Legacy setting (all members can now be targeted) |
| `SHOCK_COMMAND_NAME` | optional | Slash command name for shock media command (example: `chichdien`) |
| `CAPTURE_SUCCESS_RATE` | optional | Success rate for prison/isolation capture roll (`0..1`, default `0.25`) |
| `AUDIT_CHANNEL_ID` | optional | Channel ID where punishment actions are logged |
| `DB_PATH` | optional | Path to the SQLite file (default: `./data/bot.db`) |
| `LOG_LEVEL` | optional | `error` / `warn` / `info` / `debug` (default: `info`) |

### `config/settings.json`

| Key | Default | Description |
|---|---|---|
| `prisonChannelName` | `"prison"` | Name of the auto-created prison channel |
| `reconciliationIntervalMinutes` | `5` | How often the reconciliation cron runs |
| `commandCooldownSeconds` | `3` | Per-user command cooldown in seconds |
| `shockCommandName` | `"shock"` | Shock slash-command name (overridden by `SHOCK_COMMAND_NAME`) |
| `captureSuccessRate` | `0.25` | Success rate for prison/isolation capture roll (overridden by `CAPTURE_SUCCESS_RATE`) |

### `config/media.json`

Add GIF URLs per action key. The bot picks one at random on each use.

```json
{
  "hug": ["https://...gif", "https://...gif"],
  "shock": ["https://...gif"],
  "prison": ["https://...gif"],
  "slap": ["https://...gif"]
}
```

Any key you add here is automatically available as an option in `/action <type>`.

### Rename `/shock` command (example: `/chichdien`)

1. Set `SHOCK_COMMAND_NAME=chichdien` in `.env` (or `shockCommandName` in `config/settings.json`).
2. Run `npm run deploy` to re-register slash commands.
3. Use the new command name in Discord.

---

## Project structure

```
src/
├── index.js                      Entry point
├── core/
│   ├── config.js                 Env + settings loader
│   ├── logger.js                 Structured console logger
│   └── scheduler.js              In-memory timeout scheduler
├── commands/
│   ├── registry.js               Auto-loading command registry
│   ├── capture/
│   │   ├── capture.js            /capture
│   │   ├── release.js            /release
│   │   └── status.js             /punishment-status
│   └── media/
│       ├── hug.js                /hug
│       ├── shock.js              /shock
│       └── action.js             /action (generic + autocomplete)
├── features/
│   ├── capture/
│   │   ├── effectRegistry.js     Pluggable effect handler registry
│   │   ├── punishmentManager.js  Apply / release / startup-reload logic
│   │   └── effects/
│   │       ├── shock.js          Shock effect
│   │       ├── prison.js         Prison effect
│   │       └── isolation.js      Isolation effect
│   └── media/
│       └── mediaAction.js        GIF loader from media.json
├── services/
│   ├── permissionService.js      isCaptor / isImmune / canTarget
│   ├── roleService.js            getOrCreateRole / addRole / removeRole
│   ├── channelService.js         Prison channel, overwrites, isolation
│   ├── auditService.js           Audit channel logging
│   └── restoreService.js         Idempotent punishment restoration
├── middleware/
│   ├── authorization.js          requireCaptor guard
│   ├── cooldown.js               Per-user command cooldown
│   └── errorHandler.js           Centralised error reply
└── utils/
    ├── duration.js               parseDuration / formatDuration
    └── embed.js                  Discord embed builders

config/
├── settings.json                 Bot behaviour settings
└── media.json                    GIF sources per action key

storage/
├── adapter.js                    SQLite connection + migrations
└── repositories/
    └── punishmentRepository.js   CRUD for punishments table

tests/
├── duration.test.js
├── permissionService.test.js
└── punishmentManager.test.js

deploy-commands.js                Register slash commands with Discord
```

---

## Adding a new punishment effect

1. Create `src/features/capture/effects/myEffect.js` exporting `{ name, apply, restore }`.
2. Import and `register()` it in `src/features/capture/effectRegistry.js`.
3. Add the new choice to the `/capture` command's `type` option in `src/commands/capture/capture.js`.
4. If the effect assigns a role, add the role name to `PUNISHMENT_ROLES` in `src/services/restoreService.js`.

## Adding a new media command

1. Create `src/commands/media/myCommand.js` (copy `hug.js` as a template).
2. Add GIF URLs under a new key in `config/media.json`.
3. Run `npm run deploy` to register the new command.

---

## Running tests

```bash
npm test
```

---

## Required bot permissions

| Permission | Reason |
|---|---|
| `Manage Roles` | Add/remove Prisoner and Isolated roles |
| `Manage Channels` | Create the #prison channel |
| `Manage Permissions` | Apply per-member channel overwrites |
| `Send Messages` | Send punishment announcements |
| `Embed Links` | Send rich embeds |
| `Read Message History` | Needed for the prison channel |

> **Note**: The bot's role must be **above** the Prisoner and Isolated roles in the server's role hierarchy for `Manage Roles` to work correctly.
