// Initialize inventory when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  // Check if user is authenticated
  const { session, error } = await auth.getSession();

  if (error || !session) {
    window.location.href = "/index.html";
    return;
  }

  // Display user email
  document.getElementById("userEmail").textContent = session.user.email;

  // Initialize inventory component
  await window.inventoryComponent.initialize("inventoryContainer");

  // Setup logout handler
  document.getElementById("logout").addEventListener("click", async (e) => {
    e.preventDefault();
    await auth.signOut();
  });
});
