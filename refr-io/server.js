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
  GetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const verifyToken = require("./middleware/auth-middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware & Static Files ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Database Setup ---
const dbPath = path.resolve(__dirname, "db", "refr.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL"); // Helps prevent locking issues

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_sub TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS referrals (
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_sub TEXT NOT NULL,
        ref_name TEXT NOT NULL,
        ref_link TEXT NOT NULL,
        ref_desc TEXT,
        ref_category TEXT NOT NULL,
        ref_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_sub) REFERENCES users (user_sub)
    );
`);

// --- Cognito Client ---
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const calculateSecretHash = (username) => {
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", process.env.COGNITO_CLIENT_SECRET);
  hmac.update(username + process.env.COGNITO_CLIENT_ID);
  return hmac.digest("base64");
};

// --- Public API Routes ---

app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const { UserSub } = await cognitoClient.send(
      new SignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        SecretHash: calculateSecretHash(email),
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "name", Value: name },
        ],
      })
    );
    db.prepare(
      "INSERT INTO users (user_sub, user_name, user_email) VALUES (?, ?, ?)"
    ).run(UserSub, name, email);
    res
      .status(200)
      .json({
        message:
          "User registered. Please check your email for a verification code.",
      });
  } catch (error) {
    console.error("Cognito SignUp Error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { AuthenticationResult } = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: calculateSecretHash(email),
        },
      })
    );
    const userInDb = db
      .prepare("SELECT * FROM users WHERE user_email = ?")
      .get(email);
    if (!userInDb) {
      const { UserAttributes } = await cognitoClient.send(
        new GetUserCommand({ AccessToken: AuthenticationResult.AccessToken })
      );
      const name =
        UserAttributes.find((attr) => attr.Name === "name")?.Value ||
        "Default User";
      const sub = UserAttributes.find((attr) => attr.Name === "sub")?.Value;
      if (sub)
        db.prepare(
          "INSERT INTO users (user_sub, user_name, user_email) VALUES (?, ?, ?)"
        ).run(sub, name, email);
    }
    res.status(200).json(AuthenticationResult);
  } catch (error) {
    console.error("Cognito InitiateAuth Error:", error);
    res.status(400).json({ error: error.message || "Login failed" });
  }
});

// --- This router protects all API routes defined within it ---
const apiRouter = express.Router();
apiRouter.use(verifyToken);

apiRouter.get("/user", async (req, res) => {
  try {
    const { Username, UserAttributes } = await cognitoClient.send(
      new GetUserCommand({ AccessToken: req.token })
    );
    res.json({ Username, UserAttributes });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

apiRouter.get("/referrals", (req, res) => {
  try {
    const stmt = db.prepare(
      `SELECT r.*, u.user_name FROM referrals r JOIN users u ON r.user_sub = u.user_sub ORDER BY r.ref_created_at DESC`
    );
    res.json({ message: "success", data: stmt.all() });
  } catch (error) {
    console.error("Failed to fetch referrals:", error);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/referrals", (req, res) => {
  const { title, link, description, category } = req.body;
  if (!title || !link || !category)
    return res.status(400).json({ error: "Missing required fields" });
  try {
    const stmt = db.prepare(
      "INSERT INTO referrals (user_sub, ref_name, ref_link, ref_desc, ref_category) VALUES (?, ?, ?, ?, ?)"
    );
    const info = stmt.run(req.user.sub, title, link, description, category);
    res
      .status(201)
      .json({
        message: "success",
        data: { id: info.lastInsertRowid, ...req.body },
      });
  } catch (error) {
    console.error("Failed to add referral:", error);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.delete("/referrals/:id", (req, res) => {
  const { id } = req.params;
  const { sub: user_sub } = req.user;
  try {
    const stmt = db.prepare(
      "DELETE FROM referrals WHERE ref_id = ? AND user_sub = ?"
    );
    const info = stmt.run(id, user_sub);
    if (info.changes > 0) {
      res.status(200).json({ message: "Referral deleted successfully" });
    } else {
      res
        .status(404)
        .json({ error: "Referral not found or permission denied." });
    }
  } catch (error) {
    console.error(`Failed to delete referral:`, error);
    res.status(500).json({ error: "Database error" });
  }
});

// Apply the protected router to the /api path
app.use("/api", apiRouter);

// --- HTML Page Route (Catch-all) ---
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
