const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('./db/refr.db');

// Create tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.static('public'));
app.use(express.json());

// API: Get all referrals
app.get('/api/referrals', (req, res) => {
  const stmt = db.prepare('SELECT * FROM referrals ORDER BY created_at DESC');
  const referrals = stmt.all();
  res.json(referrals);
});

// API: Add new referral
app.post('/api/referrals', (req, res) => {
  const { title, description, link, category } = req.body;
  const stmt = db.prepare('INSERT INTO referrals (title, description, link, category) VALUES (?, ?, ?, ?)');
  stmt.run(title, description, link, category);
  res.status(201).json({ message: 'Referral added' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
