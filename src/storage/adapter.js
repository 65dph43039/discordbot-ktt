'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const config = require('../core/config');
const logger = require('../core/logger');

/** @type {import('node:sqlite').DatabaseSync|null} */
let db = null;

/**
 * Open (or create) the SQLite database and run all migrations.
 * Must be called once before any repository functions are used.
 */
function connect() {
  const dbPath = config.dbPath;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  runMigrations(db);
  logger.info('Database connected', { path: dbPath });
  return db;
}

/**
 * Return the open database instance.
 * Throws if connect() has not been called yet.
 */
function getDb() {
  if (!db) throw new Error('Database not initialized. Call connect() first.');
  return db;
}

function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS punishments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id      TEXT    NOT NULL,
      target_id     TEXT    NOT NULL,
      actor_id      TEXT    NOT NULL,
      type          TEXT    NOT NULL,
      started_at    INTEGER NOT NULL,
      expires_at    INTEGER NOT NULL,
      restored_at   INTEGER,
      roles_snapshot TEXT,
      meta          TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_punishments_active
      ON punishments(guild_id, target_id, restored_at);

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cooldowns (
      user_id    TEXT    NOT NULL,
      command    TEXT    NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, command)
    );
  `);
}

module.exports = { connect, getDb };
