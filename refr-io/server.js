// server.js
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Setup ---
const dbPath = path.resolve(__dirname, "db", "refr.db");
const db = new Database(dbPath);

// Create referrals table if it doesn't exist.
// Using 'created_at' (snake_case) which is a common SQL convention.
db.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// --- Middleware ---
app.use(express.json()); // To parse JSON request bodies
app.use(express.static(path.join(__dirname, "public"))); // To serve static files

// --- API Routes ---

// GET /api/referrals - Fetch all referrals
app.get("/api/referrals", (req, res) => {
  try {
    // Updated to use 'created_at' to match the table schema.
    const stmt = db.prepare("SELECT * FROM referrals ORDER BY created_at DESC");
    const referrals = stmt.all();

    // Add headers to prevent API response caching by the browser
    res.setHeader("Cache-Control", "no-store");

    res.json({ message: "success", data: referrals });
  } catch (error) {
    console.error("Failed to fetch referrals:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/referrals - Add a new referral
app.post("/api/referrals", (req, res) => {
  const { title, link, description, category } = req.body;
  if (!title || !link || !category) {
    return res
      .status(400)
      .json({ error: "Missing required fields: title, link, category" });
  }

  try {
    const stmt = db.prepare(`
            INSERT INTO referrals (title, link, description, category) 
            VALUES (?, ?, ?, ?)
        `);
    const info = stmt.run(title, link, description, category);

    res.status(201).json({
      message: "success",
      data: { id: info.lastInsertRowid, ...req.body },
    });
  } catch (error) {
    console.error("Failed to add referral:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/referrals/:id - Delete a referral
app.delete("/api/referrals/:id", (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare("DELETE FROM referrals WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes > 0) {
      res.status(200).json({ message: "Referral deleted successfully" });
    } else {
      res.status(404).json({ error: "Referral not found" });
    }
  } catch (error) {
    console.error(`Failed to delete referral with id ${id}:`, error);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Fallback Route ---
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
