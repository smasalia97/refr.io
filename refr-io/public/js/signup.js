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

  const togglePasswordBtn = document.getElementById(
    "toggle-password-visibility"
  );
  const eyeIcon = document.getElementById("eye-icon");
  const eyeSlashedIcon = document.getElementById("eye-slashed-icon");

  // --- FIX: Added the missing variable declarations ---
  const toggleConfirmPasswordBtn = document.getElementById(
    "toggle-confirm-password-visibility"
  );
  const confirmEyeIcon = document.getElementById("confirm-eye-icon");
  const confirmEyeSlashedIcon = document.getElementById(
    "confirm-eye-slashed-icon"
  );

  const signupBtn = document.getElementById("signup-btn");
  const confirmBtn = document.getElementById("confirm-btn");
  const formTitle = document.getElementById("form-title");
  const formSubtitle = document.getElementById("form-subtitle");

  const criteriaContainer = document.getElementById(
    "password-criteria-container"
  );
  const lengthCheck = document.getElementById("length-check");
  const caseCheck = document.getElementById("case-check");
  const numberCheck = document.getElementById("number-check");
  const symbolCheck = document.getElementById("symbol-check");

  let userEmail = "";

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

  const setupPasswordToggle = (button, field, openIcon, closedIcon) => {
    if (button) {
      button.addEventListener("click", () => {
        if (field.type === "password") {
          field.type = "text";
          openIcon.classList.add("hidden");
          closedIcon.classList.remove("hidden");
        } else {
          field.type = "password";
          openIcon.classList.remove("hidden");
          closedIcon.classList.add("hidden");
        }
      });
    }
  };

  setupPasswordToggle(
    togglePasswordBtn,
    passwordField,
    eyeIcon,
    eyeSlashedIcon
  );
  // --- FIX: The function call now uses the correct variables ---
  setupPasswordToggle(
    toggleConfirmPasswordBtn,
    confirmPasswordField,
    confirmEyeIcon,
    confirmEyeSlashedIcon
  );

  signupBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    formMessage.textContent = "";

    const name = nameField.value;
    const email = emailField.value;
    const password = passwordField.value;
    const confirmPassword = confirmPasswordField.value;

    if (!name || !email || !password || !confirmPassword) {
      showToast("Please fill out all fields.", "error");
      return;
    }

    if (!validatePassword()) {
      showToast("Password does not meet all the criteria.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
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

        showToast("Confirmation code sent to your email!");
      } else {
        throw new Error(result.error || "Signup failed");
      }
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  confirmBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    const confirmationCode = confirmationCodeField.value;

    if (!confirmationCode) {
      showToast("Please enter your confirmation code.", "error");
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
        showToast("Success! Redirecting you to login...");

        setTimeout(() => {
          window.location.href = "/login.html";
        }, 2000);
      } else {
        throw new Error(result.error || "Confirmation failed.");
      }
    } catch (error) {
      showToast(error.message, "error");
    }
  });
});
