class WeeklySummary {
  constructor() {
    this.modal = null;
    this.startDateInput = null;
    this.endDateInput = null;
    this.summaryTable = null;
    this.initialize();
  }

  initialize() {
    this.createModal();
    this.setupEventListeners();
    this.setDefaultDates();
    this.loadSummaryData();
  }

  createModal() {
    const modalHtml = `
      <div class="weekly-summary-modal">
        <div class="weekly-summary-content">
          <div class="modal-header">
            <h2>Weekly Sales Summary</h2>
            <span class="close">&times;</span>
          </div>
          <div class="filter-section">
            <div class="date-filter">
              <label>Select Week Period:</label>
              <div class="date-inputs">
                <input type="date" id="startDate" class="date-input">
                <span>to</span>
                <input type="date" id="endDate" class="date-input" disabled>
              </div>
            </div>
          </div>
          <div class="table-container">
            <table id="summaryTable">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Status</th>
                  <th>Ordered Amount</th>
                  <th>Customer Amount</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    this.modal = document.querySelector(".weekly-summary-modal");
    this.startDateInput = document.getElementById("startDate");
    this.endDateInput = document.getElementById("endDate");
    this.summaryTable = document.getElementById("summaryTable");
  }

  setupEventListeners() {
    // Close modal when clicking the close button or outside the modal
    const closeBtn = this.modal.querySelector(".close");
    closeBtn.addEventListener("click", () => this.closeModal());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Update end date and reload data when start date changes
    this.startDateInput.addEventListener("change", () => {
      this.updateEndDate();
      this.loadSummaryData();
    });
  }

  setDefaultDates() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // Adjust to get Monday

    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    this.startDateInput.value = this.formatDate(monday);
    this.endDateInput.value = this.formatDate(sunday);
  }

  updateEndDate() {
    const startDate = new Date(this.startDateInput.value);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    this.endDateInput.value = this.formatDate(endDate);
  }

  formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  async loadSummaryData() {
    try {
      const startDate = this.startDateInput.value;
      const endDate = this.endDateInput.value;

      const { data: summaryData, error } = await supabaseClient
        .from("order_items")
        .select(
          `
          inventory!inner(code_colour, item_status),
          item_name,
          order_id,
          qty
        `
        )
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59")
        .neq("order_item_status", "REMOVED")
        .in("item_group", ["boho", "primrose"]);

      if (error) throw error;

      // Process and aggregate the data
      const aggregatedData = this.aggregateData(summaryData);
      this.updateTable(aggregatedData);
    } catch (error) {
      console.error("Error loading summary data:", error);
      alert("Failed to load summary data. Please try again.");
    }
  }

  aggregateData(data) {
    const aggregated = {};

    data.forEach((item) => {
      const key = `${item.inventory.code_colour}-${item.item_name}-${item.inventory.item_status}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          code: item.inventory.code_colour,
          itemName: item.item_name,
          status: item.inventory.item_status,
          totalQty: 0,
          uniqueOrders: new Set(),
        };
      }

      aggregated[key].totalQty += item.qty;
      aggregated[key].uniqueOrders.add(item.order_id);
    });

    // Convert to array and sort by status
    return Object.values(aggregated).sort((a, b) => {
      const statusOrder = {
        "NEW RELEASE": 1,
        "FULL PRICE": 2,
        "ON SALE": 3,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }

  updateTable(data) {
    const tbody = this.summaryTable.querySelector("tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="no-data">No data available for the selected period</td>
        </tr>
      `;
      return;
    }

    data.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.code}</td>
        <td>${item.itemName}</td>
        <td data-status="${item.status}">${item.status}</td>
        <td>${item.totalQty}</td>
        <td>${item.uniqueOrders.size}</td>
      `;
      tbody.appendChild(row);
    });
  }

  show() {
    this.modal.style.display = "block";
  }

  closeModal() {
    this.modal.style.display = "none";
  }
}

// Initialize the button
document.addEventListener("DOMContentLoaded", () => {
  const addOrderBtn = document.querySelector(".add-wholesale-order");
  if (addOrderBtn) {
    const weeklySummaryBtn = document.createElement("button");
    weeklySummaryBtn.className = "weekly-summary-btn";
    weeklySummaryBtn.innerHTML =
      '<i class="material-icons">assessment</i> Weekly Sales Report';
    weeklySummaryBtn.style.cssText = `
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 14px;
      transition: background-color 0.3s;
    `;

    weeklySummaryBtn.addEventListener("mouseover", () => {
      weeklySummaryBtn.style.backgroundColor = "#45a049";
    });

    weeklySummaryBtn.addEventListener("mouseout", () => {
      weeklySummaryBtn.style.backgroundColor = "#4CAF50";
    });

    addOrderBtn.parentNode.insertBefore(
      weeklySummaryBtn,
      addOrderBtn.nextSibling
    );

    let weeklySummary = null;
    weeklySummaryBtn.addEventListener("click", () => {
      if (!weeklySummary) {
        weeklySummary = new WeeklySummary();
      }
      weeklySummary.show();
    });
  }
});
