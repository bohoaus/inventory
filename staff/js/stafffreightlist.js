// Import Supabase client
const supabase = window.supabaseClient;

class StaffFreightListComponent {
  constructor() {
    console.log("StaffFreightListComponent constructor called");
    this.container = document.getElementById("freightContainer");
  }

  async initialize() {
    console.log("Initializing StaffFreightListComponent");
    if (!this.container) {
      const error = new Error("Container element not found in initialize");
      console.error(error);
      throw error;
    }

    try {
      await this.loadAndDisplayFreight();
    } catch (error) {
      console.error("Error during initialization:", error);
      this.container.innerHTML = `
        <div class="Stafffreightlist-error">
          Error initializing component: ${error.message}
          <br>
          Please try again later or contact support if the problem persists.
        </div>
      `;
      throw error;
    }
  }

  async loadAndDisplayFreight() {
    try {
      // Fetch items with mfg_date
      const { data: items, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .not("mfg_date", "is", null)
        .order("mfg_date", { ascending: false });

      if (error) throw error;

      // Group items by status and cargo
      const groupedItems = this.groupItemsByFreight(items);

      // Create tabs for different statuses
      const tabContainer = document.createElement("div");
      tabContainer.className = "Stafffreightlist-tabs";

      const inTransitTab = this.createTab("In Transit", groupedItems.inTransit);
      const delayedTab = this.createTab("Delayed", groupedItems.delayed);
      const arrivedTab = this.createTab("Arrived", groupedItems.arrived);

      tabContainer.appendChild(inTransitTab);
      tabContainer.appendChild(delayedTab);
      tabContainer.appendChild(arrivedTab);

      // Create content area
      const contentArea = document.createElement("div");
      contentArea.className = "Stafffreightlist-content-area";

      // Clear container and add new elements
      this.container.innerHTML = "";
      this.container.appendChild(tabContainer);
      this.container.appendChild(contentArea);

      // Show initial data and activate first tab
      inTransitTab.classList.add("active");
      this.showTabContent("inTransit", groupedItems.inTransit, contentArea);
    } catch (error) {
      console.error("Error loading freight lists:", error);
      throw error;
    }
  }

  createTab(label, items) {
    const tab = document.createElement("button");
    tab.className = "Stafffreightlist-tab";
    tab.textContent = `${label} (${Object.keys(items).length})`;
    tab.onclick = (e) => {
      document
        .querySelectorAll(".Stafffreightlist-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      this.showTabContent(
        label.toLowerCase().replace(" ", ""),
        items,
        document.querySelector(".Stafffreightlist-content-area")
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
      const key = `${this.formatDateToSydney(item.mfg_date)}_${
        item.item_cargo || "unknown"
      }`;

      if (item.arrive_date) {
        if (!groups.arrived[key]) groups.arrived[key] = [];
        groups.arrived[key].push(item);
      } else if (item.delay_date) {
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
      container.innerHTML =
        '<p class="Stafffreightlist-no-data">No items found</p>';
      return;
    }

    Object.entries(items).forEach(([key, groupItems]) => {
      const [date, cargo] = key.split("_");
      const groupDiv = document.createElement("div");
      groupDiv.className = "Stafffreightlist-group";
      groupDiv.innerHTML = this.generateGroupHeader(date, cargo, groupItems);
      container.appendChild(groupDiv);
    });
  }

  generateGroupHeader(date, cargo, items) {
    const bagAmount = items[0]?.freight_bags
      ? `(${items[0].freight_bags} bags)`
      : "";
    return `
      <div class="Stafffreightlist-group-header">
        <div class="Stafffreightlist-header-main">
          <h3>${date} - ${cargo} ${bagAmount}</h3>
        </div>
        <div class="Stafffreightlist-summary">
          <div class="Stafffreightlist-stats">
            <span>Total Items: ${items.length}</span>
          </div>
          <div class="Stafffreightlist-dates">
            <div class="Stafffreightlist-date">
              <label>Est. Date</label>
              <span>${
                this.formatDateToSydney(items[0].est_date) || "Not Set"
              }</span>
            </div>
            <div class="Stafffreightlist-date ${
              items[0].delay_date ? "delayed" : ""
            }">
              <label>Status</label>
              <span>${
                items[0].delay_date
                  ? `Delayed to ${this.formatDateToSydney(items[0].delay_date)}`
                  : "On Schedule"
              }</span>
            </div>
            <div class="Stafffreightlist-date ${
              items[0].arrive_date ? "arrived" : ""
            }">
              <label>Arrive Date</label>
              <span>${
                this.formatDateToSydney(items[0].arrive_date) || "Pending"
              }</span>
            </div>
          </div>
        </div>
        <div class="Stafffreightlist-buttons">
          <button class="Stafffreightlist-view-btn" onclick="staffFreightList.toggleItemList(this, ${JSON.stringify(
            items
          ).replace(/"/g, "&quot;")})">
            <span class="btn-icon">👁️</span> View List
          </button>
          <button class="Stafffreightlist-view-btn" onclick="staffFreightList.generateFreightListPDF('${date}', '${cargo}', ${JSON.stringify(
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
      <div class="Stafffreightlist-packing-list">
        <table class="Stafffreightlist-table">
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
                <td>${this.escapeHtml(item.code_colour)}</td>
                <td>${this.getBrandInfo(item)}</td>
                <td>${this.escapeHtml(item.item_category)}</td>
                <td>${this.formatPackSize(item.pack_size)}</td>
                <td>${this.formatQuantity(item)}</td>
                <td>${this.escapeHtml(item.item_note)}</td>
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
    if (!item.item_group) return "other";
    const group = item.item_group.toUpperCase();
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
    const qty = item.receive_qty || 0;
    const group = item.item_group?.toUpperCase();
    if (group === "BOHO" || group === "PRIMROSE") {
      return `${qty} packs`;
    }
    return `${qty} pcs`;
  }

  getBrandInfo(item) {
    if (!item.item_group) return "-";
    const group = item.item_group.toUpperCase();

    // Return item_group for BOHO and PRIMROSE
    if (group === "BOHO" || group === "PRIMROSE") {
      return group;
    }

    // Return odm_customer for ODM items
    if (group === "ODM") {
      return item.odm_customer || "-";
    }

    return "-";
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

  toggleItemList(button, items) {
    let itemsDiv = button.nextElementSibling;

    // If the items div doesn't exist yet, create it
    if (!itemsDiv || !itemsDiv.classList.contains("Stafffreightlist-items")) {
      itemsDiv = document.createElement("div");
      itemsDiv.className = "Stafffreightlist-items";
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

  async generateFreightListPDF(date, cargo, items) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("portrait");

      // Add title
      const bagAmount = items[0]?.freight_bags
        ? `(${items[0].freight_bags} bags)`
        : "";
      doc.setFontSize(16);
      doc.text(`Freight List: ${date} - ${cargo} ${bagAmount}`, 20, 20);

      // Add summary info
      doc.setFontSize(12);
      doc.text(`Total Items: ${items.length}`, 20, 30);
      doc.text(
        `Est. Date: ${this.formatDateToSydney(items[0].est_date) || "Not Set"}`,
        20,
        35
      );
      doc.text(
        `Status: ${items[0].delay_date ? "Delayed" : "On Schedule"}`,
        20,
        40
      );
      doc.text(
        `Arrive Date: ${
          this.formatDateToSydney(items[0].arrive_date) || "Pending"
        }`,
        20,
        45
      );

      // Sort items by brand
      const sortedItems = this.sortItemsByBrand(items);

      // Create table
      const tableData = sortedItems.map((item) => [
        item.code_colour || "",
        this.getBrandInfo(item),
        item.item_category || "",
        this.formatPackSize(item.pack_size),
        this.formatQuantity(item),
        item.item_note || "",
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
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
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
            if (brand.includes("BOHO")) {
              data.cell.styles.fillColor = [240, 248, 255]; // Light blue
            } else if (brand.includes("PRIMROSE")) {
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
}

// Initialize when DOM is loaded
const staffFreightList = new StaffFreightListComponent();
window.staffFreightList = staffFreightList;
