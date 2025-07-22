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
  ChangePasswordCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const verifyToken = require("./middleware/auth-middleware");
const { signupValidationRules, validate } = require("./middleware/validators");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware & Static Files ---
const corsOptions = {
  origin: [
    "https://www.refrio.org",
    "https://refr-io.onrender.com",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
  ],
};
app.use(cors(corsOptions));
app.use(express.json());

app.use(express.static("public"));

// --- Supabase Client Setup ---
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

app.post("/api/signup", signupValidationRules(), validate, async (req, res) => {
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

    const { error } = await supabase.from("users").insert([
      {
        user_sub: UserSub,
        user_name: name,
        user_email: email,
        user_created_at: new Date().toISOString(),
      },
    ]);

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

app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    await cognitoClient.send(
      new ForgotPasswordCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        SecretHash: calculateSecretHash(email),
      })
    );
    res
      .status(200)
      .json({ message: "Password reset code sent to your email." });
  } catch (error) {
    console.error("Cognito ForgotPassword Error:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to initiate password reset." });
  }
});

app.post("/api/confirm-password-reset", async (req, res) => {
  const { email, confirmationCode, newPassword } = req.body;
  try {
    await cognitoClient.send(
      new ConfirmForgotPasswordCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
        SecretHash: calculateSecretHash(email),
      })
    );
    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Cognito ConfirmForgotPassword Error:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to reset password." });
  }
});

const apiRouter = express.Router();
apiRouter.use(verifyToken);

apiRouter.get("/user", async (req, res) => {
  try {
    const { Username, UserAttributes } = await cognitoClient.send(
      new GetUserCommand({ AccessToken: req.token })
    );

    const subAttribute = UserAttributes.find((attr) => attr.Name === "sub");

    if (subAttribute) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_created_at")
        .eq("user_sub", subAttribute.Value)
        .single();

      if (userError && userError.code !== "PGRST116") {
        console.error("Failed to fetch user from Supabase:", userError);
      } else {
        return res.json({
          Username,
          UserAttributes,
          user_created_at: userData ? userData.user_created_at : null,
        });
      }
    }

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
    await cognitoClient.send(
      new UpdateUserAttributesCommand({
        AccessToken: req.token,
        UserAttributes: [{ Name: "name", Value: name }],
      })
    );

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

// --- NEW ROUTE for changing password ---
apiRouter.put("/user/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "All password fields are required." });
  }

  try {
    await cognitoClient.send(
      new ChangePasswordCommand({
        AccessToken: req.token, // Provided by the verifyToken middleware
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      })
    );
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Failed to change password:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to change password." });
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

// --- NEW SEARCH ENDPOINT ---
apiRouter.get("/referrals/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: "Search query 'q' is required." });
  }

  try {
    // Using .or() to search in both ref_name and ref_desc
    // 'ilike' is for case-insensitive search
    const { data, error } = await supabase
      .from("referrals")
      .select(`*, users (user_name)`)
      .or(`ref_name.ilike.%${q}%,ref_desc.ilike.%${q}%`)
      .order("ref_created_at", { ascending: false });

    if (error) throw error;
    res.json({ message: "success", data });
  } catch (error) {
    console.error("Failed to search referrals:", error);
    res.status(500).json({ error: "Database search error" });
  }
});

apiRouter.get("/referrals", async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  // REMOVED: sortBy is no longer needed
  const { category } = req.query;

  try {
    let query = supabase
      .from("referrals")
      .select(`*, users ( user_name )`, { count: "exact" });

    // Apply category filter if it exists
    if (category) {
      query = query.eq("ref_category", category);
    }

    // Default sort by newest
    query = query.order("ref_created_at", { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    res.json({
      message: "success",
      data,
      totalPages: Math.ceil(count / limit),
    });
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

// --- NEW: Helper function to check URL with Google Safe Browse ---

const isUrlSafe = async (url) => {
  const apiKey = process.env.GOOGLE_SAFE_Browse_API_KEY;

  console.log("--- Starting URL Safety Check ---");
  console.log("URL to check:", url);

  if (!apiKey) {
    console.log("API Key is MISSING. Skipping check and allowing URL.");
    return true;
  }
  console.log("API Key found.");

  // --- THIS IS THE CORRECTED LINE ---
  const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

  console.log("Attempting to call API at:", apiUrl);

  try {
    console.log("Sending request to Google Safe Browse API...");
    const response = await axios.post(apiUrl, {
      client: { clientId: "refr-io", clientVersion: "1.0.0" },
      threatInfo: {
        threatTypes: [
          "MALWARE",
          "SOCIAL_ENGINEERING",
          "UNWANTED_SOFTWARE",
          "POTENTIALLY_HARMFUL_APPLICATION",
        ],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url: url }],
      },
    });
    console.log("API Response received.");

    if (response.data && response.data.matches) {
      console.log("Result: Unsafe. Found matches:", response.data.matches);
      return false;
    } else {
      console.log("Result: Safe. No matches found.");
      return true;
    }
  } catch (error) {
    console.error(
      "API Error:",
      error.response ? error.response.data : error.message
    );
    console.log("Result: Failing open due to API error. Allowing URL.");
    return true;
  }
};

apiRouter.post("/referrals", async (req, res) => {
  const { title, link, description, category } = req.body;
  if (!title || !link || !category)
    return res.status(400).json({ error: "Missing required fields" });

  const isSafe = await isUrlSafe(link);
  if (!isSafe) {
    return res.status(400).json({
      error: "This link is flagged as unsafe and cannot be submitted.",
    });
  }

  const { sub } = req.user;

  try {
    const { UserAttributes } = await cognitoClient.send(
      new GetUserCommand({ AccessToken: req.token })
    );

    const nameAttribute = UserAttributes.find((attr) => attr.Name === "name");
    const emailAttribute = UserAttributes.find((attr) => attr.Name === "email");

    const name = nameAttribute ? nameAttribute.Value : "N/A";
    const email = emailAttribute ? emailAttribute.Value : "N/A";

    let { data: user, error: userError } = await supabase
      .from("users")
      .select("user_sub")
      .eq("user_sub", sub)
      .single();

    if (userError && userError.code === "PGRST116") {
      const { data: newUser, error: newUserError } = await supabase
        .from("users")
        .insert([
          {
            user_sub: sub,
            user_name: name,
            user_email: email,
            user_created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      if (newUserError) throw newUserError;
      user = newUser;
    } else if (userError) {
      throw userError;
    }

    const { data, error } = await supabase
      .from("referrals")
      .insert([
        {
          user_sub: sub,
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

  const isSafe = await isUrlSafe(link);
  if (!isSafe) {
    return res.status(400).json({
      error: "This link is flagged as unsafe and cannot be submitted.",
    });
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

app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.send("refr.io backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
