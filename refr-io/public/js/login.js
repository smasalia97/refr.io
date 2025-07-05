document.addEventListener("DOMContentLoaded", () => {
  // Define the backend server URL
  const API_URL = "http://localhost:3000";

  const loginForm = document.getElementById("login-form");
  const formMessage = document.getElementById("form-message");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const poolData = {
            UserPoolId: cognitoConfig.UserPoolId,
            ClientId: cognitoConfig.ClientId,
        };
        const userPool = new CognitoUserPool(poolData);

        const authenticationData = {
            Username: email,
            Password: password,
        };
        const authenticationDetails = new AuthenticationDetails(authenticationData);

        const userData = {
            Username: email,
            Pool: userPool,
        };
        const cognitoUser = new CognitoUser(userData);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                const accessToken = result.getAccessToken().getJwtToken();
                const idToken = result.getIdToken().getJwtToken();
                const refreshToken = result.getRefreshToken().getToken();

                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("idToken", idToken);
                localStorage.setItem("refreshToken", refreshToken);

                window.location.href = "/";
            },
            onFailure: (err) => {
                formMessage.textContent = err.message || JSON.stringify(err);
                formMessage.className = "text-red-600 text-center mt-4";
            },
            newPasswordRequired: (userAttributes, requiredAttributes) => {
                // Handle new password requirement if necessary
            },
        });
  }); 
  } 
});
