require("dotenv").config();

const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const cors = require("cors");
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const verifyToken = require("./middleware/auth-middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Cognito Client ---
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// --- Database Setup ---
const dbPath = path.resolve(__dirname, "db", "refr.db");
const db = new Database(dbPath);

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
app.use(cors());
app.use(express.json());

// --- Helper function to calculate SecretHash ---
const calculateSecretHash = (username) => {
  const crypto = require("crypto");

  // --- DEBUGGING: Log the inputs to the hash function ---
  console.log(`Calculating SecretHash for user: ${username}`);
  console.log(`Using Client ID: ${process.env.COGNITO_CLIENT_ID}`);
  console.log(
    `Using Client Secret: ${
      process.env.COGNITO_CLIENT_SECRET ? "Exists" : "!!! MISSING !!!"
    }`
  );

  const hmac = crypto.createHmac("sha256", process.env.COGNITO_CLIENT_SECRET);
  hmac.update(username + process.env.COGNITO_CLIENT_ID);
  const hash = hmac.digest("base64");

  console.log(`Generated Hash: ${hash}`);
  return hash;
};

// --- API Routes ---

// POST /api/signup - User registration
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    Password: password,
    SecretHash: calculateSecretHash(email),
    UserAttributes: [{ Name: "email", Value: email }],
  };

  try {
    const command = new SignUpCommand(params);
    await cognitoClient.send(command);
    res.status(200).json({
      message:
        "User registered. Please check your email for a verification code.",
    });
  } catch (error) {
    console.error("Cognito SignUp Error:", error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/confirm-signup - Confirm user registration
app.post("/api/confirm-signup", async (req, res) => {
  const { email, confirmationCode } = req.body;

  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: confirmationCode,
    SecretHash: calculateSecretHash(email),
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);
    res.status(200).json({ message: "User confirmed successfully." });
  } catch (error) {
    console.error("Cognito ConfirmSignUp Error:", error);
    res.status(400).json({ error: error.message });
  }
});

// In server.js

// POST /api/login - User login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      // --- Move the SecretHash inside this object ---
      SECRET_HASH: calculateSecretHash(email),
    },
    // --- Remove it from here ---
    // SecretHash: calculateSecretHash(email),
  };

  console.log("\n--- Login API Call (New Structure) ---");
  console.log("Sending params to Cognito:", JSON.stringify(params, null, 2));

  try {
    const command = new InitiateAuthCommand(params);
    const { AuthenticationResult } = await cognitoClient.send(command);
    res.status(200).json(AuthenticationResult);
  } catch (error) {
    console.error("Cognito InitiateAuth Error:", error);
    res.status(400).json({ error: error.message || "Login failed" });
  }
});

// --- Protected Referral Routes ---

// Apply the verifyToken middleware to all /api/referrals routes
app.use("/api/referrals", verifyToken);

// GET /api/referrals - Fetch all referrals
app.get("/api/referrals", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM referrals ORDER BY created_at DESC");
    const referrals = stmt.all();
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

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
