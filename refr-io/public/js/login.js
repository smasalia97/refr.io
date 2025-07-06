document.addEventListener("DOMContentLoaded", () => {
  // Define the backend server URL
  const API_URL = "http://localhost:3000";

  const loginForm = document.getElementById("login-form");
  const formMessage = document.getElementById("form-message");
  const passwordField = document.getElementById("password");
  const showPasswordCheckbox = document.getElementById("show-password");

  if (showPasswordCheckbox) {
    showPasswordCheckbox.addEventListener("change", () => {
      passwordField.type = showPasswordCheckbox.checked ? "text" : "password";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      formMessage.textContent = ""; // Clear previous messages

      const email = document.getElementById("email").value;
      const password = passwordField.value;

      try {
        const response = await fetch(`${API_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok) {
          // Store tokens in local storage
          localStorage.setItem("accessToken", result.AccessToken);
          localStorage.setItem("idToken", result.IdToken);
          localStorage.setItem("refreshToken", result.RefreshToken);
          localStorage.setItem("username", email); // Store username for token refresh

          // Redirect to the dashboard after successful login
          window.location.href = "/dashboard.html";
        } else {
          throw new Error(result.error || "Login failed");
        }
      } catch (error) {
        formMessage.textContent = error.message;
        formMessage.className = "text-red-600 text-center mt-4";
      }
    });
  }
});
