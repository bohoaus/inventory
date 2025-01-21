class StaffSummary {
  constructor() {
    this.container = null;
    this.initialize();
  }

  async initialize() {
    this.container = document.createElement("div");
    this.container.className = "staffsummary-container";

    // Add after note board
    const noteBoard = document.querySelector(".note-board");
    if (noteBoard) {
      noteBoard.parentNode.insertBefore(this.container, noteBoard.nextSibling);
    }

    await this.loadAndDisplaySummary();
    this.setupRealtimeSubscription();
  }

  async loadAndDisplaySummary() {
    try {
      const { data: items, error } = await supabaseClient
        .from("inventory")
        .select("*");

      if (error) throw error;

      const summary = this.calculateSummary(items);
      this.renderSummary(summary);
    } catch (error) {
      console.error("Error loading inventory summary:", error);
      this.container.innerHTML =
        '<div class="error">Failed to load inventory summary</div>';
    }
  }

  calculateSummary(items) {
    const summary = {
      groups: {},
      categories: {},
      statuses: {},
      total: items.length,
    };

    items.forEach((item) => {
      // Count by group
      const group = item.item_group || "Unspecified";
      summary.groups[group] = (summary.groups[group] || 0) + 1;

      // Count by category
      const category = item.item_category || "Unspecified";
      summary.categories[category] = (summary.categories[category] || 0) + 1;

      // Count by status
      const status = item.item_status || "Unspecified";
      summary.statuses[status] = (summary.statuses[status] || 0) + 1;
    });

    return summary;
  }

  renderSummary(summary) {
    this.container.innerHTML = `
      <div class="staffsummary-header">
        <h2>Inventory Summary</h2>
      </div>

      <div class="staffsummary-section">
        <div class="staffsummary-section-title">Overview</div>
        <div class="staffsummary-grid">
          <div class="staffsummary-card">
            <div class="staffsummary-card-title">Total Items</div>
            <div class="staffsummary-card-value">${summary.total}</div>
          </div>
        </div>
      </div>

      <div class="staffsummary-section">
        <div class="staffsummary-section-title">By Group</div>
        <table class="staffsummary-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(summary.groups)
              .sort(([, a], [, b]) => b - a)
              .map(
                ([group, count]) => `
                <tr>
                  <td>${group}</td>
                  <td>${count}</td>
                  <td>${((count / summary.total) * 100).toFixed(1)}%</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="staffsummary-section">
        <div class="staffsummary-section-title">By Category</div>
        <table class="staffsummary-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(summary.categories)
              .sort(([, a], [, b]) => b - a)
              .map(
                ([category, count]) => `
                <tr>
                  <td>${category}</td>
                  <td>${count}</td>
                  <td>${((count / summary.total) * 100).toFixed(1)}%</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="staffsummary-section">
        <div class="staffsummary-section-title">By Status</div>
        <table class="staffsummary-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(summary.statuses)
              .sort(([, a], [, b]) => b - a)
              .map(
                ([status, count]) => `
                <tr>
                  <td>${status}</td>
                  <td>${count}</td>
                  <td>${((count / summary.total) * 100).toFixed(1)}%</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  setupRealtimeSubscription() {
    const channel = supabaseClient.channel("inventory_changes");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => {
          this.loadAndDisplaySummary();
        }
      )
      .subscribe();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.staffSummary = new StaffSummary();
});
