class SalesFreightList {
  constructor() {
    this.modal = null;
  }

  async showFreightModal() {
    try {
      // Fetch items with mfgDate
      const { data: items, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .not("mfgDate", "is", null)
        .order("mfgDate", { ascending: false });

      if (error) throw error;

      // Group items by status and cargo
      const groupedItems = this.groupItemsByFreight(items);

      // Create modal
      const modal = document.createElement("div");
      modal.className = "sale-freight-modal";
      modal.style.display = "block";

      const content = document.createElement("div");
      content.className = "sale-freight-content";

      // Create header
      const header = document.createElement("div");
      header.className = "sale-freight-header";

      // Add title
      const title = document.createElement("h2");
      title.textContent = "Freight Lists";
      title.style.margin = "0";

      // Add close button
      const closeBtn = document.createElement("button");
      closeBtn.className = "sale-freight-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.onclick = () => modal.remove();

      header.appendChild(title);
      header.appendChild(closeBtn);

      // Create body
      const body = document.createElement("div");
      body.className = "sale-freight-body";

      // Create tabs for different statuses
      const tabContainer = document.createElement("div");
      tabContainer.className = "sale-freight-tabs";

      const inTransitTab = this.createTab("In Transit", groupedItems.inTransit);
      const delayedTab = this.createTab("Delayed", groupedItems.delayed);
      const arrivedTab = this.createTab("Arrived", groupedItems.arrived);

      tabContainer.appendChild(inTransitTab);
      tabContainer.appendChild(delayedTab);
      tabContainer.appendChild(arrivedTab);

      // Add tabs and initial content to body
      body.appendChild(tabContainer);
      this.showTabContent("In Transit", groupedItems.inTransit, body);

      // Assemble modal
      content.appendChild(header);
      content.appendChild(body);
      modal.appendChild(content);
      document.body.appendChild(modal);

      // Add click event for closing when clicking outside
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

      this.modal = modal;
    } catch (error) {
      console.error("Error showing freight modal:", error);
    }
  }

  createTab(label, items) {
    const tab = document.createElement("button");
    tab.className = "sale-freight-tab";
    tab.textContent = `${label} (${Object.keys(items).length})`;
    tab.onclick = (e) => {
      document
        .querySelectorAll(".sale-freight-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      this.showTabContent(
        label.toLowerCase().replace(" ", ""),
        items,
        document.querySelector(".sale-freight-content-area")
      );
    };
    return tab;
  }

  groupItemsByFreight(items) {
    const groups = {
      inTransit: {},
      delayed: {},
      arrived: {},
    };

    items.forEach((item) => {
      const key = `${this.formatDateToSydney(item.mfgDate)}_${
        item.Cargo || "unknown"
      }`;

      if (item.ArriveDate) {
        if (!groups.arrived[key]) groups.arrived[key] = [];
        groups.arrived[key].push(item);
      } else if (item.DelayDate) {
        if (!groups.delayed[key]) groups.delayed[key] = [];
        groups.delayed[key].push(item);
      } else {
        if (!groups.inTransit[key]) groups.inTransit[key] = [];
        groups.inTransit[key].push(item);
      }
    });

    return groups;
  }

  showTabContent(status, items, container) {
    container.innerHTML = "";

    if (Object.keys(items).length === 0) {
      container.innerHTML = '<p class="no-data">No items found</p>';
      return;
    }

    Object.entries(items).forEach(([key, groupItems]) => {
      const [date, cargo] = key.split("_");
      const groupDiv = document.createElement("div");
      groupDiv.className = "sale-freight-group";
      groupDiv.innerHTML = this.generateGroupHeader(date, cargo, groupItems);
      container.appendChild(groupDiv);
    });
  }

  generateGroupHeader(date, cargo, items) {
    const bagAmount = items[0]?.FreightBags
      ? `(${items[0].FreightBags} bags)`
      : "";
    return `
      <div class="sale-freight-group-header">
        <div class="sale-freight-header-main">
          <h3>${date} - ${cargo} ${bagAmount}</h3>
        </div>
        <div class="sale-freight-summary">
          <div class="sale-freight-stats">
            <span>Total Items: ${items.length}</span>
          </div>
          <div class="sale-freight-dates">
            <div class="sale-freight-date">
              <label>Est. Date</label>
              <span>${
                this.formatDateToSydney(items[0].estDate) || "Not Set"
              }</span>
            </div>
            <div class="sale-freight-date ${
              items[0].DelayDate ? "delayed" : ""
            }">
              <label>Status</label>
              <span>${
                items[0].DelayDate
                  ? `Delayed to ${this.formatDateToSydney(items[0].DelayDate)}`
                  : "On Schedule"
              }</span>
            </div>
            <div class="sale-freight-date ${
              items[0].ArriveDate ? "arrived" : ""
            }">
              <label>Arrive Date</label>
              <span>${
                this.formatDateToSydney(items[0].ArriveDate) || "Pending"
              }</span>
            </div>
          </div>
        </div>
        <div class="sale-freight-buttons">
          <button class="sale-view-list-btn" onclick="salesFreightList.toggleItemList(this, ${JSON.stringify(
            items
          ).replace(/"/g, "&quot;")})">
            <span class="btn-icon">👁️</span> View List
          </button>
          <button class="sale-export-btn" onclick="salesFreightList.generateFreightListPDF('${date}', '${cargo}', ${JSON.stringify(
      items
    ).replace(/"/g, "&quot;")})">
            <span class="btn-icon">📄</span> Export PDF
          </button>
        </div>
      </div>
    `;
  }

  generatePackingListDetails(items) {
    // Sort items by brand priority (BOHO, PRIMROSE, then others)
    const sortedItems = this.sortItemsByBrand(items);

    return `
      <div class="sale-packing-list">
        <table class="sale-freight-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Pack Size</th>
              <th>Receive Qty</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${sortedItems
              .map(
                (item) => `
              <tr class="brand-${this.getBrandClass(item)}">
                <td>${this.escapeHtml(item.Code_Colour)}</td>
                <td>${this.getBrandInfo(item)}</td>
                <td>${this.escapeHtml(item.Category)}</td>
                <td>${this.formatPackSize(item.Pack_Size)}</td>
                <td>${this.formatQuantity(item)}</td>
                <td>${this.escapeHtml(item.Item_Note)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  sortItemsByBrand(items) {
    return [...items].sort((a, b) => {
      const brandA = this.getBrandInfo(a).toUpperCase();
      const brandB = this.getBrandInfo(b).toUpperCase();

      if (brandA === "BOHO") return -1;
      if (brandB === "BOHO") return 1;
      if (brandA === "PRIMROSE") return -1;
      if (brandB === "PRIMROSE") return 1;
      return brandA.localeCompare(brandB);
    });
  }

  getBrandClass(item) {
    if (!item.BrandGroup) return "other";
    const group = item.BrandGroup.toUpperCase();
    if (group === "BOHO") return "boho";
    if (group === "PRIMROSE") return "primrose";
    return "other";
  }

  formatPackSize(packSize) {
    if (!packSize) return "-";
    try {
      const sizes =
        typeof packSize === "string" ? JSON.parse(packSize) : packSize;
      if (
        typeof sizes !== "object" ||
        !sizes ||
        Object.keys(sizes).length === 0
      )
        return "-";
      return Object.entries(sizes)
        .map(([size, qty]) => `${size}: ${qty}`)
        .join(", ");
    } catch (error) {
      console.error("Error formatting pack size:", error);
      return "-";
    }
  }

  formatQuantity(item) {
    const qty = item.Qty || 0;
    const group = item.BrandGroup?.toUpperCase();
    if (group === "BOHO" || group === "PRIMROSE") {
      return `${qty} packs`;
    }
    return `${qty} pcs`;
  }

  getBrandInfo(item) {
    if (!item.BrandGroup) return "-";
    const group = item.BrandGroup.toUpperCase();

    // Return BrandGroup for BOHO and PRIMROSE
    if (group === "BOHO" || group === "PRIMROSE") {
      return group;
    }

    // Return odmCustomer for ODM items
    return item.odmCustomer || "-";
  }

  getItemStatus(item) {
    if (item.ArriveDate) return "arrived";
    if (item.DelayDate) return "delayed";
    return "on-schedule";
  }

  formatDateToSydney(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
    });
  }

  escapeHtml(unsafe) {
    return unsafe
      ? unsafe
          .toString()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      : "";
  }

  async showDetailModal(date, cargo, items) {
    const modal = document.createElement("div");
    modal.className = "sale-detail-modal";
    modal.style.display = "block";

    const content = document.createElement("div");
    content.className = "sale-detail-content";

    const bagAmount = items[0]?.FreightBags
      ? `(${items[0].FreightBags} bags)`
      : "";
    content.innerHTML = `
      <div class="sale-detail-header">
        <h2>Packing List Details</h2>
        <span class="sale-detail-close">&times;</span>
      </div>
      <div class="sale-detail-info">
        <p>Manufacturing Date: ${date}</p>
        <p>Cargo Reference: ${cargo} ${bagAmount}</p>
        <p>Total Items: ${items.length}</p>
      </div>
      ${this.generatePackingListDetails(items)}
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Add close button functionality
    const closeBtn = modal.querySelector(".sale-detail-close");
    closeBtn.onclick = () => modal.remove();
  }

  async generateFreightListPDF(date, cargo, items) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("portrait"); // Changed to portrait

      // Add title
      const bagAmount = items[0]?.FreightBags
        ? `(${items[0].FreightBags} bags)`
        : "";
      doc.setFontSize(16);
      doc.text(`Freight List: ${date} - ${cargo} ${bagAmount}`, 20, 20);

      // Add summary info
      doc.setFontSize(12);
      doc.text(`Total Items: ${items.length}`, 20, 30);
      doc.text(
        `Est. Date: ${this.formatDateToSydney(items[0].estDate) || "Not Set"}`,
        20,
        35
      );
      doc.text(
        `Status: ${items[0].DelayDate ? "Delayed" : "On Schedule"}`,
        20,
        40
      );
      doc.text(
        `Arrive Date: ${
          this.formatDateToSydney(items[0].ArriveDate) || "Pending"
        }`,
        20,
        45
      );

      // Sort items by brand
      const sortedItems = this.sortItemsByBrand(items);

      // Create table
      const tableData = sortedItems.map((item) => [
        item.Code_Colour || "",
        this.getBrandInfo(item),
        item.Category || "",
        this.formatPackSize(item.Pack_Size),
        this.formatQuantity(item),
        item.Item_Note || "",
      ]);

      doc.autoTable({
        startY: 55,
        head: [
          ["Code", "Brand", "Category", "Pack Size", "Receive Qty", "Notes"],
        ],
        body: tableData,
        theme: "plain",
        styles: {
          fontSize: 8,
          lineColor: [200, 200, 200], // Light gray borders
          lineWidth: 0.1, // Thin borders
        },
        headStyles: {
          fillColor: false,
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Code
          1: { cellWidth: 20 }, // Brand
          2: { cellWidth: 25 }, // Category
          3: { cellWidth: 30 }, // Pack Size
          4: { cellWidth: 20 }, // Receive Qty
          5: { cellWidth: "auto" }, // Notes
        },
        didParseCell: function (data) {
          // Add light background colors for different brands
          if (data.row.index >= 0) {
            // Skip header row
            const brand = data.row.cells[1]?.text || ""; // Brand column
            if (brand === "BOHO") {
              data.cell.styles.fillColor = [240, 248, 255]; // Light blue
            } else if (brand === "PRIMROSE") {
              data.cell.styles.fillColor = [255, 240, 245]; // Light pink
            } else {
              data.cell.styles.fillColor = [250, 250, 250]; // Light gray
            }
          }
        },
      });

      // Save PDF
      doc.save(`freight-list-${date}-${cargo}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }

  toggleItemList(button, items) {
    let itemsDiv = button.nextElementSibling;

    // If the items div doesn't exist yet, create it
    if (!itemsDiv || !itemsDiv.classList.contains("sale-freight-items")) {
      itemsDiv = document.createElement("div");
      itemsDiv.className = "sale-freight-items";
      itemsDiv.style.display = "none";
      button.parentNode.insertBefore(itemsDiv, button.nextSibling);
    }

    const isHidden = itemsDiv.style.display === "none";

    if (isHidden && !itemsDiv.innerHTML) {
      // Only generate the table content if it hasn't been generated yet
      itemsDiv.innerHTML = this.generatePackingListDetails(items);
    }

    itemsDiv.style.display = isHidden ? "block" : "none";
    button.innerHTML = isHidden
      ? '<span class="btn-icon">👁️</span> Hide List'
      : '<span class="btn-icon">👁️</span> View List';
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Create button and add it above note board
  const noteBoard = document.querySelector(".note-board");
  if (noteBoard) {
    const button = document.createElement("button");
    button.className = "sale-freight-button";
    button.textContent = "View Upcoming Freight";
    noteBoard.parentNode.insertBefore(button, noteBoard);

    // Initialize freight list
    const freightList = new SalesFreightList();
    button.addEventListener("click", () => freightList.showFreightModal());
  }
});

const salesFreightList = new SalesFreightList();
window.salesFreightList = salesFreightList;
