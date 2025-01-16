import { supabase } from "./config.js";

class StaffDashboard {
  constructor() {
    // Don't call initialize in constructor
  }

  async initialize() {
    try {
      // Load dashboard data
      await this.loadDashboardData();

      // Setup realtime subscriptions
      this.setupRealtimeSubscriptions();
    } catch (error) {
      console.error("Error:", error);
      // Don't show alert to avoid double error messages
      console.error("Error initializing dashboard");
    }
  }

  async loadDashboardData() {
    // Implement dashboard data loading
  }

  setupRealtimeSubscriptions() {
    // Implement realtime subscriptions
  }
}

console.log("staffDashboard.js loaded");

// Add direct click handler
function setupFreightButton() {
  console.log("Setting up freight button");
  const viewFreightBtn = document.getElementById("viewFreightBtn");
  const freightContainer = document.getElementById("freightContainer");

  if (!viewFreightBtn) {
    console.error("Freight button not found");
    return;
  }

  if (!freightContainer) {
    console.error("Freight container not found");
    return;
  }

  console.log("Found elements:", { viewFreightBtn, freightContainer });

  // Add direct click handler
  viewFreightBtn.onclick = function () {
    console.log("Button clicked");
    const isVisible = freightContainer.style.display !== "none";

    if (isVisible) {
      freightContainer.style.display = "none";
      viewFreightBtn.textContent = "View Upcoming Freight";
    } else {
      freightContainer.style.display = "block";
      viewFreightBtn.textContent = "Hide Freight List";

      if (!window.StaffFreightListComponent) {
        console.error("StaffFreightListComponent not found");
        return;
      }

      const component = new window.StaffFreightListComponent();
      component.initialize().catch((error) => {
        console.error("Error initializing component:", error);
        freightContainer.style.display = "none";
        viewFreightBtn.textContent = "View Upcoming Freight";
      });
    }
  };

  // Also add a direct click listener
  viewFreightBtn.addEventListener("click", function (e) {
    console.log("Click event fired");
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded - setting up dashboard");

  try {
    // Check auth first
    const {
      data: { user },
      error,
    } = await window.supabase.auth.getUser();

    if (error || !user) {
      window.location.href = "../login.html";
      return;
    }

    // Display user email
    document.getElementById("userEmail").textContent = user.email;

    // Initialize note board
    initializeNoteBoard();

    // Setup freight button
    setupFreightButton();

    // Set up logout functionality
    document.getElementById("logout").addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await window.supabase.auth.signOut();
        window.location.href = "../login.html";
      } catch (error) {
        console.error("Error signing out:", error);
      }
    });
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    window.location.href = "../login.html";
  }
});
