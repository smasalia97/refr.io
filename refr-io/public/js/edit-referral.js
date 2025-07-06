document.addEventListener("DOMContentLoaded", () => {
  const editForm = document.getElementById("edit-form");
  const messageEl = document.getElementById("form-message");

  const titleInput = document.getElementById("title");
  const linkInput = document.getElementById("link");
  const descriptionInput = document.getElementById("description");
  const categoryInput = document.getElementById("category");

  const accessToken = localStorage.getItem("accessToken");
  const params = new URLSearchParams(window.location.search);
  const referralId = params.get("id");

  if (!referralId) {
    window.location.href = "/profile.html";
    return;
  }

  const fetchReferralData = async () => {
    if (!accessToken) {
      messageEl.textContent = "You must be logged in to edit a referral.";
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/referrals/${referralId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(
          "Could not fetch referral data or you do not own this referral."
        );
      }
      const { data } = await response.json();

      titleInput.value = data.ref_name;
      linkInput.value = data.ref_link;
      descriptionInput.value = data.ref_desc;
      categoryInput.value = data.ref_category;
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = "text-red-600 text-center mt-4";
    }
  };

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageEl.textContent = "";

    const updatedData = {
      title: titleInput.value,
      link: linkInput.value,
      description: descriptionInput.value,
      category: categoryInput.value,
    };

    try {
      const response = await fetch(`${API_URL}/api/referrals/${referralId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        messageEl.textContent = "Update successful! Redirecting...";
        messageEl.className = "text-green-600 text-center mt-4";
        setTimeout(() => (window.location.href = "/profile.html"), 1500);
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "Failed to update referral.");
      }
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = "text-red-600 text-center mt-4";
    }
  });

  fetchReferralData();
});
