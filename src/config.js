const DEFAULT_GIFS = {
  hug: 'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
  shock: 'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif'
};

function parseRoleIds(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getConfig() {
  return {
    token: process.env.BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    captureRoleIds: parseRoleIds(process.env.CAPTURE_ROLE_IDS),
    gifs: {
      hug: process.env.HUG_GIF_URL || DEFAULT_GIFS.hug,
      shock: process.env.SHOCK_GIF_URL || DEFAULT_GIFS.shock
    },
    dataFilePath: process.env.PUNISHMENT_DATA_PATH || 'data/punishments.json'
  };
}

module.exports = {
  getConfig
};
