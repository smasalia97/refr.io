document.addEventListener("DOMContentLoaded", () => {
  const profileDetails = document.getElementById("profile-details");
  const loadingMessage = document.getElementById("loading-message");
  const logoutBtn = document.getElementById("logout-btn");
  const myReferralsList = document.getElementById("my-referrals-list");
  const myReferralsLoading = document.getElementById("my-referrals-loading");

  const API_URL = "http://localhost:3000";
  const accessToken = localStorage.getItem("accessToken");

  const handleLogout = () => {
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/";
      });
    }
  };

  const fetchProfile = async () => {
    if (!accessToken) {
      loadingMessage.textContent = "Please log in to view your profile.";
      myReferralsLoading.textContent = "";
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch profile data.");

      const userData = await response.json();
      const nameAttribute = userData.UserAttributes.find(
        (attr) => attr.Name === "name"
      );
      const emailAttribute = userData.UserAttributes.find(
        (attr) => attr.Name === "email"
      );

      const name = nameAttribute ? nameAttribute.Value : "N/A";
      const email = emailAttribute ? emailAttribute.Value : "N/A";

      loadingMessage.style.display = "none";
      profileDetails.innerHTML = `
                <div class="space-y-4">
                    <div><h3 class="text-lg font-medium text-gray-900">Name</h3><p class="text-gray-600">${name}</p></div>
                    <div><h3 class="text-lg font-medium text-gray-900">Email</h3><p class="text-gray-600">${email}</p></div>
                </div>`;
    } catch (error) {
      loadingMessage.textContent = error.message;
    }
  };

  const fetchMyReferrals = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/api/my-referrals`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch your referrals.");
      const result = await response.json();

      myReferralsLoading.style.display = "none";
      myReferralsList.innerHTML = "";

      if (result.data && result.data.length > 0) {
        result.data.forEach((ref) => {
          myReferralsList.insertAdjacentHTML(
            "beforeend",
            createMyReferralCard(ref)
          );
        });
      } else {
        myReferralsList.innerHTML = `<p class="text-gray-500">You haven't posted any referrals yet.</p>`;
      }
    } catch (error) {
      myReferralsLoading.textContent = error.message;
    }
  };

  const createMyReferralCard = (ref) => {
    return `
            <div class="referral-card bg-white border border-slate-200 rounded-xl p-5" data-id="${ref.ref_id}">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold text-gray-800">${ref.ref_name}</h3>
                        <a href="${ref.ref_link}" class="text-sm text-brand-green hover:underline" target="_blank">${ref.ref_link}</a>
                    </div>
                    <div class="flex items-center gap-2">
                        <a href="/edit-referral.html?id=${ref.ref_id}" class="edit-btn bg-blue-100 text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-200">Edit</a>
                        <button class="delete-btn bg-red-100 text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-200">Delete</button>
                    </div>
                </div>
            </div>`;
  };

  const handleDelete = async (event) => {
    const deleteButton = event.target.closest(".delete-btn");
    if (!deleteButton) return;

    const card = deleteButton.closest(".referral-card");
    const referralId = card.dataset.id;

    if (!confirm(`Are you sure you want to delete this referral?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/referrals/${referralId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        card.remove();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete referral.");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  myReferralsList.addEventListener("click", handleDelete);

  handleLogout();
  fetchProfile();
  fetchMyReferrals();
});
