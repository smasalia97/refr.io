document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const referralsList = document.getElementById("referrals-list");
  const loadingMessage = document.getElementById("loading-message");
  const deleteModal = document.getElementById("delete-modal");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

  // Header views
  const loggedOutView = document.getElementById("logged-out-view");
  const loggedInView = document.getElementById("logged-in-view");
  const logoutBtn = document.getElementById("logout-btn");

  const API_URL = "http://localhost:3000"; // Define the backend server URL
  const accessToken = localStorage.getItem("accessToken");

  // --- State ---
  let referralToDelete = { id: null, element: null };

  // --- Functions ---

  /**
   * Toggles header buttons based on login status.
   */
  const updateHeader = () => {
    if (accessToken) {
      loggedOutView.classList.add("hidden");
      loggedInView.classList.remove("hidden");
    } else {
      loggedOutView.classList.remove("hidden");
      loggedInView.classList.add("hidden");
    }
  };

  /**
   * Handles user logout.
   */
  const handleLogout = () => {
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("idToken");
        localStorage.removeItem("refreshToken");
        window.location.href = FRONTEND_URL || "/";
      });
    }
  };

  /**
   * Returns the appropriate Tailwind CSS classes for a given category.
   * By writing the full class strings here, we ensure Tailwind's build
   * process detects and includes them in the final stylesheet.
   * @param {string} category The category of the referral.
   * @returns {string} A string of Tailwind classes.
   */

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

  /**
   * Creates the HTML for a single referral card.
   * @param {object} ref - The referral data object.
   * @returns {string} The HTML string for the card.
   */
  const createReferralCard = (ref) => {
    const categoryClasses = getCategoryClasses(ref.category);
    const descriptionHTML = ref.description
      ? `<p class="text-sm text-gray-600 mt-1">${ref.description}</p>`
      : "";

    return `
            <div class="referral-card bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md hover:border-brand-green hover:ring-1 hover:ring-emerald-100 transition-all duration-200 ease-in-out">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div class="flex-grow">
                        <a href="${ref.link}" target="_blank" rel="noopener noreferrer" class="block">
                            <h2 class="text-lg font-semibold text-brand-green hover:underline">${ref.title}</h2>
                        </a>
                        ${descriptionHTML}
                    </div>
                    <div class="flex-shrink-0 flex items-center gap-4">
                        <span class="${categoryClasses} text-xs font-medium px-3 py-1 rounded-full">${ref.category}</span>
                        <button class="copy-link-btn bg-slate-100 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors min-h-[40px]" data-link="${ref.link}">Copy Link</button>
                        <button class="delete-btn bg-red-100 text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-200 transition-colors min-h-[40px]" data-id="${ref.id}">Delete</button>
                    </div>
                </div>
            </div>
        `;
  };

  const fetchAndRenderReferrals = async () => {
    if (!accessToken) {
      loadingMessage.textContent = "Please log in to see referrals.";
      return;
    }

    console.log("Sending access token:");
    try {
      const response = await fetch(`${API_URL}/api/referrals`, {
        headers: {
          // Send the token to the protected API route
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      const referrals = result.data;

      if (loadingMessage) loadingMessage.style.display = "none";
      referralsList.innerHTML = "";

      if (referrals && referrals.length > 0) {
        referrals.forEach((ref) => {
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
      if (loadingMessage) loadingMessage.textContent = error.message;
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
    if (!referralToDelete.id || !accessToken) return;

    try {
      const response = await fetch(
        `${API_URL}/api/referrals/${referralToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            // Add the Authorization header
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        referralToDelete.element.remove();
      } else {
        const errorData = await response.json();
        console.error(`Failed to delete referral: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error deleting referral:", error);
    } finally {
      closeDeleteModal();
    }
  };

  // --- Event Listeners ---
  referralsList.addEventListener("click", function (event) {
    const copyButton = event.target.closest(".copy-link-btn");
    if (copyButton) {
      navigator.clipboard
        .writeText(copyButton.dataset.link)
        .then(() => {
          copyButton.textContent = "Copied!";
          setTimeout(() => {
            copyButton.textContent = "Copy Link";
          }, 2000);
        })
        .catch((err) => console.error("Failed to copy: ", err));
      return;
    }

    const deleteButton = event.target.closest(".delete-btn");
    if (deleteButton) {
      const referralId = deleteButton.dataset.id;
      const cardElement = deleteButton.closest(".referral-card");
      openDeleteModal(referralId, cardElement);
    }
  });

  confirmDeleteBtn.addEventListener("click", handleDelete);
  cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  // --- Initial Load ---
  updateHeader();
  handleLogout();
  fetchAndRenderReferrals();
});
