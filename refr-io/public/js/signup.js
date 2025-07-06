document.addEventListener("DOMContentLoaded", () => {
  //   const API_URL = "http://localhost:3000"; // Define the backend server URL

  const signupForm = document.getElementById("signup-form");
  const formMessage = document.getElementById("form-message");

  // Form sections
  const initialFields = document.getElementById("initial-signup-fields");
  const confirmationFields = document.getElementById("confirmation-fields");

  // Inputs
  const nameField = document.getElementById("name");
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const confirmPasswordField = document.getElementById("confirm-password");
  const confirmationCodeField = document.getElementById("confirmation-code");
  const showPasswordCheckbox = document.getElementById("show-password");

  // Buttons and Text
  const signupBtn = document.getElementById("signup-btn");
  const confirmBtn = document.getElementById("confirm-btn");
  const formTitle = document.getElementById("form-title");
  const formSubtitle = document.getElementById("form-subtitle");

  // We'll store the email here after the first step
  let userEmail = "";

  // --- Event Listener for Show Password ---
  showPasswordCheckbox.addEventListener("change", () => {
    const isChecked = showPasswordCheckbox.checked;
    passwordField.type = isChecked ? "text" : "password";
    confirmPasswordField.type = isChecked ? "text" : "password";
  });

  // --- Event Listener for Initial Signup ---
  signupBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    formMessage.textContent = "";

    const name = nameField.value;
    const email = emailField.value;
    const password = passwordField.value;
    const confirmPassword = confirmPasswordField.value;

    if (!name || !email || !password || !confirmPassword) {
      formMessage.textContent = "Please fill out all fields.";
      formMessage.className = "text-red-600 text-center mt-4";
      return;
    }

    if (password !== confirmPassword) {
      formMessage.textContent = "Passwords do not match.";
      formMessage.className = "text-red-600 text-center mt-4";
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        userEmail = email; // Save email for the confirmation step

        // --- UI Transition to Confirmation Step ---
        formTitle.textContent = "Check Your Email";
        formSubtitle.textContent = `We've sent a confirmation code to ${userEmail}.`;

        initialFields.classList.add("hidden");
        signupBtn.classList.add("hidden");

        confirmationFields.classList.remove("hidden");
        confirmBtn.classList.remove("hidden");

        formMessage.textContent = result.message;
        formMessage.className = "text-green-600 text-center mt-4";
      } else {
        throw new Error(result.error || "Signup failed");
      }
    } catch (error) {
      formMessage.textContent = error.message;
      formMessage.className = "text-red-600 text-center mt-4";
    }
  });

  // --- Event Listener for Confirmation Step ---
  confirmBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    const confirmationCode = confirmationCodeField.value;

    if (!confirmationCode) {
      formMessage.textContent = "Please enter your confirmation code.";
      formMessage.className = "text-red-600 text-center mt-4";
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/confirm-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, confirmationCode }),
      });

      const result = await response.json();

      if (response.ok) {
        formMessage.textContent = "Success! Redirecting you to login...";
        formMessage.className = "text-green-600 text-center mt-4";

        setTimeout(() => {
          window.location.href = "/login.html";
        }, 2000);
      } else {
        throw new Error(result.error || "Confirmation failed.");
      }
    } catch (error) {
      formMessage.textContent = error.message;
      formMessage.className = "text-red-600 text-center mt-4";
    }
  });
});
