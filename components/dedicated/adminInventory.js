function formatDateToSydney(dateString) {
  if (!dateString) return "";
  const options = {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("en-AU", options);
}

function compareValues(a, b, direction) {
  // Handle null, undefined, empty string, and 0 cases
  const isAEmpty = a === null || a === undefined || a === "" || a === 0;
  const isBEmpty = b === null || b === undefined || b === "" || b === 0;

  // If both are empty/null/0, maintain their relative position
  if (isAEmpty && isBEmpty) return 0;

  // Empty/null/0 values go to the bottom
  if (isAEmpty) return 1;
  if (isBEmpty) return -1;

  // For non-empty values, compare normally - jim 2025.02.08
  if (direction === "asc") {
    return a < b ? -1 : a > b ? 1 : 0;
  } else {
    return a > b ? -1 : a < b ? 1 : 0;
  }
}

class AdminInventory {
  constructor() {
    this.container = document.getElementById("inventoryContainer");
    this.searchInput = document.getElementById("searchInventory");
    this.searchNoteInput = document.getElementById("searchNote");
    this.filterGroup = document.getElementById("filterGroup");
    this.rowsPerPage = document.getElementById("rowsPerPage");
    this.currentPage = 1;
    //this.sortColumn = "code_colour";
    this.sortColumn = "mfg_date";
    //this.sortDirection = "asc";
    this.sortDirection = "desc";
    this.currentFilter = "All";

    // Initialize subscriptions array
    this.subscriptions = [];

    // Default selected columns
//      { id: "receive_qty", label: "Qty" },
    this.selectedColumns = [
      "arrive_date",
      "code_colour",
      "scolour",
      "stock_qty",
      "item_name",
      "release_date",
      "item_location",
      "mfg_date",
      "odm_ppo",
      "item_status",
      "soldout_date",
      "pack_size",
      "repeat_item",
      "receive_qty(freight_bags)",
      "item_aging",
      "item_note",
      "item_category",
      "item_cargo",
      "freight_bags",
    ];

    // Define default columns that cannot be unchecked
//      { id: "receive_qty", label: "Qty" },
    this.defaultColumns = [
      "arrive_date",
      "code_colour",
      "scolour",
      "stock_qty",
      "item_name",
      "release_date",
      "item_location",
      "mfg_date",
      "odm_ppo",      
      "item_status",
      "soldout_date",
      "pack_size",
      "repeat_item",
      "receive_qty(freight_bags)",
      "item_aging",
      "item_note",
      "item_category",
      "item_cargo",
      "freight_bags",
    ];

    // Initialize selected columns with defaults
    this.selectedColumns = [...this.defaultColumns];

    // Initialize in correct order
    this.initialize();
    this.setupEventListeners();
    this.setupAddItemButtons();
    this.setupRealtimeSubscription();

    // Add click outside handler for column selection
    document.addEventListener("click", (e) => {
      const panel = document.getElementById("columnSelection");
      const toggleBtn = document.querySelector(".column-toggle-btn");
      if (
        panel &&
        toggleBtn &&
        !panel.contains(e.target) &&
        !toggleBtn.contains(e.target) &&
        panel.classList.contains("show")
      ) {
        this.toggleColumnSelection();
      }
    });

    // Create and add clear button
    this.createAndAddClearButton();
  }

  // New method to create and add clear button
  createAndAddClearButton() {
    this.clearButton = document.createElement("button");
    this.clearButton.className = "clear-button";
    this.clearButton.innerHTML = 'Clear All Filters <i class="clear-icon"></i>';
    this.clearButton.onclick = () => this.clearAllFilters();
    this.clearButton.style.display = "none"; // Hide by default

    const controlsContainer = document.querySelector(".inventory-controls");
    if (controlsContainer && this.filterGroup) {
      controlsContainer.insertBefore(this.clearButton, this.filterGroup);
    }
  }

  // Update setupRealtimeSubscription method
  setupRealtimeSubscription() {
    // Clear existing subscriptions
    if (this.subscriptions) {
      this.subscriptions.forEach((subscription) => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });
    }
    this.subscriptions = [];

    // Create new subscription
    const subscription = supabaseClient
      .channel("inventory_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        (payload) => {
          console.log("Change received:", payload);
          this.handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
  }

  async initialize() {
    try {
      this.setupColumnSelection();
      this.loadColumnPreferences();
      await this.loadInventory();
      this.setupFilterButtons();
    } catch (error) {
      console.error("Error initializing inventory:", error);
      this.showNotification(error.message, "error");
    }
  }

  setupColumnSelection() {
    // Find the display-controls div
    const displayControls = document.querySelector(".display-controls");
    if (!displayControls) return;

    // Remove any existing column selection elements
    const existingColumnSelection = document.getElementById("columnSelection");
    if (existingColumnSelection) {
      existingColumnSelection.remove();
    }

    // Create the column selection container
    const container = document.createElement("div");
    container.className = "column-selection-container";

    // Create toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "column-toggle-btn";
    toggleBtn.innerHTML = "Select Columns <i></i>";
    toggleBtn.onclick = () => this.toggleColumnSelection();

    // Create column selection panel
    const panel = document.createElement("div");
    panel.id = "columnSelection";

    // Add search input
    const searchContainer = document.createElement("div");
    searchContainer.className = "column-search";
    searchContainer.innerHTML = `
        <input type="text" 
               placeholder="Search columns..." 
               onkeyup="adminInventory.filterColumns(this.value)">
    `;
    panel.appendChild(searchContainer);

    // Add Select All / Clear All buttons
    const actionButtons = document.createElement("div");
    actionButtons.className = "column-actions";
    actionButtons.innerHTML = `
        <button class="select-all-btn" onclick="adminInventory.selectAllColumns()">Select All</button>
        <button class="clear-all-btn" onclick="adminInventory.clearAllColumns()">Clear All</button>
    `;
    panel.appendChild(actionButtons);

    // Define all columns in the desired order
    const allColumns = [
      // Default columns first (in specific order)
      { id: "arrive_date", label: "ArriveDate" },
      { id: "code_colour", label: "Code Color" },
      { id: "stock_qty", label: "Stock" },
      { id: "item_name", label: "Item Name" },
      { id: "release_date", label: "ReleaseDate" },
      { id: "item_status", label: "Status" },
      { id: "item_location", label: "Location" },
      { id: "pack_size", label: "Pack Size" },
      { id: "mfg_date", label: "MFGdate" },
      { id: "receive_qty", label: "Qty" },
      { id: "soldout_date", label: "SoldOutDate" },
      { id: "odm_ppo", label: "odmPPO" },
      { id: "item_aging", label: "ItemAging" },
      { id: "item_note", label: "Note" },
      { id: "item_category", label: "Category" },
      // Other columns after
      { id: "item_group", label: "Group" },
      { id: "pack_unit", label: "UnitP" },
      { id: "repeat_item", label: "Repeat Info" },
      { id: "sfabric", label: "Fabric" },
      { id: "scolour", label: "Colour" },
      { id: "sprice", label: "Price" },
      { id: "soldout_status", label: "SoldOutStatus" },
      { id: "item_cargo", label: "Cargo" },
      { id: "est_date", label: "EstimatedDate" },
      { id: "delay_date", label: "DelayDate" },
      { id: "odm_customer", label: "ODM Customer" },
      { id: "odm_qty_diff", label: "Produced vs Received" },
      { id: "freight_bags", label: "Bags" },
      { id: "created_at", label: "Created At" },
      { id: "updated_at", label: "Updated At" },
    ];

    const columnsHtml = allColumns
      .map((col) => {
        const isDefault = this.selectedColumns.includes(col.id);
        return `
                <div class="column-option" data-column="${col.id}">
                    <input type="checkbox" 
                           id="col_${col.id}" 
                           value="${col.id}" 
                           ${isDefault ? "disabled" : ""}
                           ${
                             this.selectedColumns.includes(col.id)
                               ? "checked"
                               : ""
                           }>
                    <label for="col_${col.id}">
                        ${col.label}
                        ${
                          isDefault
                            ? '<span class="required-column">*</span>'
                            : ""
                        }
                    </label>
                </div>
            `;
      })
      .join("");

    panel.insertAdjacentHTML("beforeend", columnsHtml);

    // Add event listener for checkbox changes
    panel.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        const columnId = e.target.value;
        const isDefault =
          this.selectedColumns.includes(columnId) &&
          this.defaultColumns?.includes(columnId);

        // Skip if it's a default column
        if (isDefault) {
          e.target.checked = true;
          return;
        }

        if (e.target.checked) {
          // Add column if not already present
          if (!this.selectedColumns.includes(columnId)) {
            this.selectedColumns.push(columnId);
          }
        } else {
          // Remove column if it's not a default column
          this.selectedColumns = this.selectedColumns.filter(
            (col) => col !== columnId
          );
        }

        // Save preferences and reload inventory
        this.saveColumnPreferences();
        this.loadInventory();
      }
    });

    // Assemble the components
    container.appendChild(toggleBtn);
    container.appendChild(panel);

    // Add to display controls
    displayControls.appendChild(container);
    this.columnSelection = panel;
  }

  // Add this method to get unique values
  async getUniqueValues(field) {
    try {
      const { data, error } = await supabaseClient
        .from("inventory")
        .select(field)
        .not(field, "is", null);

      if (error) throw error;

      const values = new Set(data.map((item) => item[field]));
      return Array.from(values).sort();
    } catch (error) {
      console.error(`Error fetching ${field} values:`, error);
      return [];
    }
  }

  // Update the setupFilterButtons method
  async setupFilterButtons() {
    const filterContainer = document.createElement("div");
    filterContainer.className = "filter-buttons";

    // Create filter dropdowns container
    const filterDropdowns = document.createElement("div");
    filterDropdowns.className = "filter-dropdowns";

    // Add Category Filter
    const categoryFilter = document.createElement("div");
    categoryFilter.className = "filter-group";
    const categories = await this.getUniqueValues("item_category");
    categoryFilter.innerHTML = `
        <label>Category:</label>
        <select id="categoryFilter">
            <option value="">All Categories</option>
            ${categories
              .map((cat) => `<option value="${cat}">${cat}</option>`)
              .join("")}
        </select>
    `;

    // Add Status Filter
    const statusFilter = document.createElement("div");
    statusFilter.className = "filter-group";
    const statuses = await this.getUniqueValues("item_status");
    statusFilter.innerHTML = `
        <label>Status:</label>
        <select id="statusFilter">
            <option value="">All Statuses</option>
            ${statuses
              .map((status) => `<option value="${status}">${status}</option>`)
              .join("")}
        </select>
    `;

    // Add Group Buttons directly in the filter dropdowns
    const groupButtons = document.createElement("div");
    groupButtons.className = "filter-group group-buttons";
    groupButtons.innerHTML = `<label>Group:</label>`;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "group-button-container";

    // Add group buttons (without ALL)
    ["BOHO", "PRIMROSE", "ODM", "REPEAT"].forEach((group) => {
      const button = document.createElement("button");
      button.textContent = group;
      button.className = "group-filter-btn";
      if (group === this.currentFilter) {
        button.classList.add("active");
      }
      button.onclick = () => this.filterByGroup(group);
      buttonContainer.appendChild(button);
    });

    groupButtons.appendChild(buttonContainer);

    // Add filters to container
    filterDropdowns.appendChild(categoryFilter);
    filterDropdowns.appendChild(statusFilter);
    filterDropdowns.appendChild(groupButtons);

    // Add special buttons after REPEAT
    const specialButtons = document.createElement("div");
    specialButtons.className = "special-buttons";

    // Add Weekly Sold Out button
    const soldOutButton = document.createElement("button");
    soldOutButton.className = "show-soldout-list";
    soldOutButton.innerHTML = `
        <span class="btn-icon list-icon"></span>
        Weekly Sold Out
    `;
    soldOutButton.onclick = () => {
      if (window.soldOutList) {
        window.soldOutList.showSoldOutModal();
      }
    };
    specialButtons.appendChild(soldOutButton);

    // Add Freight List button
    const freightButton = document.createElement("button");
    freightButton.className = "show-freight-list";
    freightButton.innerHTML = `
        <span class="btn-icon truck-icon"></span>
        Freight List
    `;
    freightButton.addEventListener("click", () => {
      if (window.upcomingFreightList) {
        window.upcomingFreightList.showFreightModal();
      } else {
        console.error("Freight list not initialized");
        this.showNotification("Error loading freight list", "error");
      }
    });
    specialButtons.appendChild(freightButton);

    // Add Export PDF button
    const exportButton = document.createElement("button");
    exportButton.className = "export-pdf-btn";
    exportButton.innerHTML = `
        <svg class="pdf-icon" width="16" height="16" viewBox="0 0 384 512">
            <path fill="currentColor" d="M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zM332.1 128H256V51.9l76.1 76.1zM48 464V48h160v104c0 13.3 10.7 24 24 24h104v288H48z"/>
        </svg>
        Export PDF
    `;
    exportButton.onclick = async () => {
      await window.pdfExport.showExportOptionsDialog();
    };
    specialButtons.appendChild(exportButton);

    // Add event listeners for filters
    categoryFilter.querySelector("select").addEventListener("change", () => {
      this.applyFilters();
    });

    statusFilter.querySelector("select").addEventListener("change", () => {
      this.applyFilters();
    });

    // Add components to the page
    const controls = document.querySelector(".inventory-controls");
    const searchContainer = controls.querySelector(".search-container");

    if (controls.querySelector(".filter-dropdowns")) {
      controls.querySelector(".filter-dropdowns").remove();
    }
    if (controls.querySelector(".filter-buttons")) {
      controls.querySelector(".filter-buttons").remove();
    }

    controls.insertBefore(filterDropdowns, searchContainer.nextSibling);
    controls.appendChild(specialButtons);
  }

  // Add method to apply filters
  async applyFilters() {
    const categoryValue = document.getElementById("categoryFilter").value;
    const statusValue = document.getElementById("statusFilter").value;

    let query = supabaseClient.from("inventory").select("*");

    if (categoryValue) {
      query = query.eq("item_category", categoryValue);
    }
    if (statusValue) {
      query = query.eq("item_status", statusValue);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;
      this.renderInventoryTable(data);
    } catch (error) {
      console.error("Error applying filters:", error);
      this.showNotification("Error applying filters", "error");
    }
  }

  async loadInventory() {
    try {
      // Build the base query
      let query = supabaseClient.from("inventory").select("*");

      // Apply search filters
      const searchTerm = this.searchInput.value.trim();
      const noteSearchTerm = this.searchNoteInput.value.trim();

      if (searchTerm) {
        query = query.or(
          `code_colour.ilike.%${searchTerm}%,item_name.ilike.%${searchTerm}%`
        );
      }

      if (noteSearchTerm) {
        query = query.ilike("item_note", `%${noteSearchTerm}%`);
      }

      // Apply group filter
      if (this.currentFilter && this.currentFilter !== "All") {
        if (this.currentFilter === "REPEAT") {
          query = query
            .not("repeat_item", "is", null)
            .not("repeat_item", "eq", "{}");
        } else {
          query = query.ilike("item_group", this.currentFilter);
        }
      }

      // Fetch all data first (without sorting)
      const { data, error } = await query;
      if (error) throw error;

      // Sort the data in memory
      const sortedData = data.sort((a, b) => {
        const aValue = a[this.sortColumn];
        const bValue = b[this.sortColumn];

        // Special handling for numeric columns
        if (
          ["stock_qty", "receive_qty", "pack_unit", "item_aging"].includes(
            this.sortColumn
          )
        ) {
          const aNum = parseFloat(aValue) || 0;
          const bNum = parseFloat(bValue) || 0;
          return compareValues(aNum, bNum, this.sortDirection);
        }

        // Special handling for dates
        if (
          [
            "release_date",
            "mfg_date",
            "est_date",
            "arrive_date",
            "delay_date",
            "soldout_date",
            "created_at",
            "updated_at",
          ].includes(this.sortColumn)
        ) {
          const aDate = aValue ? new Date(aValue).getTime() : 0;
          const bDate = bValue ? new Date(bValue).getTime() : 0;
          return compareValues(aDate, bDate, this.sortDirection);
        }

        // Default string comparison
        return compareValues(aValue, bValue, this.sortDirection);
      });

      // Apply pagination to the sorted data
      const itemsPerPage = parseInt(this.rowsPerPage.value);
      const startIndex = (this.currentPage - 1) * itemsPerPage;
      const paginatedData = sortedData.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      // Render the table with the sorted and paginated data
      this.renderInventoryTable(paginatedData);
      this.updateFilterButtons();
      this.updateClearButtonVisibility();

      // Render pagination with total count
      this.renderPagination(sortedData.length);
      this.updateStatusText(sortedData.length);
    } catch (error) {
      console.error("Error loading inventory:", error);
      this.showNotification("Error loading inventory", "error");
    }
  }

  renderInventoryTable(data) {
    // Add scroll indicator
    const scrollIndicator = document.createElement("div");
    scrollIndicator.className = "scroll-indicator";
    scrollIndicator.textContent = "← Scroll horizontally to see more →";

    // Create responsive wrapper
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-responsive";

    const table = document.createElement("table");
    table.className = "inventory-table";

    // Create header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Add action column for admins
    headerRow.innerHTML = '<th class="action-column">Actions</th>';

    // Add selected columns with appropriate classes
    this.selectedColumns.forEach((colName) => {
      const th = document.createElement("th");
      th.className = this.getColumnClass(colName);
      th.innerHTML = `
                ${this.formatColumnName(colName)}
                <span class="sort-icon" onclick="adminInventory.sortBy('${colName}')">↕</span>
            `;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement("tbody");
    data.forEach((item) => {
      const row = document.createElement("tr");
      row.setAttribute("data-id", item.id);

      // Update action column HTML
      const actionCell = document.createElement("td");
      actionCell.className = "action-column";
      actionCell.innerHTML = `
        <button class="view-btn" onclick="viewItem.showViewModal('${item.id}')">
            <span class="btn-icon view-icon"></span>
            View
        </button>
        <button class="edit-btn" onclick="adminInventory.editItem('${item.id}')">
            <span class="btn-icon edit-icon"></span>
            Edit
        </button>
      `;
      row.appendChild(actionCell);

      // Add rest of the columns
      this.selectedColumns.forEach((colName) => {
        const td = document.createElement("td");
        td.className = this.getColumnClass(colName);
        td.setAttribute("data-column", colName);

        // Handle different data types
        if (
          [
            "release_date",
            "mfg_date",
            "est_date",
            "arrive_date",
            "delay_date",
            "soldout_date",
            "created_at",
            "updated_at",
          ].includes(colName)
        ) {
          td.textContent = formatDateToSydney(item[colName]);
        } else if (colName === "pack_size") {
          if (item[colName]) {
            td.innerHTML = `
                <button class="view-details-btn pack-size-btn" 
                        onclick="adminInventory.showModal('${colName}', ${JSON.stringify(
              item[colName]
            ).replace(/"/g, "&quot;")})">
                    <span class="btn-icon view-icon"></span>
                    View Details
                </button>
            `;
          }
        } else if (colName === "repeat_item") {
          // Add console.log to debug
          console.log("Repeat item data:", item[colName]);

          // Check if repeat_item exists and has valid data
          if (
            item[colName] &&
            typeof item[colName] === "object" &&
            !Array.isArray(item[colName]) &&
            Object.keys(item[colName]).length > 0
          ) {
            td.innerHTML = `
                  <button class="view-details-btn repeat-info-btn" 
                          onclick="adminInventory.showModal('repeat_item', ${JSON.stringify(
                            item[colName]
                          ).replace(/"/g, "&quot;")})">
                      <span class="repeat-icon"></span>
                      Repeat Info
                  </button>
              `;
          } else {
            td.textContent = ""; // Empty cell if no repeat info
          }
        } else if (
          ["stock_qty", "receive_qty", "pack_unit", "item_aging"].includes(
            colName
          )
        ) {
          td.textContent = item[colName]?.toString() || "0";
          td.style.textAlign = "right";
        } else {
          td.textContent = item[colName] || "";
        }

        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Clear and update container
    this.container.innerHTML = "";
    this.container.appendChild(scrollIndicator);
    tableWrapper.appendChild(table);
    this.container.appendChild(tableWrapper);

    // Add pagination
    this.renderPagination(data.length);

    // Update status text with total items
    this.updateStatusText(data.length);
  }

  renderPagination(totalItems) {
    const existingPagination = this.container.querySelector(".pagination");
    if (existingPagination) {
      existingPagination.remove();
    }

    const itemsPerPage = parseInt(this.rowsPerPage.value);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return;

    const pagination = document.createElement("div");
    pagination.className = "pagination";

    // Add status text showing current range
    const startItem = (this.currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * itemsPerPage, totalItems);

    const statusText = document.createElement("span");
    statusText.className = "pagination-status";
    statusText.textContent = `Showing ${startItem}-${endItem} of ${totalItems} items`;
    pagination.appendChild(statusText);

    // Previous button
    pagination.innerHTML += `
        <button ${this.currentPage === 1 ? "disabled" : ""} 
                onclick="adminInventory.changePage(${this.currentPage - 1})">
            Previous
        </button>
    `;

    // Calculate which page numbers to show
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust startPage if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    // First page
    if (startPage > 1) {
      pagination.innerHTML += `
            <button onclick="adminInventory.changePage(1)">1</button>
            ${
              startPage > 2
                ? '<span class="pagination-ellipsis">...</span>'
                : ""
            }
        `;
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pagination.innerHTML += `
            <button class="${i === this.currentPage ? "active" : ""}"
                    onclick="adminInventory.changePage(${i})">
                ${i}
            </button>
        `;
    }

    // Last page
    if (endPage < totalPages) {
      pagination.innerHTML += `
            ${
              endPage < totalPages - 1
                ? '<span class="pagination-ellipsis">...</span>'
                : ""
            }
            <button onclick="adminInventory.changePage(${totalPages})">${totalPages}</button>
        `;
    }

    // Next button
    pagination.innerHTML += `
        <button ${this.currentPage === totalPages ? "disabled" : ""} 
                onclick="adminInventory.changePage(${this.currentPage + 1})">
            Next
        </button>
    `;

    this.container.appendChild(pagination);
  }

  showModal(type, data) {
    const modal = document.createElement("div");
    modal.className = "modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    const closeBtn = document.createElement("span");
    closeBtn.className = "close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => this.closeModal();

    const title = document.createElement("h2");
    title.textContent =
      type === "pack_size" ? "Pack Size Details" : "Repeat Item Details";

    const details = document.createElement("div");
    details.className = "json-details";

    // Format JSON data based on type
    if (type === "pack_size") {
      details.innerHTML = this.formatPackSize(data);
    } else if (type === "repeat_item") {
      details.innerHTML = this.formatRepeatItem(data);
    }

    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(details);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });
  }

  // Helper method to format pack size data
  formatPackSize(data) {
    if (!data) return "<p>No pack size information available</p>";

    let html = '<div class="pack-size-info">';
    if (typeof data === "object") {
      const entries = Object.entries(data);
      if (entries.length > 0) {
        html += '<table class="json-table">';
        html += "<thead><tr><th>Size</th><th>Quantity</th></tr></thead><tbody>";
        entries.forEach(([size, qty]) => {
          html += `<tr><td>${size}</td><td>${qty}</td></tr>`;
        });
        html += "</tbody></table>";
      } else {
        html += "<p>No size information available</p>";
      }
    } else {
      html += `<p>${data}</p>`;
    }
    html += "</div>";
    return html;
  }

  // Helper method to format repeat item data
  formatRepeatItem(data) {
    if (!data) return "<p>No repeat information available</p>";

    let html = '<div class="repeat-info">';
    if (typeof data === "object") {
      const entries = Object.entries(data);
      if (entries.length > 0) {
        html += '<table class="json-table">';
        html += "<thead><tr><th>Repeat</th><th>Date</th></tr></thead><tbody>";
        entries.forEach(([index, date], i) => {
          const ordinalNum = i + 1;
          const suffix = this.getOrdinalSuffix(ordinalNum);
          html += `<tr><td>${ordinalNum}${suffix}</td><td>${date}</td></tr>`;
        });
        html += "</tbody></table>";
      } else {
        html += "<p>No repeat information available</p>";
      }
    } else {
      html += `<p>${data}</p>`;
    }
    html += "</div>";
    return html;
  }

  // Add helper method for ordinal numbers
  getOrdinalSuffix(num) {
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  }

  setupEventListeners() {
    // Search functionality
    this.searchInput.addEventListener("input", () => this.loadInventory());
    this.searchNoteInput.addEventListener("input", () => this.loadInventory());

    // Rows per page
    this.rowsPerPage.addEventListener("change", () => {
      this.currentPage = 1;
      this.loadInventory();
    });

    // Column selection
    document.addEventListener("change", (e) => {
      if (
        e.target.closest("#columnSelection") &&
        e.target.type === "checkbox"
      ) {
        const columnId = e.target.value;

        // Handle checkbox changes
        if (e.target.checked) {
          // Add column if not already present
          if (!this.selectedColumns.includes(columnId)) {
            this.selectedColumns.push(columnId);
          }
        } else {
          // Only allow unchecking if it's not a default column
          if (!this.selectedColumns.includes(columnId)) {
            this.selectedColumns = this.selectedColumns.filter(
              (col) => col !== columnId
            );
          } else {
            // If it's a default column, keep the checkbox checked
            e.target.checked = true;
            return;
          }
        }

        this.loadInventory();
      }
    });
  }

  sortBy(column) {
    // Remove sort indicators from all columns
    document.querySelectorAll(".sort-icon").forEach((icon) => {
      icon.textContent = "↕";
      icon.classList.remove("active");
    });

    // Update sort state
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    // Update sort indicator for the current column
    const currentIcon = document.querySelector(
      `th[data-column="${column}"] .sort-icon`
    );
    if (currentIcon) {
      currentIcon.textContent = this.sortDirection === "asc" ? "↑" : "↓";
      currentIcon.classList.add("active");
    }

    this.loadInventory();
  }

  filterByGroup(group) {
    this.currentFilter = group;
    this.loadInventory();
    this.updateFilterButtons();
  }

  formatColumnName(name) {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Add this helper method to determine column classes
  getColumnClass(colName) {
    const classes = ["nowrap"];

    // Add specific column classes based on data type
    if (colName === "code_colour") {
      classes.push("code-column");
    } else if (
      ["stock_qty", "receive_qty", "pack_unit", "item_aging"].includes(colName)
    ) {
      classes.push("qty-column");
    } else if (
      [
        "release_date",
        "mfg_date",
        "est_date",
        "arrive_date",
        "delay_date",
        "soldout_date",
        "created_at",
        "updated_at",
      ].includes(colName)
    ) {
      classes.push("date-column");
    } else if (colName === "item_note") {
      classes.push("note-column");
    }

    return classes.join(" ");
  }

  // Add these new methods to the AdminInventory class
  toggleColumnSelection() {
    const panel = document.getElementById("columnSelection");
    const toggleBtn = document.querySelector(".column-toggle-btn");

    panel.classList.toggle("show");
    toggleBtn.classList.toggle("active");
  }

  filterColumns(searchTerm) {
    const options = document.querySelectorAll(".column-option");
    searchTerm = searchTerm.toLowerCase();

    options.forEach((option) => {
      const label = option.querySelector("label").textContent.toLowerCase();
      if (label.includes(searchTerm)) {
        option.style.display = "flex";
      } else {
        option.style.display = "none";
      }
    });
  }

  // Add this method to save column preferences
  saveColumnPreferences() {
    localStorage.setItem(
      "selectedColumns",
      JSON.stringify(this.selectedColumns)
    );
  }

  // Add this method to load column preferences
  loadColumnPreferences() {
    // Ensure default columns are always included
    const currentColumns = new Set(this.selectedColumns);
    this.selectedColumns.forEach((col) => currentColumns.add(col));
    this.selectedColumns = Array.from(currentColumns);

    // Update checkboxes
    document
      .querySelectorAll('#columnSelection input[type="checkbox"]')
      .forEach((checkbox) => {
        // Default columns are always checked and disabled
        if (this.selectedColumns.includes(checkbox.value)) {
          checkbox.checked = true;
          checkbox.disabled = true;
        } else {
          checkbox.checked = this.selectedColumns.includes(checkbox.value);
          checkbox.disabled = false;
        }
      });
  }

  // Handle different types of real-time updates
  handleRealtimeUpdate(payload) {
    try {
      switch (payload.eventType) {
        case "INSERT":
          this.handleInsert(payload.new);
          break;
        case "UPDATE":
          this.handleUpdate(payload.old, payload.new);
          break;
        case "DELETE":
          this.handleDelete(payload.old);
          break;
        default:
          console.warn("Unknown event type:", payload.eventType);
      }
    } catch (error) {
      console.error("Error handling realtime update:", error);
      this.showNotification("Error updating display", "error");
    }
  }

  // Handle new record insertion
  handleInsert(newRecord) {
    // Refresh the entire table to ensure proper sorting and filtering
    this.loadInventory();

    // Show notification
    this.showNotification("New item added", "success");
  }

  // Handle record updates
  handleUpdate(oldRecord, newRecord) {
    // Find and update the specific row if it exists in the current view
    const row = document.querySelector(`tr[data-id="${oldRecord.id}"]`);
    if (row) {
      this.updateTableRow(row, newRecord);
    } else {
      // If row isn't in current view, refresh the whole table
      this.loadInventory();
    }

    // Show notification
    this.showNotification("Item updated", "info");
  }

  // Handle record deletion
  handleDelete(oldRecord) {
    try {
      // Find and remove the specific row if it exists
      const row = document.querySelector(`tr[data-id="${oldRecord.id}"]`);
      if (row) {
        row.remove();
        // Update pagination after row removal
        this.updatePaginationAfterDelete();
        // Show notification
        this.showNotification("Item deleted", "warning");
      } else {
        // If row isn't found, reload the entire table
        this.loadInventory();
      }
    } catch (error) {
      console.error("Error handling delete:", error);
      this.showNotification("Error updating display", "error");
    }
  }

  // Helper method to update a specific table row
  updateTableRow(row, data) {
    // Update action column
    row.querySelector(".action-column").innerHTML = `
            <button onclick="adminInventory.editItem(${data.id})">Edit</button>
            <button onclick="adminInventory.deleteItem(${data.id})">Delete</button>
        `;

    // Update data columns
    this.selectedColumns.forEach((colName) => {
      const cell = row.querySelector(`td[data-column="${colName}"]`);
      if (cell) {
        if (
          [
            "release_date",
            "mfg_date",
            "est_date",
            "arrive_date",
            "delay_date",
            "soldout_date",
            "created_at",
            "updated_at",
          ].includes(colName)
        ) {
          cell.textContent = formatDateToSydney(data[colName]);
        } else if (["pack_size", "repeat_item"].includes(colName)) {
          if (data[colName]) {
            cell.innerHTML = `
                            <button onclick="adminInventory.showModal('${colName}', ${JSON.stringify(
              data[colName]
            ).replace(/"/g, "&quot;")})">
                                View Details
                            </button>
                        `;
          }
        } else if (
          ["stock_qty", "receive_qty", "pack_unit", "item_aging"].includes(
            colName
          )
        ) {
          cell.textContent = data[colName]?.toString() || "0";
          cell.style.textAlign = "right";
        } else {
          cell.textContent = data[colName] || "";
        }
      }
    });
  }

  // Add notification system
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to notification container or create one if it doesn't exist
    let container = document.querySelector(".notification-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "notification-container";
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 3000);
  }

  // Add this new method to update filter button states
  updateFilterButtons() {
    const buttons = document.querySelectorAll(
      ".filter-buttons button:not(.show-soldout-list)"
    );
    buttons.forEach((button) => {
      if (button.textContent === this.currentFilter) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  // Add this new method to create the clear button
  createClearButton() {
    const button = document.createElement("button");
    button.className = "clear-button";
    button.innerHTML = 'Clear All Filters <i class="clear-icon"></i>';
    button.onclick = () => this.clearAllFilters();
    return button;
  }

  // Add this method to clear all filters
  clearAllFilters() {
    // Clear search inputs
    this.searchInput.value = "";
    this.searchNoteInput.value = "";

    // Reset filter to All
    this.currentFilter = "All";
    this.updateFilterButtons();

    // Reset sorting
    //this.sortColumn = "code_colour";
    this.sortColumn = "mfg_date";
    //this.sortDirection = "asc";
    this.sortDirection = "desc";

    // Reset page
    this.currentPage = 1;

    // Reload inventory
    this.loadInventory();

    // Show notification
    this.showNotification("All filters cleared", "info");
  }

  // Add method to update clear button visibility
  updateClearButtonVisibility() {
    // Only check for actual filters, not column selection
    //  this.sortColumn !== "code_colour" ||
    const hasFilters =
      this.searchInput.value.trim() !== "" ||
      this.searchNoteInput.value.trim() !== "" ||
      this.currentFilter.toUpperCase() !== "ALL" ||
      this.sortColumn !== "arrive_date" ||
      this.sortDirection !== "desc";

    this.clearButton.style.display = hasFilters ? "flex" : "none";
  }

  // Add this method to the AdminInventory class
  setupAddItemButtons() {
    const wholesaleButton = document.createElement("button");
    wholesaleButton.className = "add-item-btn wholesale-btn";
    wholesaleButton.innerHTML = '<i class="plus-icon"></i>Add Wholesale Item';
    wholesaleButton.onclick = () => this.showAddItemModal("wholesale");

    const odmButton = document.createElement("button");
    odmButton.className = "add-item-btn odm-btn";
    odmButton.innerHTML = '<i class="plus-icon"></i>Add ODM Item';
    odmButton.onclick = () => this.showAddItemModal("odm");

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "add-item-buttons";
    buttonContainer.appendChild(wholesaleButton);
    buttonContainer.appendChild(odmButton);

    const controlsContainer = document.querySelector(".inventory-controls");
    if (controlsContainer) {
      controlsContainer.insertBefore(
        buttonContainer,
        controlsContainer.firstChild
      );
    }
  }

  // Add this method to handle showing the add item modal
  async showAddItemModal(type) {
    const modal = document.createElement("div");
    modal.className = "modal";

    let itemHandler;
    let form;

    if (type === "wholesale") {
      itemHandler = window.wholesaleItem;
      form = itemHandler.generateItemForm();
    } else if (type === "odm") {
      itemHandler = window.odmItem;
      form = itemHandler.generateItemForm();
    }

    if (!form) {
      console.error("Form generation failed");
      return;
    }

    const modalContent = document.createElement("div");
    modalContent.className = "add-item-modal modal-content";

    // Add close button
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "modal-close";
    closeButton.innerHTML = "&times;";
    closeButton.onclick = () => this.closeModal();

    // Append elements
    modalContent.appendChild(closeButton);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    // Add to document
    document.body.appendChild(modal);

    // Setup event handlers
    if (
      itemHandler &&
      typeof itemHandler.setupFormKeyboardHandler === "function"
    ) {
      itemHandler.setupFormKeyboardHandler(form);
    }

    if (itemHandler && typeof itemHandler.setupInputTrimming === "function") {
      itemHandler.setupInputTrimming(form);
    }
  }

  // Update the closeModal method
  closeModal() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      // Reset form state if it's an add item modal
      const form = modal.querySelector("#addItemForm");
      if (form) {
        if (window.wholesaleItem) {
          window.wholesaleItem.resetForm();
        }
      }

      // Add closing class for animation
      modal.classList.add("closing");

      // Set opacity to trigger fade out
      modal.style.opacity = "0";

      // Remove modal after animation completes
      setTimeout(() => {
        modal.remove();
      }, 300); // Match the CSS transition duration
    });
  }

  // Update the delete method
  async deleteItem(itemId, code) {
    try {
      // Show confirmation dialog
      if (!confirm(`Are you sure you want to delete item ${code}?`)) {
        return;
      }

      // Delete the item
      const { error } = await supabaseClient
        .from("inventory")
        .delete()
        .eq("id", itemId);

      if (error) {
        throw new Error(`Error deleting item: ${error.message}`);
      }

      // Show success notification
      this.showNotification(`Item ${code} deleted successfully`, "success");

      // Reload the inventory table
      await this.loadInventory();
    } catch (error) {
      console.error("Error deleting item:", error);
      this.showNotification(error.message, "error");
    }
  }

  // Add this method to handle pagination after deletion
  updatePaginationAfterDelete() {
    try {
      // Instead of counting DOM elements, reload the inventory
      this.loadInventory();
    } catch (error) {
      console.error("Error updating pagination:", error);
      this.showNotification("Error updating display", "error");
    }
  }

  // Add these new methods to handle Select All and Clear All
  selectAllColumns() {
    const checkboxes = document.querySelectorAll(
      '#columnSelection input[type="checkbox"]:not(:disabled)'
    );
    checkboxes.forEach((checkbox) => {
      if (!checkbox.checked) {
        checkbox.checked = true;
        if (!this.selectedColumns.includes(checkbox.value)) {
          this.selectedColumns.push(checkbox.value);
        }
      }
    });
    this.loadInventory();
  }

  clearAllColumns() {
    const checkboxes = document.querySelectorAll(
      '#columnSelection input[type="checkbox"]:not(:disabled)'
    );
    checkboxes.forEach((checkbox) => {
      if (checkbox.checked && !checkbox.disabled) {
        checkbox.checked = false;
        this.selectedColumns = this.selectedColumns.filter(
          (col) => col !== checkbox.value
        );
      }
    });
    this.loadInventory();
  }

  // Update the renderTableRow method to reorder action buttons
  renderTableRow(data) {
    const visibleColumns = this.getVisibleColumns();
    const row = document.createElement("tr");

    visibleColumns.forEach((columnId) => {
      const cell = document.createElement("td");
      cell.setAttribute("data-column", columnId);

      switch (columnId) {
        // ... existing cases ...

        case "qty_diff":
          const diff = (data.receive_qty || 0) - (data.stock_qty || 0);
          cell.textContent = diff;
          if (diff < 0) {
            cell.style.color = "#dc3545"; // Red for negative difference
          } else if (diff > 0) {
            cell.style.color = "#28a745"; // Green for positive difference
          }
          break;

        case "item_status":
          cell.textContent = data.item_status || "-";
          // Add status-based styling
          if (data.item_status) {
            cell.classList.add(
              `status-${data.item_status.toLowerCase().replace(/\s+/g, "-")}`
            );
          }
          break;

        case "freight_bags":
          cell.textContent = data.freight_bags || "-";
          cell.style.textAlign = "right";
          break;

        // ... rest of the cases ...
      }

      row.appendChild(cell);
    });

    return row;
  }

  // Add new method to create and update the status text
  createStatusText() {
    // Create status text container if it doesn't exist
    let statusText = document.querySelector(".table-status-text");
    if (!statusText) {
      statusText = document.createElement("div");
      statusText.className = "table-status-text";
      // Insert after rows per page selection
      const rowsPerPage = document.getElementById("rowsPerPage");
      rowsPerPage.parentNode.insertBefore(statusText, rowsPerPage.nextSibling);
    }
    return statusText;
  }

  // Update the status text based on current filters and data
  updateStatusText(totalItems) {
    const statusText = this.createStatusText();
    let statusMessage = `Showing ${totalItems} item${
      totalItems !== 1 ? "s" : ""
    }`;

    // Add search terms if any
    const searchTerm = this.searchInput.value.trim();
    const noteSearchTerm = this.searchNoteInput.value.trim();
    if (searchTerm) {
      statusMessage += ` matching "${searchTerm}"`;
    }
    if (noteSearchTerm) {
      statusMessage += ` with note containing "${noteSearchTerm}"`;
    }

    // Add filter group if active
    if (this.currentFilter && this.currentFilter.toUpperCase() !== "ALL") {
      statusMessage += ` in ${this.currentFilter} group`;
    }

    statusText.textContent = statusMessage;
  }

  // Add this method to handle edit button clicks
  async editItem(itemId) {
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

      let form;
      // Choose editor based on item group
      if (["BOHO", "PRIMROSE"].includes(item.item_group?.toUpperCase())) {
        form = await this.loadWholesaleEditor(item);
      } else if (item.item_group?.toUpperCase() === "ODM") {
        form = await this.loadOdmEditor(item);
      }

      if (!form) {
        throw new Error("Unable to load editor");
      }

      const modalContent = document.createElement("div");
      modalContent.className = "modal-content";

      // Add close button
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "modal-close";
      closeButton.innerHTML = "&times;";
      closeButton.onclick = () => this.closeModal();

      // Append elements
      modalContent.appendChild(closeButton);
      modalContent.appendChild(form);
      modal.appendChild(modalContent);

      // Add to document
      document.body.appendChild(modal);
    } catch (error) {
      console.error("Error editing item:", error);
      this.showNotification("Error loading editor", "error");
    }
  }

  // Add helper methods for loading editors
  async loadWholesaleEditor(item) {
    try {
      // Ensure editWholesaleItem is available
      if (!window.editWholesaleItem) {
        throw new Error("Wholesale editor not initialized");
      }

      // Generate and return the form
      return editWholesaleItem.generateEditForm(item);
    } catch (error) {
      console.error("Error loading wholesale editor:", error);
      throw error;
    }
  }

  async loadOdmEditor(item) {
    try {
      // Ensure editOdmItem is available
      if (!window.editOdmItem) {
        throw new Error("ODM editor not initialized");
      }

      // Generate and return the form
      return editOdmItem.generateEditForm(item);
    } catch (error) {
      console.error("Error loading ODM editor:", error);
      throw error;
    }
  }

  // Add this method to the AdminInventory class
  changePage(pageNumber) {
    // Update current page
    this.currentPage = pageNumber;

    // Reload inventory with new page
    this.loadInventory();
  }

  // Add helper method for status class names (same as in soldoutlist.js)
  getStatusClass(status) {
    switch (status?.toUpperCase()) {
      case "NEW RELEASE":
        return "new-release";
      case "FULL PRICE":
        return "full-price";
      case "ON SALE":
        return "on-sale";
      case "OUT OF STOCK":
        return "out-of-stock";
      case "DISPATCHED":
        return "dispatched";
      default:
        return "default";
    }
  }
}

// Initialize only when DOM is loaded
let adminInventory;
document.addEventListener("DOMContentLoaded", () => {
  adminInventory = new AdminInventory();
});
