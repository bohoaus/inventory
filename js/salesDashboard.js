// The supabaseClient is now globally available
class SalesDashboard {
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

  async loadDashboardData() {
    await Promise.all([
      this.loadAvailableStock(),
      this.loadMyOrders(),
      this.loadNewReleases(),
      this.loadOrderStatus(),
    ]);
  }

  async loadAvailableStock() {
    const { data, error } = await supabaseClient
      .from("inventory")
      .select("*")
      .gt("Stock", 0);

    if (error) {
      console.error("Error loading available stock:", error.message);
      return;
    }

    document.getElementById("availableStock").textContent = data.length;
  }

  async loadMyOrders() {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("oStatus", "processing");

    if (error) {
      console.error("Error loading orders:", error.message);
      return;
    }

    document.getElementById("myOrders").textContent = data.length;
  }

  async loadNewReleases() {
    const { data, error } = await supabaseClient
      .from("inventory")
      .select("*")
      .eq("Status", "new release")
      .order("ReleaseDate", { ascending: false });

    if (error) {
      console.error("Error loading new releases:", error.message);
      return;
    }

    const releases = data.map(
      (item) =>
        `${item.Item_Name} - Released: ${new Date(
          item.ReleaseDate
        ).toLocaleDateString()}`
    );
    document.getElementById("newReleases").innerHTML =
      releases.length > 0 ? releases.join("<br>") : "No new releases";
  }

  async loadOrderStatus() {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("oStatus, count")
      .order("Created", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error loading order status:", error.message);
      return;
    }

    const statusSummary = data.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const statusHtml = Object.entries(statusSummary)
      .map(([status, count]) => `${status}: ${count}`)
      .join("<br>");

    document.getElementById("orderStatus").innerHTML =
      statusHtml || "No recent orders";
  }

  setupRealtimeSubscriptions() {
    // Subscribe to inventory changes
    supabaseClient
      .channel("inventory_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => {
          this.loadDashboardData();
        }
      )
      .subscribe();

    // Subscribe to order changes
    supabaseClient
      .channel("order_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          this.loadDashboardData();
        }
      )
      .subscribe();
  }
}

// Initialize when DOM is loaded and after Auth
document.addEventListener("DOMContentLoaded", () => {
  // Wait for auth to be ready
  document.addEventListener("authReady", async () => {
    const dashboard = new SalesDashboard();
    await dashboard.initialize();
  });
});
