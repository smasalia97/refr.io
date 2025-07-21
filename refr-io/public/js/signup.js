document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const formMessage = document.getElementById("form-message");

  const initialFields = document.getElementById("initial-signup-fields");
  const confirmationFields = document.getElementById("confirmation-fields");

  const nameField = document.getElementById("name");
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const confirmPasswordField = document.getElementById("confirm-password");
  const confirmationCodeField = document.getElementById("confirmation-code");
  const showPasswordCheckbox = document.getElementById("show-password");

  const signupBtn = document.getElementById("signup-btn");
  const confirmBtn = document.getElementById("confirm-btn");
  const formTitle = document.getElementById("form-title");
  const formSubtitle = document.getElementById("form-subtitle");

  // --- NEW: Password criteria elements ---
  const criteriaContainer = document.getElementById(
    "password-criteria-container"
  );
  const lengthCheck = document.getElementById("length-check");
  const caseCheck = document.getElementById("case-check");
  const numberCheck = document.getElementById("number-check");
  const symbolCheck = document.getElementById("symbol-check");

  let userEmail = "";

  // --- NEW: Password validation logic ---
  const validatePassword = () => {
    const value = passwordField.value;
    const checks = {
      length: value.length >= 8,
      case: /[A-Z]/.test(value) && /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    };

    const setIndicator = (el, valid) => {
      if (valid) {
        el.style.color = "#10B981"; // brand-green
      } else {
        el.style.color = "#6B7280"; // gray-500
      }
    };

    setIndicator(lengthCheck, checks.length);
    setIndicator(caseCheck, checks.case);
    setIndicator(numberCheck, checks.number);
    setIndicator(symbolCheck, checks.symbol);

    return Object.values(checks).every(Boolean);
  };

  passwordField.addEventListener("focus", () => {
    criteriaContainer.classList.remove("hidden");
  });

  passwordField.addEventListener("input", validatePassword);

  if (showPasswordCheckbox) {
    showPasswordCheckbox.addEventListener("change", () => {
      const isChecked = showPasswordCheckbox.checked;
      passwordField.type = isChecked ? "text" : "password";
      confirmPasswordField.type = isChecked ? "text" : "password";
    });
  }

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

    // --- NEW: Check if password is valid before submitting ---
    if (!validatePassword()) {
      formMessage.textContent = "Password does not meet all the criteria.";
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
        userEmail = email;

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
      showToast(error.message, 'error');
    }
  });

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
        body: JSON.stringify({
          email: userEmail,
          confirmationCode: confirmationCode,
        }),
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
      showToast(error.message, 'error');
    }
  });
});
