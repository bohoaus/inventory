class AdminDashboard {
  constructor() {
    this.initialize();
  }

  async initialize() {
    try {
      // Add logout handler
      this.setupLogout();

      // Check authentication
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.getUser();
      if (error || !user) {
        window.location.href = "../index.html";
        return;
      }

      // Display user email
      document.getElementById("userEmail").textContent = user.email;
    } catch (error) {
      console.error("Error initializing dashboard:", error);
    }
  }

  setupLogout() {
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const { error } = await supabaseClient.auth.signOut();
          if (error) throw error;
          window.location.href = "../index.html";
        } catch (error) {
          console.error("Error signing out:", error);
          alert("Error signing out. Please try again.");
        }
      });
    }
  }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new AdminDashboard();
});
