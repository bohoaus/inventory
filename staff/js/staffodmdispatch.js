class StaffODMDispatch {
  constructor() {
    this.modal = null;
    this.initialize();
  }

  initialize() {
    const odmdispatchBtn = document.getElementById("viewODMDispatchBtn");
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
      this.modal.className = "Staffodmdispatch-modal";
      this.modal.innerHTML = `
        <div class="Staffodmdispatch-content">
          <div class="Staffodmdispatch-header">
            <h2>ODM Dispatch Information</h2>
            <button class="Staffodmdispatch-close">&times;</button>
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
        <div class="Staffodmdispatch-group">
          <div class="Staffodmdispatch-group-header">
            <div class="Staffodmdispatch-header-main">
              <h3>${this.formatDateToSydney(group.mfg_date)} - ${
          group.cargo
        }</h3>
            </div>
            <div class="Staffodmdispatch-summary">
              <div class="Staffodmdispatch-info">
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
              <div class="Staffodmdispatch-customer-counts">
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
            <div class="Staffodmdispatch-buttons">
              <button class="Staffodmdispatch-view-btn" onclick="staffODMDispatch.toggleItemList(this, ${JSON.stringify(
                group.items
              ).replace(/"/g, "&quot;")})">
                <i class="fas fa-eye"></i>
                <span>View List</span>
              </button>
              <button class="Staffodmdispatch-export-btn" onclick="staffODMDispatch.exportToPDF(${JSON.stringify(
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
          <div class="Staffodmdispatch-items"></div>
        </div>
      `
      )
      .join("");
  }

  async exportToPDF(groupData) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Add title with black text
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0); // Black text
      doc.text("ODM Dispatch Information", 14, 20);

      // Add group info with black text
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

      // Add table with black and white theme
      doc.autoTable({
        startY: yPos + 5,
        head: [["Code", "PPO", "Customer", "Status", "Last Updated"]],
        body: tableData,
        theme: "plain", // Use plain theme for black and white
        styles: {
          fontSize: 10,
          cellPadding: 3,
          textColor: [0, 0, 0], // Black text
          lineColor: [200, 200, 200], // Light gray borders
          lineWidth: 0.1, // Thin borders
        },
        headStyles: {
          fillColor: [255, 255, 255], // White background
          textColor: [0, 0, 0], // Black text
          fontStyle: "bold",
          lineColor: [200, 200, 200], // Light gray borders
          lineWidth: 0.1, // Thin borders
        },
        columnStyles: {
          0: { cellWidth: 35 }, // Code
          1: { cellWidth: 35 }, // PPO
          2: { cellWidth: 40 }, // Customer
          3: { cellWidth: 35 }, // Status
          4: { cellWidth: 35 }, // Last Updated
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
      .closest(".Staffodmdispatch-group")
      .querySelector(".Staffodmdispatch-items");
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
      <table class="Staffodmdispatch-table">
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
    const closeBtn = this.modal.querySelector(".Staffodmdispatch-close");
    closeBtn.onclick = () => this.modal.remove();

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.modal.remove();
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.staffODMDispatch = new StaffODMDispatch();
});
