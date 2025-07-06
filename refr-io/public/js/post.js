document.addEventListener("DOMContentLoaded", () => {
  const postForm = document.getElementById("post-form");
  const messageEl = document.getElementById("form-message");

  if (!postForm) return;

  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      messageEl.textContent = "You must be logged in to post a referral.";
      messageEl.className = "text-red-600 text-center mt-4";
      return;
    }

    const formData = new FormData(postForm);
    const referralData = Object.fromEntries(formData.entries());

    messageEl.textContent = "";
    messageEl.className = "text-center mt-4";

    try {
      const response = await fetch(`${API_URL}/api/referrals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(referralData),
      });

      if (response.ok) {
        messageEl.textContent =
          "Referral submitted successfully! Redirecting...";
        messageEl.classList.add("text-green-600");
        setTimeout(() => {
          // Redirect to the dashboard, not the landing page
          window.location.href = "/dashboard.html";
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
