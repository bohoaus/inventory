import { formatDateToSydney } from "./utils.js";

class UpcomingFreightList {
  constructor() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    // Add event listener for the button with a slight delay to ensure all elements are loaded
    setTimeout(() => {
      const buttons = document.querySelectorAll(".show-freight-list");
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          console.log("Freight list button clicked"); // Debug log
          this.showFreightModal();
        });
      });
    }, 100);
  }

  async showFreightModal() {
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

      // Create modal
      const modal = document.createElement("div");
      modal.className = "modal freight-modal";

      const content = document.createElement("div");
      content.className = "modal-content";

      // Add close button
      const closeBtn = document.createElement("button");
      closeBtn.className = "modal-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.onclick = () => modal.remove();

      // Add title
      const title = document.createElement("h2");
      title.className = "modal-title";
      title.textContent = "Freight Lists";

      // Create tabs for different statuses
      const tabContainer = document.createElement("div");
      tabContainer.className = "freight-tabs";

      const inTransitTab = this.createTab("In Transit", groupedItems.inTransit);
      const delayedTab = this.createTab("Delayed", groupedItems.delayed);
      const arrivedTab = this.createTab("Arrived", groupedItems.arrived);

      tabContainer.appendChild(inTransitTab);
      tabContainer.appendChild(delayedTab);
      tabContainer.appendChild(arrivedTab);

      // Create content area
      const contentArea = document.createElement("div");
      contentArea.className = "freight-content";

      // Assemble modal
      content.appendChild(closeBtn);
      content.appendChild(title);
      content.appendChild(tabContainer);
      content.appendChild(contentArea);
      modal.appendChild(content);
      document.body.appendChild(modal);

      // Show initial data
      this.showTabContent("inTransit", groupedItems.inTransit, contentArea);
    } catch (error) {
      console.error("Error loading freight lists:", error);
      adminInventory.showNotification("Error loading freight lists", "error");
    }
  }

  createTab(label, items) {
    const tab = document.createElement("button");
    tab.className = "freight-tab";
    tab.textContent = `${label} (${Object.keys(items).length})`;
    tab.onclick = (e) => {
      document
        .querySelectorAll(".freight-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      this.showTabContent(
        label.toLowerCase(),
        items,
        document.querySelector(".freight-content")
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
      const key = `${formatDateToSydney(item.mfg_date)}_${
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
      container.innerHTML = '<p class="no-data">No items found</p>';
      return;
    }

    // Create list of freight groups
    Object.entries(items).forEach(([key, groupItems]) => {
      const [date, cargo] = key.split("_");
      const groupContainer = document.createElement("div");
      groupContainer.className = "freight-group";

      const groupHeader = document.createElement("div");
      groupHeader.className = "freight-group-header";

      // Add bags amount to the title
      const bagInfo = groupItems[0]?.freight_bags
        ? ` (${groupItems[0].freight_bags} bags)`
        : "";
      const title = document.createElement("h3");
      title.textContent = `${date} - ${cargo}${bagInfo}`;

      // Create dates section
      const datesSection = document.createElement("div");
      datesSection.className = "freight-dates";
      datesSection.innerHTML = `
            <div class="freight-date">
                <label>Est. Date</label>
                <span>${
                  formatDateToSydney(groupItems[0].est_date) || "Not Set"
                }</span>
            </div>
            <div class="freight-date ${
              groupItems[0].delay_date ? "delayed" : ""
            }">
                <label>Status</label>
                <span>${
                  groupItems[0].delay_date
                    ? `Delayed to ${formatDateToSydney(
                        groupItems[0].delay_date
                      )}`
                    : "On Schedule"
                }</span>
            </div>
            <div class="freight-date ${
              groupItems[0].arrive_date ? "arrived" : ""
            }">
                <label>Arrive Date</label>
                <span>${
                  formatDateToSydney(groupItems[0].arrive_date) || "Pending"
                }</span>
            </div>
        `;

      // Create buttons container
      const buttonsContainer = document.createElement("div");
      buttonsContainer.className = "freight-group-buttons";

      // Create View All button
      const viewAllBtn = document.createElement("button");
      viewAllBtn.className = "view-all-btn";
      viewAllBtn.innerHTML = `
            <span class="btn-icon view-icon"></span>
            View Packing List (${groupItems.length})
        `;
      viewAllBtn.addEventListener("click", () => {
        this.showAllItemsModal(date, cargo, groupItems);
      });

      // Create Bulk Edit button
      const bulkEditBtn = document.createElement("button");
      bulkEditBtn.className = "bulk-edit-btn";
      bulkEditBtn.innerHTML = `
            <span class="btn-icon edit-icon"></span>
            Bulk Edit
        `;
      bulkEditBtn.addEventListener("click", () => {
        this.showBulkEditModal(key, groupItems);
      });

      // Create Export PDF button
      const exportPdfBtn = document.createElement("button");
      exportPdfBtn.className = "export-pdf-btn";
      exportPdfBtn.innerHTML = `Export PDF`;
      exportPdfBtn.addEventListener("click", () => {
        this.generateFreightListPDF(date, cargo, groupItems);
      });

      // Assemble header
      buttonsContainer.appendChild(viewAllBtn);
      buttonsContainer.appendChild(bulkEditBtn);
      buttonsContainer.appendChild(exportPdfBtn);

      groupHeader.appendChild(title);
      groupHeader.appendChild(datesSection);
      groupHeader.appendChild(buttonsContainer);

      groupContainer.appendChild(groupHeader);
      container.appendChild(groupContainer);
    });
  }

  createItemsList(items) {
    const container = document.createElement("div");
    container.className = "freight-items-grid";

    items.forEach((item) => {
      const itemCard = document.createElement("div");
      itemCard.className = "freight-item-card";

      const status = this.getItemStatus(item);
      itemCard.classList.add(`status-${status}`);

      itemCard.innerHTML = `
            <div class="item-header">
                <span class="item-code">${item.code_colour}</span>
                <span class="item-name">${item.item_name || ""}</span>
            </div>
            <div class="dates-container">
                <div class="date-column">
                    <label>Est. Date</label>
                    <span>${formatDateToSydney(item.est_date)}</span>
                </div>
                <div class="date-column">
                    <label>Status</label>
                    <span>${
                      item.delay_date
                        ? `Delayed to ${formatDateToSydney(item.delay_date)}`
                        : "On Schedule"
                    }</span>
                </div>
                <div class="date-column">
                    <label>Arrive Date</label>
                    <span>${
                      formatDateToSydney(item.arrive_date) || "Pending"
                    }</span>
                </div>
            </div>
        `;

      container.appendChild(itemCard);
    });

    return container;
  }

  async showBulkEditModal(key, items) {
    const [date, cargo] = key.split("_");

    const modal = document.createElement("div");
    modal.className = "modal bulk-edit-modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => modal.remove();

    // Create form
    const form = document.createElement("form");
    form.className = "bulk-edit-form";
    form.innerHTML = `
        <h3>Bulk Edit - ${date} ${cargo}</h3>
        <div class="form-group">
            <label>Estimated Date</label>
            <input type="date" name="est_date">
        </div>
        <div class="form-group">
            <label>Delay Date</label>
            <input type="date" name="delay_date">
        </div>
        <div class="form-group">
            <label>Arrive Date</label>
            <input type="date" name="arrive_date">
        </div>
        <div class="form-group">
            <label>Bags Amount</label>
            <input type="number" name="freight_bags" min="0" step="1">
        </div>
        <div class="form-actions">
            <button type="submit" class="save-btn">Save Changes</button>
            <button type="button" class="cancel-btn" onclick="this.closest('.modal').remove()">Cancel</button>
        </div>
    `;

    // Handle form submission
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const updates = {};

      // Only include fields that have been filled out
      for (const [key, value] of formData.entries()) {
        if (value) updates[key] = value;
      }

      if (Object.keys(updates).length === 0) {
        adminInventory.showNotification("No changes made", "warning");
        return;
      }

      try {
        // Group items by their item_group
        const groupedItems = items.reduce((acc, item) => {
          const group = item.item_group?.toUpperCase() || "UNKNOWN";
          if (!acc[group]) acc[group] = [];
          acc[group].push(item.id);
          return acc;
        }, {});

        // If arrive_date is being set, update item_status based on group
        if (updates.arrive_date) {
          // Update ODM items
          if (groupedItems.ODM?.length > 0) {
            await supabaseClient
              .from("inventory")
              .update({
                ...updates,
                item_status: "ARRIVED",
              })
              .in("id", groupedItems.ODM);
          }

          // Update BOHO items
          if (groupedItems.BOHO?.length > 0) {
            await supabaseClient
              .from("inventory")
              .update({
                ...updates,
                item_status: "NOT RELEASED",
              })
              .in("id", groupedItems.BOHO);
          }

          // Update PRIMROSE items
          if (groupedItems.PRIMROSE?.length > 0) {
            await supabaseClient
              .from("inventory")
              .update({
                ...updates,
                item_status: "NOT RELEASED",
              })
              .in("id", groupedItems.PRIMROSE);
          }

          // Update any remaining items without status change
          const handledIds = [
            ...(groupedItems.ODM || []),
            ...(groupedItems.BOHO || []),
            ...(groupedItems.PRIMROSE || []),
          ];
          const remainingIds = items
            .map((item) => item.id)
            .filter((id) => !handledIds.includes(id));

          if (remainingIds.length > 0) {
            await supabaseClient
              .from("inventory")
              .update(updates)
              .in("id", remainingIds);
          }
        } else {
          // If no arrive_date, update all items with the same updates
          const itemIds = items.map((item) => item.id);
          const { error } = await supabaseClient
            .from("inventory")
            .update(updates)
            .in("id", itemIds);

          if (error) throw error;
        }

        adminInventory.showNotification(
          "Items updated successfully",
          "success"
        );

        // Close all modals
        this.closeAllModals();

        // Refresh inventory if needed
        if (window.adminInventory) {
          window.adminInventory.loadInventory();
        }

        // Add a slight delay before reloading to ensure notification is seen
        setTimeout(() => {
          // Refresh all components and reload the page
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Error updating items:", error);
        adminInventory.showNotification("Error updating items", "error");
      }
    };

    content.appendChild(closeBtn);
    content.appendChild(form);
    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  // Add helper method for formatting pack size
  formatPackSizeString(packSize) {
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

  // Add helper method for getting brand info
  getBrandInfo(item) {
    if (!item.item_group) return "-";
    const group = item.item_group.toUpperCase();

    // Return item_group for BOHO and PRIMROSE
    if (group === "BOHO" || group === "PRIMROSE") {
      return group;
    }

    // Return odm_customer for other items
    return item.odm_customer || "-";
  }

  // Add helper method for getting background color
  getBrandColor(brand) {
    // Handle null/undefined/empty brand
    if (!brand) return "#f8f9fa"; // Default light gray color

    // Define specific colors for BOHO and PRIMROSE
    const brandColors = {
      BOHO: "#e3f2fd", // Light blue
      PRIMROSE: "#f3e5f5", // Light purple
    };

    const upperBrand = brand.toUpperCase();
    if (brandColors[upperBrand]) {
      return brandColors[upperBrand];
    }

    // Generate consistent pastel color for ODM customers
    let hash = 0;
    for (let i = 0; i < brand.length; i++) {
      hash = brand.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate pastel color
    const h = hash % 360;
    return `hsl(${h}, 70%, 95%)`;
  }

  async showAllItemsModal(date, cargo, items) {
    const modal = document.createElement("div");
    modal.className = "modal all-items-modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => modal.remove();

    // Create header section
    const header = document.createElement("div");
    header.className = "modal-title-group";
    header.innerHTML = `
        <h2>Packing List Details</h2>
        <div class="modal-subtitle">
            <table>
              <tr>
                  <td>Manufacturing Date:</td> <td style="width:100px; color:blue">${date}</td>
                  <td>Cargo Reference:</td> <td style="width:100px; color:blue">${cargo}</td>
                  <td>Total Items:</td> <td style="width:100px; color:blue">${items.length}</td>
              </tr>
            </table>
        </div>
    `;

    // Create table container
    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";

    // Sort items by brand
    const sortedItems = [...items].sort((a, b) => {
      const brandA = this.getBrandInfo(a).toUpperCase();
      const brandB = this.getBrandInfo(b).toUpperCase();

      if (brandA === "BOHO") return -1;
      if (brandB === "BOHO") return 1;
      if (brandA === "PRIMROSE") return -1;
      if (brandB === "PRIMROSE") return 1;
      return brandA.localeCompare(brandB);
    });

    // Create table
    const table = document.createElement("table");
    table.className = "all-items-table";
    table.innerHTML = `
        <thead>
            <tr>
                <th>Code</th>
                <th>Colour</th>
                <th>Fabric</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Pack Size</th>
                <th>mfgQty</th>
                <th>Bags</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody>
            ${sortedItems
              .map((item) => {
                const brand =
                  item.item_group === "ODM"
                    ? item.odm_customer || "Unknown ODM"
                    : item.item_group || "Unknown";

                const backgroundColor = this.getBrandColor(brand);

                // Determine quantity display based on brand
                const qtyDisplay = ["BOHO", "PRIMROSE"].includes(
                  item.item_group?.toUpperCase()
                )
                  ? `${item.receive_qty || "0"} packs`
                  : `${item.receive_qty || "0"} pcs`;

                return `
                    <tr style="background-color: ${backgroundColor}">
                        <td>${item.code_colour || ""}</td>
                        <td>${item.scolour || ""}</td>
                        <td>${item.sfabric || ""}</td>
                        <td>${brand}</td>
                        <td>${item.item_category || ""}</td>
                        <td>${this.formatPackSizeString(item.pack_size)}</td>
                        <td>${qtyDisplay}</td>
                        <td>${item.freight_bags || "-"}</td>
                        <td>${item.item_note || ""}</td>
                    </tr>
                `;
              })
              .join("")}
        </tbody>
    `;

    // Assemble modal
    tableContainer.appendChild(table);
    content.appendChild(closeBtn);
    content.appendChild(header);
    content.appendChild(tableContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  // Add helper method for item status
  getItemStatus(item) {
    if (item.arrive_date) return "arrived";
    if (item.delay_date) return "delayed";
    return "on-schedule";
  }

  // Add helper method to close all modals
  closeAllModals() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      modal.classList.add("closing");
      modal.style.opacity = "0";
      setTimeout(() => {
        modal.remove();
      }, 300);
    });
  }

  // Add bags amount to bulk edit modal
  generateBulkEditModal(items) {
    return `
        <div class="bulk-edit-modal">
            <h3>Bulk Edit Items</h3>
            <form id="bulkEditForm">
                <div class="form-group">
                    <label>Estimated Date:</label>
                    <input type="date" id="bulkEstDate" required>
                </div>
                <div class="form-group">
                    <label>Bags Amount:</label>
                    <input type="number" id="bulkBagsAmount" min="0" step="1">
                </div>
                <div class="items-list">
                    ${items
                      .map(
                        (item) => `
                        <div class="item-row">
                            <input type="checkbox" 
                                   value="${item.id}" 
                                   checked>
                            <span>${item.code_colour}</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div class="form-actions">
                    <button type="submit">Update Selected</button>
                    <button type="button" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
  }

  // Update bulk edit handler
  async handleBulkEdit(event) {
    event.preventDefault();
    const form = event.target;
    const estDate = form.querySelector("#bulkEstDate").value;
    const bagsAmount = form.querySelector("#bulkBagsAmount").value;
    const selectedItems = Array.from(
      form.querySelectorAll('input[type="checkbox"]:checked')
    ).map((cb) => cb.value);

    try {
      // Validate inputs
      if (!estDate && !bagsAmount) {
        alert("Please fill in at least one field to update");
        return;
      }

      if (selectedItems.length === 0) {
        alert("Please select at least one item to update");
        return;
      }

      // Prepare updates object with only filled fields
      const updates = {
        updated_at: new Date().toISOString(),
      };

      if (estDate) updates.est_date = estDate;
      if (bagsAmount !== "")
        updates.freight_bags = parseInt(bagsAmount) || null;

      // Update items in smaller batches
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize);
        try {
          const { error } = await supabaseClient
            .from("inventory")
            .update(updates)
            .in("id", batch);

          if (error) {
            console.error("Batch update error:", error);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (batchError) {
          console.error("Batch error:", batchError);
          errorCount += batch.length;
        }
      }

      // Show results
      if (successCount > 0) {
        const message =
          errorCount > 0
            ? `Updated ${successCount} items successfully. ${errorCount} items failed.`
            : `Updated ${successCount} items successfully!`;
        alert(message);
        this.loadFreightList();
        form.closest(".modal").remove();
      } else {
        throw new Error("No items were updated successfully");
      }
    } catch (error) {
      console.error("Error updating items:", error);
      alert(`Error updating items: ${error.message || "Please try again"}`);
    }
  }

  // Update the freight group header
  generateGroupHeader(date, cargo, items) {
    return `
        <div class="freight-group-header">
            <h3>${date} - ${cargo} ${items[0].freight_bags}</h3>
            <div class="freight-stats">
                <span>Total Items: ${items.length}</span>
            </div>
            <div class="freight-dates">
                <div class="freight-date">
                    <label>Est. Date</label>
                    <span>${
                      formatDateToSydney(items[0].est_date) || "Not Set"
                    }</span>
                </div>
                <div class="freight-date ${
                  items[0].delay_date ? "delayed" : ""
                }">
                    <label>Status</label>
                    <span>${
                      items[0].delay_date
                        ? `Delayed to ${formatDateToSydney(
                            items[0].delay_date
                          )}`
                        : "On Schedule"
                    }</span>
                </div>
                <div class="freight-date ${
                  items[0].arrive_date ? "arrived" : ""
                }">
                    <label>Arrive Date</label>
                    <span>${
                      formatDateToSydney(items[0].arrive_date) || "Pending"
                    }</span>
                </div>
            </div>
        </div>
    `;
  }

  // Update the packing list details
  generatePackingListDetails(items) {
    return `
        <div class="packing-list-details">
            <div class="packing-list-header">
                <h3>Packing List Details</h3>
                <div class="packing-list-stats">
                    <span>Total Items: ${items.length}</span>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Code/Colour</th>
                        <th>Est. Date</th>
                        <th>Bags Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${items
                      .map(
                        (item) => `
                        <tr>
                            <td>${item.code_colour}</td>
                            <td>${formatDateToSydney(item.est_date)}</td>
                            <td>${item.freight_bags || "-"}</td>
                            <td>${item.item_status || "-"}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    `;
  }

  // Add this method to generate item rows with bags amount
  generateItemRow(item) {
    return `
        <div class="freight-item">
            <div class="freight-item-info">
                <span class="item-code">${item.code_colour}</span>
                <span class="item-bags">${
                  item.freight_bags ? `${item.freight_bags} bags` : "-"
                }</span>
            </div>
            <div class="freight-item-status ${this.getItemStatus(item)}">
                ${item.item_status || "Processing"}
            </div>
        </div>
    `;
  }

  // Update the group content generation
  generateGroupContent(items) {
    return `
        <div class="freight-items">
            ${items.map((item) => this.generateItemRow(item)).join("")}
        </div>
        <div class="freight-group-actions">
            <button onclick="upcomingFreightList.showAllItems(${JSON.stringify(
              items
            )})" class="view-all-btn">
                View All Items
            </button>
            <button onclick="upcomingFreightList.showBulkEditModal(${JSON.stringify(
              items
            )})" class="bulk-edit-btn">
                Bulk Edit
            </button>
        </div>
    `;
  }

  // Add this method to generate PDF for a specific freight list
  async generateFreightListPDF(date, cargo, items) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const fontSize = 8;
      doc.setFontSize(fontSize);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margins = { top: 10, bottom: 10, left: 10, right: 10 };

      // Sort items by brand (BOHO first, then PRIMROSE, then ODM customers)
      const sortedItems = [...items].sort((a, b) => {
        const brandA = a.item_group?.toUpperCase() || "";
        const brandB = b.item_group?.toUpperCase() || "";

        if (brandA === "BOHO") return -1;
        if (brandB === "BOHO") return 1;
        if (brandA === "PRIMROSE") return -1;
        if (brandB === "PRIMROSE") return 1;

        // For ODM items, sort by odm_customer
        const odmA = a.odm_customer || "";
        const odmB = b.odm_customer || "";
        return odmA.localeCompare(odmB);
      });

      // Prepare table data with updated brand info
      const headers = [
        "Code",
        "Colour",
        "Fabric",
        "Brand",
        "Category",
        "Pack Size",
        "Receive Qty",
        "Bags",
        "Note",
      ];
      const tableData = sortedItems.map((item) => [
        item.code_colour || "",
        item.scolour || "",
        item.sfabric || "",
        this.getBrandInfo(item),
        item.item_category || "",
        this.formatPackSizeString(item.pack_size),
        ["BOHO", "PRIMROSE"].includes(item.item_group?.toUpperCase())
          ? `${item.receive_qty || "0"} packs`
          : `${item.receive_qty || "0"} pcs`,
        item.freight_bags || "",
        item.item_note || "",
      ]);

      // Add title and info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Packing List Details", margins.left, margins.top);

      doc.setFontSize(10);
      const bagInfo = items[0]?.freight_bags
        ? ` (${items[0].freight_bags} bags)`
        : "";
      doc.text(`Manufacturing Date: ${date}`, margins.left, margins.top + 6);
      doc.text(
        `Cargo Reference: ${cargo}${bagInfo}`,
        margins.left,
        margins.top + 12
      );
      doc.text(`Total Items: ${items.length}`, margins.left, margins.top + 18);

      // Add table with updated styles
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: margins.top + 25,
        margin: margins,
        styles: {
          fontSize: fontSize,
          cellPadding: 2,
          lineColor: [200, 200, 200], // Light gray borders
          lineWidth: 0.1, // Thin borders
          textColor: [0, 0, 0], // Black text
          fillColor: [255, 255, 255], // White background for all rows
          minCellHeight: 6, // Minimum cell height
          cellWidth: "wrap", // Allow cell content to wrap
        },
        headStyles: {
          fillColor: [245, 245, 245], // Light gray background for header
          textColor: [0, 0, 0], // Black text for header
          fontStyle: "bold",
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 30 }, // Code
          1: { cellWidth: 15 }, // Colour
          2: { cellWidth: 15 }, // Fabric
          3: { cellWidth: 15 }, // Brand
          4: { cellWidth: 15 }, // Category
          5: { cellWidth: 35 }, // Pack Size
          6: { cellWidth: 10 }, // Receive Qty
          7: { cellWidth: 10 }, // Bags
          8: { cellWidth: "auto" }, // Note - takes remaining space
        },
        didDrawPage: (data) => {
          // Add page numbers in black
          const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
          const totalPages = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text(
            `Page ${pageNumber} of ${totalPages}`,
            pageWidth - margins.right,
            pageHeight - margins.bottom,
            { align: "right" }
          );
        },
      });

      // Save the PDF
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      doc.save(`packing-list-${date}-${cargo}-${timestamp}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }

  // Update the generateFreightList method to include bags amount
  generateFreightList(groupedItems) {
    return Object.entries(groupedItems)
      .map(([key, items]) => {
        const [date, cargo] = key.split("_");
        const bagInfo = items[0]?.freight_bags
          ? ` (${items[0].freight_bags} bags)`
          : "";

        return `
          <div class="freight-group">
            <div class="freight-group-header">
              <h3>${date} - ${cargo}${bagInfo}</h3>
              <div class="freight-group-buttons">
                <button class="view-all-btn" onclick="upcomingFreightList.showAllItemsModal('${date}', '${cargo}', ${JSON.stringify(
          items
        ).replace(/"/g, "&quot;")})">
                  View Packing List
                </button>
                <button class="bulk-edit-btn" onclick="upcomingFreightList.showBulkEditModal('${key}', ${JSON.stringify(
          items
        ).replace(/"/g, "&quot;")})">
                  Bulk Edit
                </button>
                <button class="export-pdf-btn" onclick="upcomingFreightList.generateFreightListPDF('${date}', '${cargo}', ${JSON.stringify(
          items
        ).replace(/"/g, "&quot;")})">
                  Export PDF
                </button>
              </div>
            </div>
            <!-- Rest of the freight group content -->
          </div>
        `;
      })
      .join("");
  }
}

// Initialize and make globally available
const upcomingFreightList = new UpcomingFreightList();
window.upcomingFreightList = upcomingFreightList;

// Export for module usage
export default UpcomingFreightList;
