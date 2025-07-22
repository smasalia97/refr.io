// smasalia97/refr.io/refr.io-refr-frontend/refr-io/public/js/forgot-password.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-password-form");
  const emailStep = document.getElementById("email-step");
  const resetStep = document.getElementById("reset-step");
  const emailInput = document.getElementById("email");
  const codeInput = document.getElementById("code");
  const newPasswordInput = document.getElementById("new-password");
  const formTitle = document.getElementById("form-title");
  const formSubtitle = document.getElementById("form-subtitle");
  const togglePasswordVisibility = document.getElementById(
    "toggle-password-visibility"
  );
  const eyeIcon = document.getElementById("eye-icon");
  const eyeSlashedIcon = document.getElementById("eye-slashed-icon");

  let userEmail = "";

  if (togglePasswordVisibility) {
    togglePasswordVisibility.addEventListener("click", () => {
      if (newPasswordInput.type === "password") {
        newPasswordInput.type = "text";
        eyeIcon.classList.add("hidden");
        eyeSlashedIcon.classList.remove("hidden");
      } else {
        newPasswordInput.type = "password";
        eyeIcon.classList.remove("hidden");
        eyeSlashedIcon.classList.add("hidden");
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Check which step we are on
    if (!resetStep.classList.contains("hidden")) {
      // --- Step 2: Handle password reset ---
      const confirmationCode = codeInput.value;
      const newPassword = newPasswordInput.value;

      if (!confirmationCode || !newPassword) {
        showToast("Please fill out all fields.", "error");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/confirm-password-reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            confirmationCode,
            newPassword,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        showToast("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login.html";
        }, 2000);
      } catch (error) {
        showToast(error.message, "error");
      }
    } else {
      // --- Step 1: Handle sending the code ---
      userEmail = emailInput.value;
      try {
        const response = await fetch(`${API_URL}/api/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        showToast("Reset code sent to your email!");

        // Transition to the next step
        emailStep.classList.add("hidden");
        resetStep.classList.remove("hidden");
        formTitle.textContent = "Enter Your Reset Code";
        formSubtitle.textContent = `A code was sent to ${userEmail}.`;

        emailInput.required = false;
        codeInput.required = true;
        newPasswordInput.required = true;
      } catch (error) {
        showToast(error.message, "error");
      }
    }
  });
});
