const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'segmentiq.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    age INTEGER,
    gender TEXT,
    income REAL,
    spending REAL,
    segment TEXT,
    cluster INTEGER,
    confidence REAL,
    membership TEXT,
    recommendation TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'admin123');
`);

module.exports = db;
