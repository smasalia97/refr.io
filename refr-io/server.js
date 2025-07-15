require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  UpdateUserAttributesCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const verifyToken = require("./middleware/auth-middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware & Static Files ---
const corsOptions = {
  origin: [
    "https://www.refrio.org",
    // "http://localhost:8080",
    // "http://127.0.0.1:8080",
  ],
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Supabase Client Setup ---
// These variables must be set in your Render environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Insert new user into the Supabase 'users' table
    const { error } = await supabase
      .from("users")
      .insert([{ user_sub: UserSub, user_name: name, user_email: email }]);

    if (error) {
      console.error("Supabase user insert error:", error);
    }

    res.status(200).json({
      message:
        "User registered. Please check your email for a verification code.",
    });
  } catch (error) {
    console.error("Cognito SignUp Error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/confirm-signup", async (req, res) => {
  const { email, confirmationCode } = req.body;
  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: confirmationCode,
        SecretHash: calculateSecretHash(email),
      })
    );
    res.status(200).json({ message: "User confirmed successfully." });
  } catch (error) {
    console.error("Cognito ConfirmSignUp Error:", error);
    res.status(400).json({ error: error.message || "Confirmation failed" });
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

apiRouter.put("/user/name", async (req, res) => {
  const { name } = req.body;
  const { sub: user_sub } = req.user;

  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }

  try {
    // Update in Cognito
    await cognitoClient.send(
      new UpdateUserAttributesCommand({
        AccessToken: req.token,
        UserAttributes: [{ Name: "name", Value: name }],
      })
    );

    // Update in Supabase DB
    const { error } = await supabase
      .from("users")
      .update({ user_name: name })
      .eq("user_sub", user_sub);

    if (error) throw error;

    res.status(200).json({ message: "Name updated successfully." });
  } catch (error) {
    console.error("Failed to update name:", error);
    res.status(500).json({ error: "Failed to update name." });
  }
});

apiRouter.get("/my-referrals", async (req, res) => {
  const { sub: user_sub } = req.user;
  try {
    const { data, error } = await supabase
      .from("referrals")
      .select(
        `ref_id, ref_name, ref_link, ref_desc, ref_category, ref_created_at, users (user_name)`
      )
      .eq("user_sub", user_sub)
      .order("ref_created_at", { ascending: false });

    if (error) throw error;
    res.json({ message: "success", data });
  } catch (error) {
    console.error("Failed to fetch user-specific referrals:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// In server.js

apiRouter.get("/referrals", async (req, res) => {
  try {
    // Correctly join the users table and select the user_name
    const { data, error } = await supabase
      .from("referrals")
      .select(
        `
            *,
            users ( user_name )
        `
      )
      .order("ref_created_at", { ascending: false });

    if (error) throw error;
    res.json({ message: "success", data });
  } catch (error) {
    console.error("Failed to fetch referrals:", error);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.get("/referrals/:id", async (req, res) => {
  const { id } = req.params;
  const { sub: user_sub } = req.user;
  try {
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("ref_id", id)
      .eq("user_sub", user_sub)
      .single();

    if (error) throw error;

    if (data) {
      res.json({ message: "success", data });
    } else {
      res
        .status(404)
        .json({ error: "Referral not found or permission denied." });
    }
  } catch (error) {
    console.error(`Failed to fetch referral ${id}:`, error);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/referrals", async (req, res) => {
  const { title, link, description, category } = req.body;
  if (!title || !link || !category)
    return res.status(400).json({ error: "Missing required fields" });
  try {
    const { data, error } = await supabase
      .from("referrals")
      .insert([
        {
          user_sub: req.user.sub,
          ref_name: title,
          ref_link: link,
          ref_desc: description,
          ref_category: category,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "success",
      data: data,
    });
  } catch (error) {
    console.error("Failed to add referral:", error);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.put("/referrals/:id", async (req, res) => {
  const { id } = req.params;
  const { sub: user_sub } = req.user;
  const { title, link, description, category } = req.body;

  if (!title || !link || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await supabase
      .from("referrals")
      .update({
        ref_name: title,
        ref_link: link,
        ref_desc: description,
        ref_category: category,
      })
      .eq("ref_id", id)
      .eq("user_sub", user_sub)
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      res.status(200).json({ message: "Referral updated successfully" });
    } else {
      res
        .status(404)
        .json({ error: "Referral not found or permission denied." });
    }
  } catch (error) {
    console.error(`Failed to update referral:`, error);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.delete("/referrals/:id", async (req, res) => {
  const { id } = req.params;
  const { sub: user_sub } = req.user;
  try {
    const { error, count } = await supabase
      .from("referrals")
      .delete({ count: "exact" })
      .eq("ref_id", id)
      .eq("user_sub", user_sub);

    if (error) throw error;

    if (count > 0) {
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

// A simple root route to confirm the server is running
app.get("/", (req, res) => {
  res.send("refr.io backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
