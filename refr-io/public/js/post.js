document.addEventListener("DOMContentLoaded", () => {
  const postForm = document.getElementById("post-form");
  const messageEl = document.getElementById("form-message");
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const categoryInput = document.getElementById("category");

  if (!postForm) return;

  const categoryKeywords = {
    "Credit Card": [
      "card",
      "credit",
      "apr",
      "points",
      "rewards",
      "bank",
      "finance",
    ],
    Food: [
      "food",
      "delivery",
      "restaurant",
      "doordash",
      "uber eats",
      "grubhub",
      "meal",
      "dining",
    ],
    Shopping: ["shop", "store", "discount", "sale", "rakuten", "retail"],
    Travel: [
      "travel",
      "hotel",
      "motel",
      "airbnb",
      "flight",
      "booking",
      "vacation",
      "trip",
      "tour",
      "journey",
    ],
    Services: [
      "service",
      "software",
      "notion",
      "subscription",
      "tool",
      "app",
      "platform",
    ],
  };

  const suggestCategory = () => {
    const title = titleInput.value.toLowerCase();
    const description = descriptionInput.value.toLowerCase();
    const text = `${title} ${description}`;

    for (const category in categoryKeywords) {
      if (
        categoryKeywords[category].some((keyword) => text.includes(keyword))
      ) {
        categoryInput.value = category;
        return;
      }
    }
  };

  titleInput.addEventListener("input", suggestCategory);
  descriptionInput.addEventListener("input", suggestCategory);

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
