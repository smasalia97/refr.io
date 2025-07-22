document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const formMessage = document.getElementById("form-message");
  const passwordField = document.getElementById("password");
  const loginButton = document.getElementById("login-btn");
  const buttonText = document.getElementById("login-btn-text");
  const spinner = document.getElementById("login-spinner");

  const togglePasswordVisibility = document.getElementById(
    "toggle-password-visibility"
  );
  const eyeIcon = document.getElementById("eye-icon");
  const eyeSlashedIcon = document.getElementById("eye-slashed-icon");

  if (togglePasswordVisibility) {
    togglePasswordVisibility.addEventListener("click", () => {
      if (passwordField.type === "password") {
        passwordField.type = "text";
        eyeIcon.classList.add("hidden");
        eyeSlashedIcon.classList.remove("hidden");
      } else {
        passwordField.type = "password";
        eyeIcon.classList.remove("hidden");
        eyeSlashedIcon.classList.add("hidden");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginButton.disabled = true;
      spinner.classList.remove("hidden");
      buttonText.textContent = "Logging In...";

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
        showToast(error.message, "error");
      } finally {
        // --- NEW: Restore button state regardless of outcome ---
        loginButton.disabled = false;
        spinner.classList.add("hidden");
        buttonText.textContent = "Log In";
      }
    });
  }
});
