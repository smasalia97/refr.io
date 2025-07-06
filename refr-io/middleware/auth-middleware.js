const { CognitoJwtVerifier } = require("aws-jwt-verify");

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // This is not a protected route, so we can just continue
    // It's up to the route itself to handle unauthenticated users
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verifier.verify(token);
    req.user = payload;
    req.token = token;
    next();
  } catch (error) {
    // Token is present but invalid
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = verifyToken;
