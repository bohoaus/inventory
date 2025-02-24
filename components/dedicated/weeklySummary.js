class WeeklySummary {
  constructor() {
    this.modal = null;
    this.currentWeekStart = this.getWeekStart(new Date());
    this.currentWeekEnd = this.getWeekEnd(new Date());
    this.setupModal();
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  getWeekEnd(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  setupModal() {
    // Check if modal already exists
    this.modal = document.getElementById("weeklySummaryModal");
    if (this.modal) return;

    const modalHTML = `
      <div id="weeklySummaryModal" class="weekly-summary-modal">
        <div class="weekly-summary-content">
          <div class="modal-header">
            <h2>Weekly Sales Summary</h2>
            <span class="close">&times;</span>
          </div>
          <div class="modal-body">
            <div class="filter-section">
              <div class="date-filter">
                <label>Select Week Period:</label>
                <div class="date-inputs">
                  <input type="date" id="weekStart" class="date-input">
                  <span>to</span>
                  <input type="date" id="weekEnd" class="date-input" disabled>
                </div>
              </div>
            </div>
            <div class="table-container">
              <table id="summaryTable">
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Colour</th>
                    <th>Item Name</th>
                    <th>ReleaseDate</th>
                    <th>Status</th>
                    <th>Ordered</th>
                    <th>Customer</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this.modal = document.getElementById("weeklySummaryModal");
    this.setupEventListeners();
  }

  setupEventListeners() {
    const closeBtn = this.modal.querySelector(".close");
    closeBtn.onclick = () => this.closeModal();

    window.onclick = (event) => {
      if (event.target === this.modal) {
        this.closeModal();
      }
    };

    const weekStartInput = document.getElementById("weekStart");
    weekStartInput.addEventListener("change", (e) => {
      const selectedDate = new Date(e.target.value);
      this.currentWeekStart = this.getWeekStart(selectedDate);
      this.currentWeekEnd = this.getWeekEnd(selectedDate);

      // Update end date display
      const weekEndInput = document.getElementById("weekEnd");
      weekEndInput.value = this.currentWeekEnd.toISOString().split("T")[0];

      this.loadSummaryData();
    });
  }

  async initialize() {
    try {
      // Set initial date values
      const weekStartInput = document.getElementById("weekStart");
      const weekEndInput = document.getElementById("weekEnd");

      weekStartInput.value = this.currentWeekStart.toISOString().split("T")[0];
      weekEndInput.value = this.currentWeekEnd.toISOString().split("T")[0];

      await this.loadSummaryData();
      this.modal.style.display = "block";
    } catch (error) {
      console.error("Error initializing weekly summary:", error);
      alert("Failed to load weekly summary. Please try again.");
    }
  }

  async loadSummaryData() {
    try {
      const { data: orderItems, error: itemsError } = await supabaseClient
        .from("order_items")
        .select(
          `
          item_name,
          oicolour,
          order_qty,
          order_id,
          created_at,
          inventory:item_name (
            code_colour,
            item_name,
            item_status,
            item_group
          )
        `
        )
        .eq("order_item_status", "ACTIVE")
        .gte("created_at", this.currentWeekStart.toISOString())
        .lte("created_at", this.currentWeekEnd.toISOString())
        .in("inventory.item_group", ["BOHO", "PRIMROSE"]);

      if (itemsError) throw itemsError;

      // Process and aggregate data
      const summaryMap = new Map();

      orderItems.forEach((item) => {
        if (!item.inventory) return;

        const key = item.inventory.code_colour;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            code_colour: item.inventory.code_colour,
            scolour: item.inventory.scolour,
            item_name: item.inventory.item_name,
            release_date: item.inventory.release_date,
            item_status: item.inventory.item_status,
            total_qty: 0,
            customer_count: new Set(),
          });
        }

        const summary = summaryMap.get(key);
        summary.total_qty += item.order_qty;
        summary.customer_count.add(item.order_id);
      });

      // Convert to array and sort by status
      const sortOrder = {
        "NEW RELEASE": 1,
        "FULL PRICE": 2,
        "ON SALE": 3,
      };

      const summaryData = Array.from(summaryMap.values()).sort((a, b) => {
        const statusA = sortOrder[a.item_status?.toUpperCase()] || 999;
        const statusB = sortOrder[b.item_status?.toUpperCase()] || 999;
        return statusA - statusB;
      });

      this.updateTable(summaryData);
    } catch (error) {
      console.error("Error loading summary data:", error);
      alert("Failed to load summary data. Please try again.");
    }
  }

  updateTable(data) {
    const tbody = document.querySelector("#summaryTable tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="no-data">No data available for selected week</td>
        </tr>
      `;
      return;
    }

    data.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.code_colour}</td>
        <td>${item.scolour}</td>
        <td>${item.item_name}</td>
        <td>${item.release_date}</td>
        <td>${item.item_status || "-"}</td>
        <td>${item.total_qty}</td>
        <td>${item.customer_count.size}</td>
      `;
      tbody.appendChild(row);
    });
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = "none";
    }
  }
}

// Initialize and export instance
document.addEventListener("DOMContentLoaded", () => {
  window.weeklySummary = new WeeklySummary();
});
