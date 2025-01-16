class SalesODMDispatch {
  constructor() {
    this.modal = null;
    this.initialize();
  }

  initialize() {
    const odmdispatchBtn = document.getElementById("viewSalesODMDispatchBtn");
    if (odmdispatchBtn) {
      odmdispatchBtn.addEventListener("click", () =>
        this.showODMDispatchModal()
      );
    } else {
      console.error("ODM dispatch button not found");
    }
  }

  async showODMDispatchModal() {
    try {
      const { data: items, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq("item_group", "ODM")
        .order("mfg_date", { ascending: false });

      if (error) throw error;

      // Group items by mfg_date and cargo
      const groupedItems = this.groupItemsByDispatch(items);

      if (Object.keys(groupedItems).length === 0) {
        alert("No ODM items found");
        return;
      }

      this.modal = document.createElement("div");
      this.modal.className = "salesodmdispatch-modal";
      this.modal.innerHTML = `
        <div class="salesodmdispatch-content">
          <div class="salesodmdispatch-header">
            <h2>ODM Dispatch Information</h2>
            <button class="salesodmdispatch-close">&times;</button>
          </div>
          ${this.renderDispatchGroups(groupedItems)}
        </div>
      `;

      this.setupEventListeners();
      document.body.appendChild(this.modal);
    } catch (error) {
      console.error("Error showing ODM dispatch info:", error);
    }
  }

  groupItemsByDispatch(items) {
    const groups = {};
    items.forEach((item) => {
      if (!item.mfg_date || !item.item_cargo) return;

      const key = `${item.mfg_date}_${item.item_cargo}`;
      if (!groups[key]) {
        groups[key] = {
          mfg_date: item.mfg_date,
          cargo: item.item_cargo,
          arrive_date: item.arrive_date,
          items: [],
          customerCounts: {},
        };
      }
      groups[key].items.push(item);

      // Count items per customer
      const customer = item.odm_customer || "Unknown";
      groups[key].customerCounts[customer] =
        (groups[key].customerCounts[customer] || 0) + 1;
    });
    return groups;
  }

  renderDispatchGroups(groups) {
    return Object.values(groups)
      .map(
        (group) => `
        <div class="salesodmdispatch-group">
          <div class="salesodmdispatch-group-header">
            <div class="salesodmdispatch-header-main">
              <h3>${this.formatDateToSydney(group.mfg_date)} - ${
          group.cargo
        }</h3>
            </div>
            <div class="salesodmdispatch-summary">
              <div class="salesodmdispatch-info">
                <span>Customers: ${
                  Object.keys(group.customerCounts).length
                }</span>
                <span> | </span>
                <span>Total Items: ${group.items.length}</span>
                <span> | </span>
                <span>Arrival: ${
                  group.arrive_date
                    ? this.formatDateToSydney(group.arrive_date)
                    : "Not Arrived"
                }</span>
              </div>
              <div class="salesodmdispatch-customer-counts">
                ${Object.entries(group.customerCounts)
                  .map(
                    ([customer, count]) => `
                    <div class="customer-count">
                      <span class="customer-name">${customer}:</span>
                      <span class="count">${count} items</span>
                    </div>
                  `
                  )
                  .join("")}
              </div>
            </div>
            <div class="salesodmdispatch-buttons">
              <button class="salesodmdispatch-view-btn" onclick="salesODMDispatch.toggleItemList(this, ${JSON.stringify(
                group.items
              ).replace(/"/g, "&quot;")})">
                <i class="fas fa-eye"></i>
                <span>View List</span>
              </button>
              <button class="salesodmdispatch-export-btn" onclick="salesODMDispatch.exportToPDF(${JSON.stringify(
                {
                  items: group.items,
                  mfg_date: group.mfg_date,
                  cargo: group.cargo,
                  customerCounts: group.customerCounts,
                  arrive_date: group.arrive_date,
                }
              ).replace(/"/g, "&quot;")})">
                <i class="fas fa-file-pdf"></i>
                <span>Export PDF</span>
              </button>
            </div>
          </div>
          <div class="salesodmdispatch-items"></div>
        </div>
      `
      )
      .join("");
  }

  async exportToPDF(groupData) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("ODM Dispatch Information", 14, 20);

      // Add group info
      doc.setFontSize(12);
      doc.text(
        `Manufacturing Date: ${this.formatDateToSydney(groupData.mfg_date)}`,
        14,
        30
      );
      doc.text(`Cargo: ${groupData.cargo}`, 14, 37);
      doc.text(
        `Total Customers: ${Object.keys(groupData.customerCounts).length}`,
        14,
        44
      );
      doc.text(
        `Arrival Date: ${
          groupData.arrive_date
            ? this.formatDateToSydney(groupData.arrive_date)
            : "Not Arrived"
        }`,
        14,
        51
      );

      // Add customer counts
      let yPos = 58;
      doc.text("Customer Summary:", 14, yPos);
      yPos += 7;
      Object.entries(groupData.customerCounts).forEach(([customer, count]) => {
        doc.text(`${customer}: ${count} items`, 20, yPos);
        yPos += 7;
      });

      // Create table data
      const tableData = groupData.items.map((item) => [
        item.code_colour || "N/A",
        item.odm_ppo || "N/A",
        item.odm_customer || "N/A",
        item.item_status || "N/A",
        this.formatDateToSydney(item.updated_at),
      ]);

      // Add table
      doc.autoTable({
        startY: yPos + 5,
        head: [["Code", "PPO", "Customer", "Status", "Last Updated"]],
        body: tableData,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 3,
          textColor: [0, 0, 0],
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 40 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
        },
      });

      // Generate filename
      const filename = `ODM_Dispatch_${
        groupData.mfg_date
      }_${groupData.cargo.replace(/[^a-z0-9]/gi, "_")}.pdf`;

      // Save PDF
      doc.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  }

  toggleItemList(button, items) {
    const itemsDiv = button
      .closest(".salesodmdispatch-group")
      .querySelector(".salesodmdispatch-items");
    const isHidden =
      itemsDiv.style.display === "none" || !itemsDiv.style.display;

    if (isHidden) {
      itemsDiv.innerHTML = this.generateItemsTable(items);
      itemsDiv.style.display = "block";
      button.innerHTML =
        '<i class="fas fa-eye-slash"></i><span>Hide List</span>';
    } else {
      itemsDiv.style.display = "none";
      button.innerHTML = '<i class="fas fa-eye"></i><span>View List</span>';
    }
  }

  generateItemsTable(items) {
    return `
      <table class="salesodmdispatch-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>PPO</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr>
              <td>${item.code_colour || "N/A"}</td>
              <td>${item.odm_ppo || "N/A"}</td>
              <td>${item.odm_customer || "N/A"}</td>
              <td>${item.item_status || "N/A"}</td>
              <td>${this.formatDateToSydney(item.updated_at)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  formatDateToSydney(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  setupEventListeners() {
    const closeBtn = this.modal.querySelector(".salesodmdispatch-close");
    closeBtn.onclick = () => this.modal.remove();

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.modal.remove();
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.salesODMDispatch = new SalesODMDispatch();
});
