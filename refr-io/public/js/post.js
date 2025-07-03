/**
 * Script for the post.html page.
 * Handles form submission for new referrals.
 */
const API_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  const postForm = document.getElementById("post-form");
  const messageEl = document.getElementById("form-message");

  if (!postForm) return;

  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(postForm);
    const referralData = Object.fromEntries(formData.entries());

    messageEl.textContent = "";
    messageEl.className = "text-center mt-4";

    try {
      const response = await fetch(`${API_URL}/api/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referralData),
      });

      if (response.ok) {
        messageEl.textContent =
          "Referral submitted successfully! Redirecting...";
        messageEl.classList.add("text-green-600");
        setTimeout(() => {
          window.location.href = "http://127.0.0.1:8080"; // Redirect to the homepage
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit referral.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      messageEl.textContent = error.message;
      messageEl.classList.add("text-red-600");
    }
  });
});
