class SalesWeeklySale {
  constructor() {
    this.modal = null;
    this.initialize();
  }

  initialize() {
    const noteBoard = document.querySelector(".note-board");
    if (noteBoard) {
      const button = document.createElement("button");
      button.className = "salesweeklysale-button";
      button.textContent = "View Weekly Sales";

      const soldoutButton = document.querySelector(".salessoldout-button");
      if (soldoutButton) {
        soldoutButton.parentNode.insertBefore(
          button,
          soldoutButton.nextSibling
        );
      } else {
        noteBoard.parentNode.insertBefore(button, noteBoard);
      }

      button.addEventListener("click", () => this.showWeeklySaleModal());
    }
  }

  async showWeeklySaleModal() {
    if (this.modal) return;

    this.modal = document.createElement("div");
    this.modal.className = "salesweeklysale-modal";
    this.modal.innerHTML = `
      <div class="salesweeklysale-content">
        <div class="modal-header">
          <h2>Weekly Sales Summary</h2>
          <div class="salesweeklysale-actions">
            <button class="salesweeklysale-export">Export PDF</button>
            <span class="close">&times;</span>
          </div>
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
                  <th>Item Name</th>
                  <th>oStatus</th>
                  <th>Ordered Amount (pks/pcs)</th>
                  <th>Ordered Customer Amount</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.setupEventListeners();

    // Set default to current week
    const currentWeekStart = this.getCurrentWeekStart();
    const weekStart = this.modal.querySelector("#weekStart");
    weekStart.value = currentWeekStart.toISOString().split("T")[0];

    // Trigger initial load
    this.handleDateChange(weekStart.value);
  }

  getCurrentWeekStart() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = now.getDate() - currentDay;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  setupEventListeners() {
    const closeBtn = this.modal.querySelector(".close");
    closeBtn.onclick = () => {
      this.modal.remove();
      this.modal = null;
    };

    const weekStart = this.modal.querySelector("#weekStart");
    weekStart.addEventListener("change", () =>
      this.handleDateChange(weekStart.value)
    );

    const exportBtn = this.modal.querySelector(".salesweeklysale-export");
    exportBtn.addEventListener("click", () => {
      const weekStart = this.modal.querySelector("#weekStart");
      const weekEnd = this.modal.querySelector("#weekEnd");
      const weekLabel = `${weekStart.value} to ${weekEnd.value}`;
      const tbody = this.modal.querySelector("#summaryTable tbody");
      const items = this.getTableData();
      this.exportToPDF(items, weekLabel);
    });

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.modal.remove();
        this.modal = null;
      }
    });
  }

  async handleDateChange(startDate) {
    if (!startDate) return;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    // Update end date display
    const weekEnd = this.modal.querySelector("#weekEnd");
    weekEnd.value = end.toISOString().split("T")[0];

    // Fetch and display data
    await this.fetchAndDisplayData(start, end);
  }

  async fetchAndDisplayData(startDate, endDate) {
    try {
      // First fetch wholesale orders in the date range
      const { data: orders, error: ordersError } = await supabaseClient
        .from("orders")
        .select("id, Customer")
        .eq("orderPO", "WHOLESALE")
        .not("oStatus", "eq", "CANCELLED")
        .gte("Created", startDate.toISOString())
        .lte("Created", endDate.toISOString());

      if (ordersError) {
        console.error("Orders fetch error:", ordersError);
        throw ordersError;
      }

      if (!orders || orders.length === 0) {
        this.displayNoData();
        return;
      }

      // Then fetch order items with inventory oStatus
      const orderIds = orders.map((order) => order.id);
      const { data: items, error: itemsError } = await supabaseClient
        .from("orderItems")
        .select(
          `
          itemCode,
          iPack,
          iUnit,
          iStatus,
          orderID,
          inventory:Code_Colour(
            Status
          )
        `
        )
        .eq("iStatus", "ACTIVE")
        .in("orderID", orderIds)
        .order("itemCode", { ascending: true });

      if (itemsError) {
        console.error("Items fetch error:", itemsError);
        throw itemsError;
      }

      if (!items || items.length === 0) {
        this.displayNoData();
        return;
      }

      const orderCustomerMap = orders.reduce((acc, order) => {
        acc[order.id] = order.Customer;
        return acc;
      }, {});

      this.displayData(items, orderCustomerMap);
    } catch (error) {
      console.error("Error details:", error);
      this.displayError();
    }
  }

  displayNoData() {
    const tbody = this.modal.querySelector("#summaryTable tbody");
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center;">No wholesale orders found for this period</td>
      </tr>
    `;
  }

  displayError() {
    const tbody = this.modal.querySelector("#summaryTable tbody");
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #dc3545;">
          Error loading data. Please check console and try again.
        </td>
      </tr>
    `;
  }

  displayData(items, orderCustomerMap) {
    const tbody = this.modal.querySelector("#summaryTable tbody");
    tbody.innerHTML = "";

    const itemSummary = this.summarizeItems(items, orderCustomerMap);

    Object.entries(itemSummary)
      .sort(([, a], [, b]) => {
        // First sort by oStatus priority
        const oStatusDiff =
          this.getoStatusPriority(a.inventoryoStatus) -
          this.getoStatusPriority(b.inventoryoStatus);
        if (oStatusDiff !== 0) return oStatusDiff;
        // Then by total pieces
        return b.iUnit - a.iUnit;
      })
      .forEach(([itemCode, item]) => {
        const row = document.createElement("tr");
        row.className = `oStatus-${this.getoStatusClass(item.inventoryoStatus)}`;
        row.innerHTML = `
          <td>${itemCode}</td>
          <td>${item.name}</td>
          <td>${item.inventoryoStatus || "N/A"}</td>
          <td>${item.orderQty} / ${item.iUnit}</td>
          <td>${item.customers.size}</td>
        `;
        tbody.appendChild(row);
      });
  }

  summarizeItems(items, orderCustomerMap) {
    const summary = {};

    items.forEach((item) => {
      if (!summary[item.itemCode]) {
        summary[item.itemCode] = {
          name: item.itemCode,
          inventoryoStatus: item.inventory?.item_oStatus,
          orderQty: 0,
          iUnit: 0,
          customers: new Set(),
        };
      }
      summary[item.itemCode].orderQty += item.iPack || 0;
      summary[item.itemCode].iUnit += item.iUnit || 0;
      summary[item.itemCode].customers.add(orderCustomerMap[item.orderID]);
    });

    return summary;
  }

  getoStatusClass(oStatus) {
    switch (oStatus?.toUpperCase()) {
      case "NEW RELEASE":
        return "new-release";
      case "FULL PRICE":
        return "full-price";
      case "ON SALE":
        return "on-sale";
      default:
        return "default";
    }
  }

  getoStatusPriority(oStatus) {
    const priorities = {
      "NEW RELEASE": 1,
      "FULL PRICE": 2,
      "ON SALE": 3,
    };
    return priorities[oStatus?.toUpperCase()] || 999;
  }

  getTableData() {
    const rows = this.modal.querySelectorAll("#summaryTable tbody tr");
    const data = {};

    rows.forEach((row) => {
      const cells = row.cells;
      const itemName = cells[0].textContent;
      data[itemName] = {
        name: cells[1].textContent,
        inventoryoStatus: cells[2].textContent,
        orderInfo: cells[3].textContent,
        customers: cells[4].textContent,
      };
    });

    return data;
  }

  async exportToPDF(items, weekLabel) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("portrait");

      // Add title
      doc.setFontSize(16);
      doc.text(`Weekly Sales Summary - ${weekLabel}`, 14, 20);

      // Add date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-AU")}`, 14, 30);

      // Create table data
      const tableData = Object.entries(items)
        .sort(([, a], [, b]) => {
          const oStatusDiff =
            this.getoStatusPriority(a.inventoryoStatus) -
            this.getoStatusPriority(b.inventoryoStatus);
          if (oStatusDiff !== 0) return oStatusDiff;
          const [aQty] = a.orderInfo.split(" / ").map(Number);
          const [bQty] = b.orderInfo.split(" / ").map(Number);
          return bQty - aQty;
        })
        .map(([itemCode, item]) => [
          itemCode,
          item.name,
          item.inventoryoStatus,
          item.orderInfo,
          item.customers,
        ]);

      // Add table with adjusted column widths for portrait mode
      doc.autoTable({
        startY: 40,
        head: [
          [
            "Item Code",
            "Name",
            "oStatus",
            "Ordered Amount (pks/pcs)",
            "Customers",
          ],
        ],
        body: tableData,
        theme: "plain",
        styles: {
          fontSize: 8,
          textColor: [0, 0, 0],
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: false,
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25 },
        },
        margin: { left: 14, right: 14 },
      });

      // Save PDF
      doc.save(
        `weekly-sales-${weekLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SalesWeeklySale();
});
