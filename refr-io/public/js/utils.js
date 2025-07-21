function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;

  const toast = document.createElement("div");

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";

  toast.className = `toast-notification ${bgColor} text-white font-bold py-2 px-4 rounded-md shadow-lg transform transition-all duration-300`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  // Animate out and remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 3000);
}
