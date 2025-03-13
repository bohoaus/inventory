class ViewItem {
  constructor() {
    this.modal = null;
  }

  async showViewModal(itemId) {
    try {
      // Fetch item data
      const { data: item, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq("id", itemId)
        .single();

      if (error) throw error;

      // Create modal
      const modal = document.createElement("div");
      modal.className = "modal";

      const content = document.createElement("div");
      content.className = "modal-content";

      // Add close button
      const closeBtn = document.createElement("span");
      closeBtn.className = "close";
      closeBtn.innerHTML = "&times;";
      closeBtn.onclick = () => this.closeModal();

      // Add title
      const title = document.createElement("h2");
      title.textContent = `Item Details - ${item.code_colour}`;

      // Create content based on item type
      const detailsContent = this.createDetailsContent(item);

      // Append elements
      content.appendChild(closeBtn);
      content.appendChild(title);
      content.appendChild(detailsContent);
      modal.appendChild(content);

      // Add to document
      document.body.appendChild(modal);
      this.modal = modal;

      // Close modal when clicking outside
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    } catch (error) {
      console.error("Error viewing item:", error);
      alert("Error loading item details");
    }
  }

  createDetailsContent(item) {
    const container = document.createElement("div");
    container.className = "item-details-container";

    // Debug logging
    console.log("Item data:", {
      group: item.item_group,
      packSize: item.pack_size,
      repeatItem: item.repeat_item,
    });

    const isWholesale = ["BOHO", "PRIMROSE"].includes(
      item.item_group?.toUpperCase()
    );

    if (isWholesale) {
      container.innerHTML = this.createWholesaleDetails(item);
    } else {
      container.innerHTML = this.createOdmDetails(item);
    }

    return container;
  }

  createWholesaleDetails(item) {
    return `
        <div class="details-grid">
            <div class="detail-section">
                <h3>Production Information:</h3>
                <div class="detail-row">
                    <span class="label">Code:</span>
                    <span style="color: blue;" class="value">${item.code_colour || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Item Name:</span>
                    <span class="value">${item.item_name || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Category:</span>
                    <span class="value">${item.item_category || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Location:</span>
                    <span class="value">${item.item_location || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value status-${item.item_status?.toLowerCase()}">${
      item.item_status || "-"
    }</span>
                </div>
                <div class="detail-row">
                    <span class="label">Colour:</span>
                    <span class="value">${item.scolour || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Fabric:</span>
                    <span class="value">${item.sfabric || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Factory:</span>
                    <span class="value">${item.sfactory || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Country:</span>
                    <span class="value">${item.scountry || "-"}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Stock Information:</h3>
                <div class="detail-row">
                    <span class="label">Stock Quantity:</span>
                    <span class="value">${item.stock_qty || "0"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Receive Quantity:</span>
                    <span class="value">${item.receive_qty || "0"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Pack Unit:</span>
                    <span class="value">${item.pack_unit || "0"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Pack Size:</span>
                    <span class="value">${this.formatPackSize(
                      item.pack_size
                    )}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Dates:</h3>
                <div class="detail-row">
                    <span class="label">Release Date:</span>
                    <span style="color: blue;" class="value">${new Date(this.formatDate(item.release_date).getDate()).toDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Soldout Date:</span>
                    <span style="color: red;" class="value">${new Date(this.formatDate(item.soldout_date)).toDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Manufacture Date:</span>
                    <span class="value">${new Date(this.formatDate(item.mfg_date)).toDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Estimated Date:</span>
                    <span class="value">${new Date(this.formatDate(item.est_date)).toDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Arrive Date:</span>
                    <span class="value">${new Date(this.formatDate(item.arrive_date)).toDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Delay Date:</span>
                    <span class="value">${this.formatDate(
                      item.delay_date
                    )}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Created:</span>
                    <span class="value">${this.formatDate(
                      item.created_at
                    )}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Updated:</span>
                    <span class="value">${this.formatDate(
                      item.updated_at
                    )}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Item Aging:</span>
                    <span class="value">${item.item_aging || "0"}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Logistics Information:</h3>
                <div class="detail-row">
                    <span class="label">Cargo:</span>
                    <span class="value">${item.item_cargo || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Repeat Item:</span>
                    <span class="value">${this.formatRepeatItem(
                      item.repeat_item
                    )}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Notes:</h3>
                <div class="detail-row">
                    <span class="label">Note:</span>
                    <span class="value">${item.item_note || "-"}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Sales Info:</h3>
                <div class="detail-row">
                    <span class="label">WSP:</span>
                    <span class="value">${item.swsp  || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">WSP2:</span>
                    <span class="value">${item.swsp2 || "-"}</span>
                </div>
            </div>
        </div>
    `;
  }

  createOdmDetails(item) {
    return `
        <div class="details-grid">
            <div class="detail-section">
                <h3>Production Information:</h3>
                <div class="detail-row">
                    <span class="label">Code:</span>
                    <span class="value">${item.code_colour || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Item Name:</span>
                    <span class="value">${item.item_name || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Category:</span>
                    <span class="value">${item.item_category || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Colour:</span>
                    <span class="value">${item.scolour || "0"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Fabric:</span>
                    <span class="value">${item.sfabric || "0"}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Stock Information:</h3>
                <div class="detail-row">
                    <span class="label">Stock Quantity:</span>
                    <span class="value">${item.stock_qty || "0"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Receive Quantity:</span>
                    <span class="value">${item.receive_qty || "0"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Pack Size:</span>
                    <span class="value">${this.formatPackSize(
                      item.pack_size
                    )}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Delay Date:</span>
                    <span class="value">${this.formatDate(
                      item.delay_date
                    )}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>ODM Information:</h3>
                <div class="detail-row">
                    <span class="label">ODM PPO:</span>
                    <span class="value">${item.odm_ppo || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">ODM Customer:</span>
                    <span class="value">${item.odm_customer || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Cargo:</span>
                    <span class="value">${item.item_cargo || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Factory:</span>
                    <span class="value">${item.sfactory || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Country:</span>
                    <span class="value">${item.scountry || "-"}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Dates:</h3>
                <div class="detail-row">
                    <span class="label">Manufacture Date:</span>
                    <span class="value">${this.formatDate(item.mfg_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Estimated Date:</span>
                    <span class="value">${this.formatDate(item.est_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Arrive Date:</span>
                    <span class="value">${this.formatDate(
                      item.arrive_date
                    )}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Created:</span>
                    <span class="value">${this.formatDate(
                      item.created_at
                    )}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Updated:</span>
                    <span class="value">${this.formatDate(
                      item.updated_at
                    )}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Notes:</h3>
                <div class="detail-row">
                    <span class="label">Note:</span>
                    <span class="value">${item.item_note || "-"}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Sales Information:</h3>
                <div class="detail-row">
                    <span class="label">WSP:</span>
                    <span class="value">${item.swsp || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">WSP2:</span>
                    <span class="value">${item.swsp2 || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Location:</span>
                    <span class="value">${item.item_location || "-"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value status-${item.item_status?.toLowerCase()}">${
      item.item_status || "-"
    }</span>
                </div>
            </div>
        </div>
    `;
  }

  formatPackSize(packSize) {
    if (!packSize || Object.keys(packSize).length === 0) return "-";
    try {
      // Check if packSize is already an object
      const sizes =
        typeof packSize === "string" ? JSON.parse(packSize) : packSize;

      if (
        typeof sizes !== "object" ||
        !sizes ||
        Object.keys(sizes).length === 0
      )
        return "-";

      return `<div class="json-data-wrapper">
            <table class="json-data-table">
                <thead>
                    <tr>
                        <th>Size</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(sizes)
                      .map(
                        ([size, qty]) => `
                            <tr>
                                <td>${size}</td>
                                <td>${qty}</td>
                            </tr>
                        `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>`;
    } catch (error) {
      console.error("Error formatting pack size:", error);
      return "-";
    }
  }

  formatRepeatItem(repeatItem) {
    if (!repeatItem || Object.keys(repeatItem).length === 0) return "-";
    try {
      // Check if repeatItem is already an object
      const repeat =
        typeof repeatItem === "string" ? JSON.parse(repeatItem) : repeatItem;

      if (
        typeof repeat !== "object" ||
        !repeat ||
        Object.keys(repeat).length === 0
      )
        return "-";

      return `<div class="json-data-wrapper">
            <table class="json-data-table">
                <thead>
                    <tr>
                        <th>Times</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(repeat)
                      .map(
                        ([key, value]) => `
                            <tr>
                                <td>${parseInt(this.formatRepeatKey(key)) + 1}</td>
                                <td>${this.formatRepeatValue(value)}</td>
                            </tr>
                        `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>`;
    } catch (error) {
      console.error("Error formatting repeat item:", error);
      return "-";
    }
  }

  formatRepeatValue(value) {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  formatRepeatKey(key) {
    // Convert snake_case or camelCase to Title Case with spaces
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}

// Initialize the ViewItem class
window.viewItem = new ViewItem();
