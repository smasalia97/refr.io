document.addEventListener("DOMContentLoaded", () => {
  // Define the backend server URL
  const API_URL = "http://localhost:3000";

  const loginForm = document.getElementById("login-form");
  const formMessage = document.getElementById("form-message");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const { email, password } = Object.fromEntries(formData.entries());
      console.log("Form submitted with:", { email, password });

      try {
        // Use the full API_URL in the fetch call
        console.log(
          "Attempting to log in with API URL:",
          `${API_URL}/api/login`
        );
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

          console.log("Login successful, tokens stored:", {
            accessToken: result.AccessToken,
          });
          // Redirect to the homepage after successful login
          window.location.href = FRONTEND_URL;
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
