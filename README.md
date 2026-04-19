# discordbot-ktt

A modular Discord bot (Node.js + `discord.js`) with roleplay capture/punishment mechanics and media slash commands.

## Why Node.js + discord.js

This repository now uses **Node.js + discord.js** because it has first-class slash-command support, strong guild permission APIs, and a straightforward modular command architecture.

## Features

- `/hug @user` → sends a hug message + GIF
- `/shock @user` → sends an electric shock message + GIF
- `/capture @user mode duration`
  - `shock` mode: roleplay action + timer tracking
  - `prison` mode: restricts target to `#rp-prison`
  - `isolation` mode: restricts target to read-only `#rp-basement`
- `/release @user` to release before timeout
- `/captures` to list active punishments
- **Automatic expiry** and **permission restoration**
- **Persistence across restarts** using `data/punishments.json`

## Permission model

A member is authorized for capture/release/list if either:

1. They have `Administrator`, or
2. They have one of the role IDs in `CAPTURE_ROLE_IDS`

## Setup

1. Install deps:

```bash
npm install
```

2. Configure environment:

```bash
export BOT_TOKEN="your-bot-token"
export CLIENT_ID="your-application-client-id"
export GUILD_ID="your-test-guild-id"
export CAPTURE_ROLE_IDS="123456789012345678,987654321098765432"
# optional:
export HUG_GIF_URL="https://..."
export SHOCK_GIF_URL="https://..."
export PUNISHMENT_DATA_PATH="data/punishments.json"
```

3. Register slash commands to your guild:

```bash
npm run deploy-commands
```

4. Start bot:

```bash
npm start
```

## Scalable architecture

- `src/commands/*.js`: each slash command is an independent module
- `src/commands/index.js`: command loader/registry
- `src/services/punishmentService.js`: punishment domain logic, timers, permission snapshot/restore
- `src/services/storage.js`: JSON persistence utility
- `src/config.js`: central config parsing

To add a new feature command, create a new file in `src/commands/` exporting `{ data, execute }`.

## Temporary state handling

- Active punishments are persisted in `data/punishments.json`.
- On startup, bot reloads punishments and:
  - releases expired punishments immediately
  - reschedules active timers
- Permission overwrites for each affected channel are snapshotted and restored on release.

## Notes

- Ensure the bot has rights to manage channels/overwrites (`Manage Channels` and suitable channel permissions).
- Prefer testing in a dedicated guild first.
