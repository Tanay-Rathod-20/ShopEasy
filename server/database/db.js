// server/database/db.js
// SQLite database connection singleton using better-sqlite3

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure database directory exists
const dbPath = path.resolve(config.database.path);
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Open or create SQLite database file
const db = new Database(dbPath, {
    // verbose: config.env === 'development' ? console.log : null
});

// Enforce foreign keys and WAL (Write-Ahead Logging) mode for reliability & concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;
