// smasalia97/refr.io/refr.io-refr-frontend/refr-io/public/js/app.js
document.addEventListener("DOMContentLoaded", () => {
  const referralsList = document.getElementById("referrals-list");
  const loadingMessage = document.getElementById("loading-message");
  const welcomeMessage = document.getElementById("welcome-message");
  const postReferralLink = document.getElementById("post-referral-link");
  const loggedOutView = document.getElementById("logged-out-view");
  const loggedInView = document.getElementById("logged-in-view");
  const logoutBtn = document.getElementById("logout-btn");
  const userMenuButton = document.getElementById("user-menu-button");
  const userMenu = document.getElementById("user-menu");
  const searchInput = document.getElementById("search-input");
  const paginationControls = document.getElementById("pagination-controls");

  const accessToken = localStorage.getItem("accessToken");
  let currentUser = null;
  let currentPage = 1;
  let totalPages = 1;
  let searchTimeout;

  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");
  const pageIndicator = document.getElementById("page-indicator");

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

  const capitalizeName = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const createReferralCard = (ref) => {
    const descriptionHTML = ref.ref_desc
      ? `<p class="text-sm text-gray-600 mt-1">${ref.ref_desc}</p>`
      : "";
    const userNameHTML =
      ref.users && ref.users.user_name
        ? `<div class="text-sm font-semibold text-gray-800 mb-2">${capitalizeName(
            ref.users.user_name
          )}</div>`
        : "";

    return `
      <div class="referral-card bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm">
          ${userNameHTML}
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-3 gap-x-4">
              <div class="flex-grow">
                  <a href="${
                    ref.ref_link
                  }" target="_blank"><h2 class="text-lg font-semibold text-brand-green hover:underline">${
      ref.ref_name
    }</h2></a>
                  ${descriptionHTML}
              </div>
              <div class="w-full sm:w-auto flex-shrink-0 flex items-center justify-between sm:justify-end gap-4">
                  <span class="${getCategoryClasses(
                    ref.ref_category
                  )} text-xs font-medium px-3 py-1 rounded-full">${
      ref.ref_category
    }</span>
                  <button class="copy-link-btn bg-slate-100 text-gray-700 font-semibold px-4 py-2 rounded-lg" data-link="${
                    ref.ref_link
                  }">Copy Link</button>
              </div>
          </div>
      </div>`;
  };

  const renderReferrals = (referrals) => {
    loadingMessage.style.display = "none";
    referralsList.innerHTML = "";
    if (referrals && referrals.length > 0) {
      referrals.forEach((ref) => {
        referralsList.insertAdjacentHTML("beforeend", createReferralCard(ref));
      });
    } else {
      referralsList.innerHTML =
        '<p class="text-gray-500 text-center">No referrals found.</p>';
    }
  };

  const updatePaginationControls = () => {
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  };

  const fetchAndRenderReferrals = async (page = 1) => {
    if (!accessToken) {
      loadingMessage.textContent = "Please log in to see referrals.";
      return;
    }
    paginationControls.style.display = "flex"; // Show pagination
    try {
      const response = await fetch(`${API_URL}/api/referrals?page=${page}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const result = await response.json();

      renderReferrals(result.data);
      totalPages = result.totalPages;
      updatePaginationControls();
    } catch (error) {
      console.error("Error fetching referrals:", error);
      loadingMessage.textContent = "Failed to load referrals.";
    }
  };

  const searchReferrals = async (query) => {
    if (!accessToken) return;
    loadingMessage.style.display = "block";
    referralsList.innerHTML = "";
    paginationControls.style.display = "none"; // Hide pagination during search

    try {
      const response = await fetch(
        `${API_URL}/api/referrals/search?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok) throw new Error("Search request failed");
      const result = await response.json();
      renderReferrals(result.data);
    } catch (error) {
      console.error("Error searching referrals:", error);
      loadingMessage.textContent = "Failed to load search results.";
    }
  };

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query) {
      searchTimeout = setTimeout(() => {
        searchReferrals(query);
      }, 300); // Debounce requests by 300ms
    } else {
      // If search is cleared, fetch the first page of all referrals
      currentPage = 1;
      fetchAndRenderReferrals(currentPage);
    }
  });

  referralsList.addEventListener("click", function (event) {
    const copyButton = event.target.closest(".copy-link-btn");
    if (copyButton) {
      navigator.clipboard.writeText(copyButton.dataset.link).then(() => {
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "Copy Link";
        }, 2000);
      });
    }
  });

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

  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchAndRenderReferrals(currentPage);
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      fetchAndRenderReferrals(currentPage);
    }
  });

  const init = async () => {
    await fetchCurrentUser();
    if (currentUser) {
      fetchAndRenderReferrals(currentPage);
    } else {
      loadingMessage.textContent = "Please log in to see referrals.";
      paginationControls.style.display = "none";
    }
  };

  init();
});
