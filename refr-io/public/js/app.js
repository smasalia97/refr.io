document.addEventListener("DOMContentLoaded", () => {
  const referralsList = document.getElementById("referrals-list");
  const loadingMessage = document.getElementById("loading-message");
  const deleteModal = document.getElementById("delete-modal");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
  const welcomeMessage = document.getElementById("welcome-message");
  const postReferralLink = document.getElementById("post-referral-link");
  const loggedOutView = document.getElementById("logged-out-view");
  const loggedInView = document.getElementById("logged-in-view");
  const logoutBtn = document.getElementById("logout-btn");
  const userMenuButton = document.getElementById("user-menu-button");
  const userMenu = document.getElementById("user-menu");

  const API_URL = "http://localhost:3000";
  const accessToken = localStorage.getItem("accessToken");
  let currentUser = null;
  let referralToDelete = { id: null, element: null };

  const updateHeader = () => {
    if (currentUser) {
      loggedOutView.classList.add("hidden");
      loggedInView.classList.remove("hidden");
      postReferralLink.classList.remove("hidden");
      const firstName = currentUser.name.split(" ")[0];
      welcomeMessage.textContent = `Hi, ${firstName}`;
    } else {
      loggedOutView.classList.remove("hidden");
      loggedInView.classList.add("hidden");
      postReferralLink.classList.add("hidden");
    }
  };

  const fetchCurrentUser = async () => {
    if (!accessToken) {
      updateHeader();
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Could not fetch user.");
      const userData = await response.json();
      const nameAttribute = userData.UserAttributes.find(
        (attr) => attr.Name === "name"
      );
      currentUser = {
        name: nameAttribute ? nameAttribute.Value : "User",
        sub: userData.UserAttributes.find((attr) => attr.Name === "sub").Value,
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      currentUser = null;
    } finally {
      updateHeader();
    }
  };

  const getCategoryClasses = (category) => {
    switch (category) {
      case "Credit Card":
        return "bg-emerald-100 text-emerald-800";
      case "Food":
        return "bg-lime-100 text-lime-800";
      case "Shopping":
        return "bg-teal-100 text-teal-800";
      case "Travel":
        return "bg-sky-100 text-sky-800";
      case "Services":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const createReferralCard = (ref) => {
    const categoryClasses = getCategoryClasses(ref.ref_category);
    const descriptionHTML = ref.ref_desc
      ? `<p class="text-sm text-gray-600 mt-1">${ref.ref_desc}</p>`
      : "";
    const userNameHTML = ref.user_name
      ? `<div class="text-sm font-semibold text-gray-800 mb-2">${ref.user_name}</div>`
      : "";
    const isOwner = currentUser && ref.user_sub === currentUser.sub;
    const deleteButtonHTML = isOwner
      ? `<button class="delete-btn bg-red-100 text-red-700 font-semibold px-4 py-2 rounded-lg" data-id="${ref.ref_id}">Delete</button>`
      : "";

    return `
            <div class="referral-card bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm">
                ${userNameHTML}
                <div class="flex justify-between items-center gap-4">
                    <div class="flex-grow">
                        <a href="${ref.ref_link}" target="_blank"><h2 class="text-lg font-semibold text-brand-green hover:underline">${ref.ref_name}</h2></a>
                        ${descriptionHTML}
                    </div>
                    <div class="flex-shrink-0 flex items-center gap-4">
                        <span class="${categoryClasses} text-xs font-medium px-3 py-1 rounded-full">${ref.ref_category}</span>
                        <button class="copy-link-btn bg-slate-100 text-gray-700 font-semibold px-4 py-2 rounded-lg" data-link="${ref.ref_link}">Copy Link</button>
                        ${deleteButtonHTML}
                    </div>
                </div>
            </div>`;
  };

  const fetchAndRenderReferrals = async () => {
    if (!accessToken) {
      loadingMessage.textContent = "Please log in to see referrals.";
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/referrals`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const result = await response.json();

      loadingMessage.style.display = "none";
      referralsList.innerHTML = "";

      if (result.data && result.data.length > 0) {
        result.data.forEach((ref) => {
          referralsList.insertAdjacentHTML(
            "beforeend",
            createReferralCard(ref)
          );
        });
      } else {
        referralsList.innerHTML =
          '<p class="text-gray-500 text-center">No referrals posted yet. Be the first!</p>';
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
      loadingMessage.textContent = "Failed to load referrals.";
    }
  };

  const openDeleteModal = (id, element) => {
    referralToDelete = { id, element };
    deleteModal.classList.remove("hidden");
  };

  const closeDeleteModal = () => {
    referralToDelete = { id: null, element: null };
    deleteModal.classList.add("hidden");
  };

  const handleDelete = async () => {
    if (!referralToDelete.id) return;
    try {
      const response = await fetch(
        `${API_URL}/api/referrals/${referralToDelete.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (response.ok) {
        referralToDelete.element.remove();
      } else {
        alert("Failed to delete referral.");
      }
    } catch (error) {
      console.error("Error deleting referral:", error);
    } finally {
      closeDeleteModal();
    }
  };

  referralsList.addEventListener("click", function (event) {
    const copyButton = event.target.closest(".copy-link-btn");
    if (copyButton) {
      navigator.clipboard.writeText(copyButton.dataset.link).then(() => {
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "Copy Link";
        }, 2000);
      });
      return;
    }
    const deleteButton = event.target.closest(".delete-btn");
    if (deleteButton) {
      const referralId = deleteButton.dataset.id;
      const cardElement = deleteButton.closest(".referral-card");
      openDeleteModal(referralId, cardElement);
    }
  });

  if (confirmDeleteBtn)
    confirmDeleteBtn.addEventListener("click", handleDelete);
  if (cancelDeleteBtn)
    cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  if (logoutBtn)
    logoutBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "/";
    });
  if (userMenuButton)
    userMenuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      userMenu.classList.toggle("hidden");
    });
  window.addEventListener("click", () => {
    if (userMenu && !userMenu.classList.contains("hidden")) {
      userMenu.classList.add("hidden");
    }
  });

  const init = async () => {
    await fetchCurrentUser();
    // The /api/referrals route is now protected, so we only fetch if the user is logged in
    if (currentUser) {
      fetchAndRenderReferrals();
    } else {
      loadingMessage.textContent = "Please log in to see referrals.";
    }
  };

  init();
});
