// smasalia97/refr.io/refr.io-refr-frontend/refr-io/public/js/app.js
document.addEventListener("DOMContentLoaded", () => {
  const referralsList = document.getElementById("referrals-list");
  const welcomeMessage = document.getElementById("welcome-message");
  const postReferralLink = document.getElementById("post-referral-link");
  const loggedOutView = document.getElementById("logged-out-view");
  const loggedInView = document.getElementById("logged-in-view");
  const logoutBtn = document.getElementById("logout-btn");
  const userMenuButton = document.getElementById("user-menu-button");
  const userMenu = document.getElementById("user-menu");
  const searchInput = document.getElementById("search-input");
  const paginationControls = document.getElementById("pagination-controls");
  const filterCategory = document.getElementById("filter-category");

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
      case "Finance":
        return "bg-amber-100 text-amber-800";
      case "Food":
        return "bg-lime-100 text-lime-800";
      case "Shopping":
        return "bg-teal-100 text-teal-800";
      case "Travel":
        return "bg-sky-100 text-sky-800";
      case "Services":
        return "bg-indigo-100 text-indigo-800";
      case "Software":
        return "bg-indigo-100 text-indigo-800";
      case "Gaming":
        return "bg-rose-100 text-rose-800";
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
    const card = document.createElement("div");
    card.className =
      "referral-card bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm";

    let displayCategory = ref.ref_category;
    if (ref.ref_category === "Other" && ref.ref_category_other) {
      displayCategory = ref.ref_category_other;
    }
    const categoryClasses = getCategoryClasses(ref.ref_category);

    // Create and append user name if it exists
    if (ref.users && ref.users.user_name) {
      const userNameDiv = document.createElement("div");
      userNameDiv.className = "text-sm font-semibold text-gray-800 mb-2";
      userNameDiv.textContent = capitalizeName(ref.users.user_name);
      card.appendChild(userNameDiv);
    }

    const contentWrapper = document.createElement("div");
    contentWrapper.className =
      "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-3 gap-x-4";

    const textWrapper = document.createElement("div");
    textWrapper.className = "flex-grow";

    const titleLink = document.createElement("a");
    titleLink.href = ref.ref_link;
    titleLink.target = "_blank";
    const titleHeader = document.createElement("h2");
    titleHeader.className =
      "text-lg font-semibold text-brand-green hover:underline";
    // Safely set the referral name as text content
    titleHeader.textContent = ref.ref_name;
    titleLink.appendChild(titleHeader);
    textWrapper.appendChild(titleLink);

    // Create and append description if it exists
    if (ref.ref_desc) {
      const descriptionP = document.createElement("p");
      descriptionP.className = "text-sm text-gray-600 mt-1";
      // Safely set the description as text content
      descriptionP.textContent = ref.ref_desc;
      textWrapper.appendChild(descriptionP);
    }

    const controlsWrapper = document.createElement("div");
    controlsWrapper.className =
      "w-full sm:w-auto flex-shrink-0 flex items-center justify-between sm:justify-end gap-4";

    const categorySpan = document.createElement("span");
    categorySpan.className = `${categoryClasses} text-xs font-medium px-3 py-1 rounded-full`;
    categorySpan.textContent = displayCategory;

    const copyButton = document.createElement("button");
    copyButton.className =
      "copy-link-btn bg-slate-100 text-gray-700 font-semibold px-4 py-2 rounded-lg";
    copyButton.dataset.link = ref.ref_link;
    copyButton.textContent = "Copy Link";

    controlsWrapper.appendChild(categorySpan);
    controlsWrapper.appendChild(copyButton);

    contentWrapper.appendChild(textWrapper);
    contentWrapper.appendChild(controlsWrapper);
    card.appendChild(contentWrapper);

    return card;
  };

  const renderReferrals = (referrals) => {
    referralsList.innerHTML = "";
    if (referrals && referrals.length > 0) {
      referrals.forEach((ref) => {
        referralsList.appendChild(createReferralCard(ref)); // Append the element, not HTML string
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
      referralsList.innerHTML =
        '<p class="text-gray-500 text-center">Please log in to see referrals.</p>';
      return;
    }
    paginationControls.style.display = "flex";

    const category = filterCategory.value;
    const params = new URLSearchParams({ page: page });
    if (category) {
      params.append("category", category);
    }

    try {
      const response = await fetch(
        `${API_URL}/api/referrals?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const result = await response.json();

      renderReferrals(result.data);
      totalPages = result.totalPages;
      currentPage = page;
      updatePaginationControls();
    } catch (error) {
      console.error("Error fetching referrals:", error);
      referralsList.innerHTML =
        '<p class="text-red-600 text-center">Failed to load referrals.</p>';
    }
  };

  const searchReferrals = async (query) => {
    if (!accessToken) return;
    referralsList.innerHTML = ""; // This will clear the content and show the background skeletons
    paginationControls.style.display = "none";

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
      referralsList.innerHTML =
        '<p class="text-red-600 text-center">Failed to load search results.</p>';
    }
  };

  filterCategory.addEventListener("change", () => {
    fetchAndRenderReferrals(1);
  });

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query) {
      searchTimeout = setTimeout(() => {
        searchReferrals(query);
      }, 300);
    } else {
      currentPage = 1;
      fetchAndRenderReferrals(currentPage);
    }
  });

  referralsList.addEventListener("click", function (event) {
    const copyButton = event.target.closest(".copy-link-btn");
    if (copyButton) {
      navigator.clipboard.writeText(copyButton.dataset.link).then(() => {
        showToast("Link copied to clipboard!");
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
      paginationControls.style.display = "none";
      referralsList.innerHTML =
        '<p class="text-gray-500 text-center">Please log in to see referrals.</p>';
    }
  };

  init();
});
