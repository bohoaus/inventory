class StaffInventoryComponent {
  constructor() {
    this.container = null;
    this.searchInput = null;
    this.searchNoteInput = null;
    this.filterGroup = null;
    this.userRole = "staff";
    this.userEmail = "";
    this.currentPage = 1;
    this.sortColumn = "ReleaseDate";
    this.sortDirection = "desc";
    this.currentFilter = "all";

    // Define all available columns
    this.allColumns = [
      { id: "Code_Colour", label: "Code Color" },
      { id: "Item_Name", label: "Item Name" },
      { id: "BrandGroup", label: "Group" },
      { id: "Location", label: "Location" },
      { id: "Qty", label: "Qty" },
      { id: "Stock", label: "Stock" },
      { id: "ReleaseDate", label: "ReleaseDate" },
      { id: "Item_Aging", label: "Aging" },
      { id: "Status", label: "Status" },
      { id: "Category", label: "Category" },
      { id: "UnitP", label: "Pack Unit" },
      { id: "Pack_Size", label: "Pack Size" },
      { id: "Repeat_Item", label: "RepeatItem" },
      { id: "mfgDate", label: "mfgDate" },
      { id: "Cargo", label: "Cargo" },
      { id: "estDate", label: "EstimatedDate" },
      { id: "ArriveDate", label: "ArriveDate" },
      { id: "DelayDate", label: "Delay Date" },
      { id: "odm_ppo", label: "ODM PPO" },
      { id: "odmCustomer", label: "ODM Customer" },
      { id: "Item_Note", label: "Note" },
      { id: "Created", label: "Created At" },
      { id: "Updated", label: "Updated At" },
      { id: "SoldoutDate", label: "SoldOutDate" },
      { id: "SoldoutStatus", label: "SoldOutStatus" },
      { id: "odmQtyDiff", label: "ODM QtyDiff" },
      { id: "FreightBags", label: "FreightBags" },
    ];

    // Define default columns that cannot be unchecked
    this.defaultColumns = [
      "Code_Colour",
      "Item_Name",
      "Stock",
      "Status",
      "Location",
      "Item_Note",
    ];

    // Initialize selected columns with defaults
    this.selectedColumns = [...this.defaultColumns];
    this.loadColumnPreferences();

    // Add modal templates
    this.modalTemplates = {
      packSize: `
          <div class="Staffinventory-modal" id="packSizeModal">
            <div class="Staffinventory-modal-content">
              <span class="close">&times;</span>
              <h2>Pack Size Details</h2>
              <div class="Staffinventory-json-grid" id="packSizeGrid"></div>
            </div>
          </div>
        `,
      repeatItem: `
          <div class="Staffinventory-modal" id="repeatItemModal">
            <div class="Staffinventory-modal-content">
              <span class="close">&times;</span>
              <h2>Repeat Item Details</h2>
              <div class="Staffinventory-json-grid" id="repeatItemGrid"></div>
            </div>
          </div>
        `,
    };
  }

  async initialize(containerId) {
    console.log("Initializing inventory component...");

    // Get DOM elements
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error("Container not found:", containerId);
      return;
    }

    // Create UI elements
    this.createUIElements(this.container);

    // Get current user and role
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();
    if (sessionError || !session) {
      console.error("Error getting session:", sessionError?.message);
      window.location.href = "/index.html";
      return;
    }

    console.log("Session found:", session);

    // Set user email from session
    this.userEmail = session.user.email;
    this.userRole = "sales"; // Default to sales role

    // Add export PDF button click handler
    const exportBtn = document.querySelector(".export-pdf-btn");
    if (exportBtn) {
      console.log("Adding export button handler");
      exportBtn.addEventListener("click", () => {
        console.log("Export button clicked");
        this.showExportDialog();
      });
    } else {
      console.error("Export button not found");
    }

    // Load initial data
    console.log("Loading inventory data...");
    await this.loadInventory();

    // Setup event listeners
    this.setupEventListeners();
    this.setupRealtimeSubscription();
  }

  createUIElements(container) {
    container.innerHTML = `
        <div class="Staffinventory-controls">
          <div class="Staffinventory-search-filter">
            <input type="text" id="searchInventory" placeholder="Search by code or name...">
            <input type="text" id="searchNote" placeholder="Search by note...">
            <div class="Staffinventory-filter-buttons">
              <button class="Staffinventory-filter-btn" data-filter="repeat">Repeat Items</button>
              <button class="Staffinventory-group-btn" data-group="BOHO">BOHO</button>
              <button class="Staffinventory-group-btn" data-group="PRIMROSE">PRIMROSE</button>
              <button class="Staffinventory-group-btn" data-group="ODM">ODM</button>
            </div>
            <select id="categoryFilter">
              <option value="">All Categories</option>
            </select>
            <select id="statusFilter">
              <option value="">All Statuses</option>
            </select>
            <button class="Staffinventory-clear-btn" onclick="window.staffInventoryComponent.clearAllFilters()">
              Clear All Filters
            </button>
          </div>
          <div class="Staffinventory-display-controls">
            <button class="export-pdf-btn" onclick="window.staffInventoryComponent.showExportDialog()">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="Staffinventory-column-toggle-btn" onclick="window.staffInventoryComponent.toggleColumnSelection()">
              Select Columns <i class="Staffinventory-toggle-icon"></i>
            </button>
            <select id="rowsPerPage">
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
          ${this.createColumnSelectionHTML()}
        </div>
        <div class="Staffinventory-records-info"></div>
        <div class="Staffinventory-table-container">
          <table class="Staffinventory-table" id="inventoryTable">
            <thead>
              <tr>
                <th class="Staffinventory-th">Actions</th>
                ${this.selectedColumns
                  .map(
                    (col) => `
                  <th class="Staffinventory-th" onclick="window.staffInventoryComponent.sortBy('${col}')">
                    ${this.formatColumnName(col)}
                    <span class="Staffinventory-sort-icon">↕</span>
                  </th>
                `
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        ${this.createModalHTML()}
      `;

    this.searchInput = document.getElementById("searchInventory");
    this.searchNoteInput = document.getElementById("searchNote");
    this.categoryFilter = document.getElementById("categoryFilter");
    this.statusFilter = document.getElementById("statusFilter");
    this.rowsPerPage = document.getElementById("rowsPerPage");

    // Populate filters
    this.populateFilters();

    // Add export PDF button click handler
    const exportBtn = container.querySelector(".export-pdf-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.showExportDialog());
    }
  }

  async populateFilters() {
    try {
      // Get unique categories
      const { data: categories } = await supabaseClient
        .from("inventory")
        .select("Category")
        .not("Category", "is", null);

      const uniqueCategories = [
        ...new Set(categories.map((item) => item.Category)),
      ].sort();
      uniqueCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        this.categoryFilter.appendChild(option);
      });

      // Get unique statuses
      const { data: statuses } = await supabaseClient
        .from("inventory")
        .select("Status")
        .not("Status", "is", null);

      const uniqueStatuses = [
        ...new Set(statuses.map((item) => item.Status)),
      ].sort();
      uniqueStatuses.forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        this.statusFilter.appendChild(option);
      });
    } catch (error) {
      console.error("Error populating filters:", error);
    }
  }

  setupEventListeners() {
    // Search inputs
    this.searchInput.addEventListener("input", () => this.loadInventory());
    this.searchNoteInput.addEventListener("input", () => this.loadInventory());

    // Filters
    this.categoryFilter.addEventListener("change", () => this.loadInventory());
    this.statusFilter.addEventListener("change", () => this.loadInventory());

    // Group buttons
    document.querySelectorAll(".Staffinventory-group-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const group = e.target.dataset.group;
        this.filterByGroup(group);
      });
    });

    // Rows per page
    this.rowsPerPage.addEventListener("change", () => {
      this.currentPage = 1;
      this.loadInventory();
    });

    // Update column selection selectors
    document
      .getElementById("columnSelection")
      .addEventListener("change", (e) => {
        if (e.target.type === "checkbox") {
          const columnId = e.target.value;
          if (e.target.checked) {
            if (!this.selectedColumns.includes(columnId)) {
              this.selectedColumns.push(columnId);
            }
          } else {
            this.selectedColumns = this.selectedColumns.filter(
              (col) => col !== columnId
            );
          }
          this.saveColumnPreferences();
          this.loadInventory();
        }
      });

    // Update outside click handler
    document.addEventListener("click", (e) => {
      const panel = document.getElementById("columnSelection");
      const toggleBtn = document.querySelector(
        ".Staffinventory-column-toggle-btn"
      );
      if (
        panel &&
        toggleBtn &&
        !panel.contains(e.target) &&
        !toggleBtn.contains(e.target)
      ) {
        panel.classList.remove("show");
        toggleBtn.classList.remove("active");
      }
    });

    // Add event listener for repeat items filter
    document
      .querySelector('[data-filter="repeat"]')
      .addEventListener("click", (e) => {
        const btn = e.target;
        btn.classList.toggle("active");
        this.loadInventory();
      });
  }

  async loadInventory() {
    try {
      let query = supabaseClient.from("inventory").select("*");

      // Apply search filters
      const searchTerm = this.searchInput.value.trim().toLowerCase();
      const noteSearchTerm = this.searchNoteInput.value.trim().toLowerCase();

      if (searchTerm) {
        query = query.or(
          `Code_Colour.ilike.%${searchTerm}%,Item_Name.ilike.%${searchTerm}%`
        );
      }

      if (noteSearchTerm) {
        query = query.ilike("Item_Note", `%${noteSearchTerm}%`);
      }

      // Apply category filter
      const categoryFilter = document.getElementById("categoryFilter").value;
      if (categoryFilter) {
        query = query.eq("Category", categoryFilter);
      }

      // Apply status filter
      const statusFilter = document.getElementById("statusFilter").value;
      if (statusFilter) {
        query = query.eq("Status", statusFilter);
      }

      // Apply group filter
      if (this.currentFilter !== "all") {
        query = query.eq("BrandGroup", this.currentFilter);
      }

      // Apply repeat items filter
      const repeatFilterBtn = document.querySelector('[data-filter="repeat"]');
      if (repeatFilterBtn && repeatFilterBtn.classList.contains("active")) {
        query = query.not("Repeat_Item", "is", null);
      }

      // Get the data
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Sort the data
      const sortedData = this.sortData(data);

      // Apply pagination
      const itemsPerPage = parseInt(this.rowsPerPage.value);
      const startIndex = (this.currentPage - 1) * itemsPerPage;
      const paginatedData = sortedData.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      // Update the table with paginated data
      this.renderInventoryTable(paginatedData);

      // Update records info
      this.updateRecordsInfo(data.length, sortedData.length);

      // Render pagination controls
      this.renderPagination(sortedData.length);
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
  }

  sortData(data) {
    return data.sort((a, b) => {
      let aValue = a[this.sortColumn];
      let bValue = b[this.sortColumn];

      // Check for null/empty/0 values
      const isAEmpty = aValue === null || aValue === "" || aValue === 0;
      const isBEmpty = bValue === null || bValue === "" || bValue === 0;

      // If both are empty, maintain relative order
      if (isAEmpty && isBEmpty) return 0;

      // Empty values go to the bottom regardless of sort direction
      if (isAEmpty) return 1;
      if (isBEmpty) return -1;

      // For non-empty values, proceed with normal sorting
      const direction = this.sortDirection === "asc" ? 1 : -1;

      if (this.sortColumn === "Stock") {
        return (Number(aValue) - Number(bValue)) * direction;
      }

      // For string comparison, convert to lowercase for case-insensitive sorting
      return (
        String(aValue)
          .toLowerCase()
          .localeCompare(String(bValue).toLowerCase()) * direction
      );
    });
  }

  renderInventoryTable(data) {
    const tableBody = document.querySelector(".Staffinventory-table tbody");
    const thead = document.querySelector(".Staffinventory-table thead");

    // Update table header
    thead.innerHTML = `
        <tr>
          <th class="Staffinventory-th">Actions</th>
          ${this.selectedColumns
            .map(
              (col) => `
            <th class="Staffinventory-th" onclick="window.staffInventoryComponent.sortBy('${col}')">
              ${this.formatColumnName(col)}
              <span class="Staffinventory-sort-icon">↕</span>
            </th>
          `
            )
            .join("")}
        </tr>
      `;

    tableBody.innerHTML = "";

    if (!data || data.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="${
        this.selectedColumns.length + 1
      }" class="Staffinventory-no-data">No items found</td>`;
      tableBody.appendChild(row);
      return;
    }

    data.forEach((item) => {
      const row = document.createElement("tr");
      row.className = "Staffinventory-tr";

      // Add action button first
      const actionCell = document.createElement("td");
      actionCell.className = "Staffinventory-td";
      actionCell.innerHTML = `
          <button class="Staffinventory-view-btn" onclick="window.staffInventoryComponent.viewDetails('${item.id}')">
            View Details
          </button>
        `;
      row.appendChild(actionCell);

      // Add data cells
      this.selectedColumns.forEach((col) => {
        const td = document.createElement("td");
        td.className = `Staffinventory-td ${this.getColumnClass(col)}`;

        if (col === "Stock") {
          td.textContent = item[col] || "0";
          td.style.textAlign = "right";
        } else if (col === "Status") {
          td.textContent = item[col] || "";
          td.classList.add(
            `Staffinventory-status-${this.getStatusClass(item[col])}`
          );
        } else if (this.isDateColumn(col)) {
          td.textContent = this.formatDate(item[col]);
        } else if (col === "Pack_Size" || col === "Repeat_Item") {
          const value = item[col];
          if (value && Object.keys(value).length > 0) {
            td.innerHTML = `
                <button class="Staffinventory-json-view-btn" onclick="window.staffInventoryComponent.viewJsonData('${col}', '${btoa(
              JSON.stringify(value)
            )}')">
                  View ${this.formatColumnName(col)}
                </button>
              `;
          } else {
            td.textContent = "-";
          }
        } else {
          td.textContent = item[col] || "";
        }

        row.appendChild(td);
      });

      tableBody.appendChild(row);
    });
  }

  isDateColumn(columnName) {
    return [
      "ReleaseDate",
      "mfgDate",
      "estDate",
      "ArriveDate",
      "DelayDate",
      "Created",
      "Updated",
      "SoldoutDate",
    ].includes(columnName);
  }

  formatDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-AU", {
        timeZone: "Australia/Sydney",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  }

  renderPagination(totalItems) {
    const itemsPerPage = parseInt(this.rowsPerPage.value);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const paginationContainer = document.createElement("div");
    paginationContainer.className = "Staffinventory-pagination";

    // Previous button
    const prevButton = document.createElement("button");
    prevButton.textContent = "Previous";
    prevButton.className = "Staffinventory-pagination-btn";
    prevButton.disabled = this.currentPage === 1;
    prevButton.onclick = () => this.changePage(this.currentPage - 1);
    paginationContainer.appendChild(prevButton);

    // Calculate page range to display
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust start if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    // First page
    if (startPage > 1) {
      const firstButton = document.createElement("button");
      firstButton.textContent = "1";
      firstButton.className = "Staffinventory-pagination-btn";
      firstButton.onclick = () => this.changePage(1);
      paginationContainer.appendChild(firstButton);

      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.className = "Staffinventory-pagination-ellipsis";
        paginationContainer.appendChild(ellipsis);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement("button");
      pageButton.textContent = i;
      pageButton.className = "Staffinventory-pagination-btn";
      if (i === this.currentPage) {
        pageButton.classList.add("Staffinventory-pagination-active");
      }
      pageButton.onclick = () => this.changePage(i);
      paginationContainer.appendChild(pageButton);
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.className = "Staffinventory-pagination-ellipsis";
        paginationContainer.appendChild(ellipsis);
      }

      const lastButton = document.createElement("button");
      lastButton.textContent = totalPages;
      lastButton.className = "Staffinventory-pagination-btn";
      lastButton.onclick = () => this.changePage(totalPages);
      paginationContainer.appendChild(lastButton);
    }

    // Next button
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.className = "Staffinventory-pagination-btn";
    nextButton.disabled = this.currentPage === totalPages;
    nextButton.onclick = () => this.changePage(this.currentPage + 1);
    paginationContainer.appendChild(nextButton);

    // Replace existing pagination
    const existingPagination = document.querySelector(
      ".Staffinventory-pagination"
    );
    if (existingPagination) {
      existingPagination.remove();
    }
    this.container.appendChild(paginationContainer);
  }

  changePage(page) {
    this.currentPage = page;
    this.loadInventory();
  }

  filterByGroup(group) {
    this.currentFilter = group;
    document.querySelectorAll(".Staffinventory-group-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.group === group);
    });
    this.loadInventory();
  }

  sortBy(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    // Update sort indicators
    document.querySelectorAll(".Staffinventory-sort-icon").forEach((icon) => {
      icon.textContent = "↕";
    });
    const currentIcon = document.querySelector(
      `th[onclick*="${column}"] .Staffinventory-sort-icon`
    );
    if (currentIcon) {
      currentIcon.textContent = this.sortDirection === "asc" ? "↑" : "↓";
    }

    this.loadInventory();
  }

  getColumnClass(colName) {
    const classes = ["Staffinventory-td"];
    if (colName === "Code_Colour") classes.push("Staffinventory-code");
    if (colName === "Stock") classes.push("Staffinventory-qty");
    if (colName === "Item_Note") classes.push("Staffinventory-note");
    return classes.join(" ");
  }

  getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case "out of stock":
        return "out";
      case "low stock":
        return "low";
      case "in stock":
        return "in";
      default:
        return "";
    }
  }

  formatColumnName(name) {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  async viewDetails(id) {
    try {
      const { data: item, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Basic Information
      document.getElementById("detailCode").textContent =
        item.Code_Colour || "";
      document.getElementById("detailName").textContent = item.Item_Name || "";
      document.getElementById("detailGroup").textContent =
        item.BrandGroup || "";
      document.getElementById("detailCategory").textContent =
        item.Category || "";
      document.getElementById("detailStatus").textContent =
        item.Status || "";
      document.getElementById("detailLocation").textContent =
        item.Location || "";
      document.getElementById("detailNote").textContent = item.Item_Note || "";

      // Stock Information
      document.getElementById("detailStock").textContent =
        item.Stock || "0";
      document.getElementById("detailReceiveQty").textContent =
        item.Qty || "0";
      document.getElementById("detailPackUnit").textContent =
        item.UnitP || "";

      // Pack Size and Repeat Item with new format
      const packSizeContainer = document.getElementById("detailPackSize");
      packSizeContainer.innerHTML = item.Pack_Size
        ? this.renderJsonGrid(item.Pack_Size, "Pack_Size")
        : "-";

      const repeatItemContainer = document.getElementById("detailRepeatItem");
      repeatItemContainer.innerHTML = item.Repeat_Item
        ? this.renderJsonGrid(item.Repeat_Item, "Repeat_Item")
        : "-";

      document.getElementById("detailAging").textContent =
        item.Item_Aging || "";

      // Dates
      const dateFields = [
        "ReleaseDate",
        "mfgDate",
        "estDate",
        "ArriveDate",
        "DelayDate",
        "SoldoutDate",
        "Created",
        "Updated",
      ];
      dateFields.forEach((field) => {
        const element = document.getElementById(
          `detail${this.formatColumnName(field).replace(/\s/g, "")}`
        );
        if (element && item[field]) {
          element.textContent = this.formatDate(item[field]);
        } else if (element) {
          element.textContent = "-";
        }
      });

      // ODM Information
      document.getElementById("detailOdmPpo").textContent = item.odm_ppo || "";
      document.getElementById("detailOdmCustomer").textContent =
        item.odmCustomer || "";
      document.getElementById("detailOdmQtyDiff").textContent =
        item.odmQtyDiff || "";
      document.getElementById("detailCargo").textContent =
        item.Cargo || "";
      document.getElementById("detailFreightBags").textContent =
        item.FreightBags || "";
      document.getElementById("detailSoldoutStatus").textContent =
        item.SoldoutStatus || "";

      const modal = document.getElementById("detailsModal");
      modal.style.display = "block";

      // Add close button event listener
      const closeBtn = modal.querySelector(".close");
      closeBtn.onclick = () => (modal.style.display = "none");

      // Close modal when clicking outside
      window.onclick = (event) => {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      };
    } catch (error) {
      console.error("Error fetching item details:", error);
    }
  }

  setupRealtimeSubscription() {
    supabaseClient
      .channel("inventory_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => this.loadInventory()
      )
      .subscribe();
  }

  // Add column selection methods
  toggleColumnSelection() {
    const panel = document.getElementById("columnSelection");
    panel.classList.toggle("show");
    document
      .querySelector(".Staffinventory-column-toggle-btn")
      .classList.toggle("active");
  }

  filterColumns(searchTerm) {
    const options = document.querySelectorAll(".Staffinventory-column-option");
    searchTerm = searchTerm.toLowerCase();
    options.forEach((option) => {
      const label = option.querySelector("label").textContent.toLowerCase();
      option.style.display = label.includes(searchTerm) ? "flex" : "none";
    });
  }

  selectAllColumns() {
    const checkboxes = document.querySelectorAll(
      '#columnSelection input[type="checkbox"]:not(:disabled)'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
      if (!this.selectedColumns.includes(checkbox.value)) {
        this.selectedColumns.push(checkbox.value);
      }
    });
    this.saveColumnPreferences();
    this.renderInventoryTable(this.lastData || []); // Re-render with last data
    this.loadInventory();
  }

  clearAllColumns() {
    const checkboxes = document.querySelectorAll(
      '#columnSelection input[type="checkbox"]:not(:disabled)'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
      this.selectedColumns = this.selectedColumns.filter((col) =>
        this.defaultColumns.includes(col)
      );
    });
    this.saveColumnPreferences();
    this.renderInventoryTable(this.lastData || []); // Re-render with last data
    this.loadInventory();
  }

  saveColumnPreferences() {
    localStorage.setItem(
      "selectedColumns",
      JSON.stringify(this.selectedColumns)
    );
  }

  loadColumnPreferences() {
    const savedColumns = localStorage.getItem("selectedColumns");
    if (savedColumns) {
      const parsedColumns = JSON.parse(savedColumns);
      // Ensure default columns are always included
      this.selectedColumns = [
        ...new Set([...this.defaultColumns, ...parsedColumns]),
      ];
    }
  }

  clearAllFilters() {
    // Clear search inputs
    this.searchInput.value = "";
    this.searchNoteInput.value = "";

    // Reset filters
    this.categoryFilter.value = "";
    this.statusFilter.value = "";

    // Reset group buttons
    this.currentFilter = "all";
    document.querySelectorAll(".Staffinventory-group-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Reset repeat items filter
    document
      .querySelector('[data-filter="repeat"]')
      ?.classList.remove("active");

    // Reset page
    this.currentPage = 1;

    // Reload inventory
    this.loadInventory();
  }

  updateRecordsInfo(totalRecords, filteredRecords) {
    const recordsInfo = document.querySelector(".Staffinventory-records-info");
    const start = (this.currentPage - 1) * parseInt(this.rowsPerPage.value) + 1;
    const end = Math.min(
      start + parseInt(this.rowsPerPage.value) - 1,
      filteredRecords
    );

    // Get active filters
    const activeFilters = [];

    // Search terms
    const searchTerm = this.searchInput.value.trim();
    const noteSearchTerm = this.searchNoteInput.value.trim();
    if (searchTerm) {
      activeFilters.push(
        `matching "<strong>${searchTerm}</strong>" in code/name`
      );
    }
    if (noteSearchTerm) {
      activeFilters.push(
        `note containing "<strong>${noteSearchTerm}</strong>"`
      );
    }

    // Category and Status filters
    const categoryFilter = this.categoryFilter.value;
    const statusFilter = this.statusFilter.value;
    if (categoryFilter) {
      activeFilters.push(`category "<strong>${categoryFilter}</strong>"`);
    }
    if (statusFilter) {
      activeFilters.push(`status "<strong>${statusFilter}</strong>"`);
    }

    // Group filter
    if (this.currentFilter !== "all") {
      activeFilters.push(`group "<strong>${this.currentFilter}</strong>"`);
    }

    // Build the filter info text
    let filterInfo = "";
    if (activeFilters.length > 0) {
      filterInfo = `<br>Filters: ${activeFilters.join(", ")}`;
    }

    recordsInfo.innerHTML = `
        <div class="Staffinventory-records-count">
          Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${filteredRecords}</strong> filtered records (Total: <strong>${totalRecords}</strong> records)${filterInfo}
        </div>
      `;
  }

  viewJsonData(type, encodedData) {
    try {
      const data = JSON.parse(atob(encodedData));
      const modalId =
        type === "Pack_Size" ? "packSizeModal" : "repeatItemModal";
      const gridId = type === "Pack_Size" ? "packSizeGrid" : "repeatItemGrid";

      // Ensure modal exists
      let modal = document.getElementById(modalId);
      if (!modal) {
        document.body.insertAdjacentHTML(
          "beforeend",
          this.modalTemplates[type === "Pack_Size" ? "packSize" : "repeatItem"]
        );
        modal = document.getElementById(modalId);

        // Add close button event listener
        const closeBtn = modal.querySelector(".close");
        closeBtn.onclick = () => (modal.style.display = "none");

        // Close modal when clicking outside
        window.onclick = (event) => {
          if (event.target === modal) {
            modal.style.display = "none";
          }
        };
      }

      // Render JSON data in grid with the correct type
      const grid = document.getElementById(gridId);
      grid.innerHTML = this.renderJsonGrid(data, type);

      // Show modal
      modal.style.display = "block";
    } catch (error) {
      console.error("Error displaying JSON data:", error);
    }
  }

  renderJsonGrid(data, type) {
    if (typeof data !== "object" || data === null) {
      return '<div class="Staffinventory-json-row">No data available</div>';
    }

    if (type === "Pack_Size") {
      return `
        <table class="Staffinventory-json-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(data)
              .map(
                ([size, amount]) => `
                <tr>
                  <td>${size}</td>
                  <td>${amount}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      `;
    } else if (type === "Repeat_Item") {
      return `
        <table class="Staffinventory-json-table">
          <thead>
            <tr>
              <th>Times</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(data)
              .map(
                ([key, date], index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${this.formatDate(date)}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    // Default table format for other JSON data
    return `
      <table class="Staffinventory-json-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data)
            .map(
              ([key, value]) => `
              <tr>
                <td>${this.formatColumnName(key)}</td>
                <td>${value}</td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  createColumnSelectionHTML() {
    return `
        <div id="columnSelection" class="Staffinventory-column-selection">
          <div class="Staffinventory-column-search">
            <input type="text" placeholder="Search columns..." onkeyup="window.staffInventoryComponent.filterColumns(this.value)">
          </div>
          <div class="Staffinventory-column-actions">
            <button onclick="window.staffInventoryComponent.selectAllColumns()">Select All</button>
            <button onclick="window.staffInventoryComponent.clearAllColumns()">Clear All</button>
          </div>
          <div class="Staffinventory-column-list">
            ${this.allColumns
              .map(
                (col) => `
              <div class="Staffinventory-column-option" data-column="${col.id}">
                <input type="checkbox" 
                       id="col_${col.id}" 
                       value="${col.id}"
                       ${
                         this.defaultColumns.includes(col.id)
                           ? "disabled checked"
                           : ""
                       }
                       ${
                         this.selectedColumns.includes(col.id) ? "checked" : ""
                       }>
                <label for="col_${col.id}">
                  ${col.label}
                  ${
                    this.defaultColumns.includes(col.id)
                      ? '<span class="Staffinventory-required">*</span>'
                      : ""
                  }
                </label>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
  }

  createModalHTML() {
    return `
        <div class="Staffinventory-modal" id="detailsModal">
          <div class="Staffinventory-modal-content">
            <span class="close">&times;</span>
            <h2>Item Details</h2>
            <div id="itemDetails">
              <div class="Staffinventory-detail-section">
                <h3>Basic Information</h3>
                <div class="Staffinventory-detail-group">
                  <div class="Staffinventory-detail-row">
                    <label>Code:</label>
                    <span id="detailCode"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Name:</label>
                    <span id="detailName"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Group:</label>
                    <span id="detailGroup"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Category:</label>
                    <span id="detailCategory"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Status:</label>
                    <span id="detailStatus"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Location:</label>
                    <span id="detailLocation"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Note:</label>
                    <span id="detailNote"></span>
                  </div>
                </div>
              </div>
  
              <div class="Staffinventory-detail-section">
                <h3>Stock Information</h3>
                <div class="Staffinventory-detail-group">
                  <div class="Staffinventory-detail-row">
                    <label>Stock Quantity:</label>
                    <span id="detailStock"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Receive Quantity:</label>
                    <span id="detailReceiveQty"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Pack Unit:</label>
                    <span id="detailPackUnit"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Pack Size:</label>
                    <div id="detailPackSize" class="Staffinventory-json-container"></div>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Repeat Item:</label>
                    <div id="detailRepeatItem" class="Staffinventory-json-container"></div>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Item Aging:</label>
                    <span id="detailAging"></span>
                  </div>
                </div>
              </div>
  
              <div class="Staffinventory-detail-section">
                <h3>Dates</h3>
                <div class="Staffinventory-detail-group">
                  <div class="Staffinventory-detail-row">
                    <label>Release Date:</label>
                    <span id="detailStock"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Manufacture Date:</label>
                    <span id="detailMfgDate"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Estimated Date:</label>
                    <span id="detailEstDate"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Arrive Date:</label>
                    <span id="detailArriveDate"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Delay Date:</label>
                    <span id="detailDelayDate"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Sold Out Date:</label>
                    <span id="detailSoldoutDate"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Created At:</label>
                    <span id="detailCreatedAt"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Updated At:</label>
                    <span id="detailUpdatedAt"></span>
                  </div>
                </div>
              </div>
  
              <div class="Staffinventory-detail-section">
                <h3>Other Information</h3>
                <div class="Staffinventory-detail-group">
                  <div class="Staffinventory-detail-row">
                    <label>ODM PPO:</label>
                    <span id="detailOdmPpo"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>ODM Customer:</label>
                    <span id="detailOdmCustomer"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>ODM Qty Diff:</label>
                    <span id="detailOdmQtyDiff"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Item Cargo:</label>
                    <span id="detailCargo"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Freight Bags:</label>
                    <span id="detailFreightBags"></span>
                  </div>
                  <div class="Staffinventory-detail-row">
                    <label>Sold Out Status:</label>
                    <span id="detailSoldoutStatus"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
  }

  async showExportDialog() {
    // Remove any existing dialog and backdrop first
    const existingDialog = document.querySelector(".export-pdf-dialog");
    const existingBackdrop = document.querySelector(".export-pdf-backdrop");
    if (existingDialog) existingDialog.remove();
    if (existingBackdrop) existingBackdrop.remove();

    // Create backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "export-pdf-backdrop";
    document.body.appendChild(backdrop);

    const dialog = document.createElement("div");
    dialog.className = "export-pdf-dialog";
    dialog.innerHTML = `
        <h2>Export Staff Inventory PDF</h2>
        <div class="export-pdf-options">
          <div class="export-option-group">
            <h3>Page Settings</h3>
            <div>
              <label>
                <input type="radio" name="orientation" value="portrait" checked> Portrait
              </label>
              <label>
                <input type="radio" name="orientation" value="landscape"> Landscape
              </label>
            </div>
          </div>
  
          <div class="export-option-group">
            <h3>Columns</h3>
            <div class="export-columns">
              ${this.allColumns
                .map(
                  (col) => `
                <label>
                  <input type="checkbox" name="export_columns" value="${col.id}"
                    ${this.selectedColumns.includes(col.id) ? "checked" : ""}>
                  ${col.label}
                </label>
              `
                )
                .join("")}
            </div>
          </div>
  
          <div class="export-option-group">
            <h3>Filters</h3>
            <div>
              <label>Category:</label>
              <select id="exportCategory">
                <option value="">All Categories</option>
                ${Array.from(this.categoryFilter.options)
                  .map(
                    (opt) => `<option value="${opt.value}">${opt.text}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div>
              <label>Status:</label>
              <select id="exportStatus">
                <option value="">All Statuses</option>
                ${Array.from(this.statusFilter.options)
                  .map(
                    (opt) => `<option value="${opt.value}">${opt.text}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div>
              <label>Group:</label>
              <select id="exportGroup">
                <option value="all">All Groups</option>
                <option value="BOHO">BOHO</option>
                <option value="PRIMROSE">PRIMROSE</option>
                <option value="ODM">ODM</option>
              </select>
            </div>
          </div>
  
          <div class="export-option-group">
            <h3>Sort By</h3>
            <div>
              <select id="exportSortColumn">
                ${this.allColumns
                  .map(
                    (col) => `
                  <option value="${col.id}" ${
                      col.id === this.sortColumn ? "selected" : ""
                    }>
                    ${col.label}
                  </option>
                `
                  )
                  .join("")}
              </select>
              <select id="exportSortDirection">
                <option value="asc" ${
                  this.sortDirection === "asc" ? "selected" : ""
                }>Ascending</option>
                <option value="desc" ${
                  this.sortDirection === "desc" ? "selected" : ""
                }>Descending</option>
              </select>
            </div>
          </div>
        </div>
  
        <div class="export-warning">
          Warning: Selected columns may exceed page width. Consider using landscape orientation or selecting fewer columns.
        </div>
  
        <div class="export-preview">
          <h3>Preview</h3>
          <div id="exportPreviewContent"></div>
        </div>
  
        <div class="export-dialog-buttons">
          <button class="export-cancel-btn">Cancel</button>
          <button class="export-confirm-btn">Export PDF</button>
        </div>
      `;

    document.body.appendChild(dialog);

    // Function to close dialog
    const closeDialog = () => {
      dialog.remove();
      backdrop.remove();
    };

    // Add event listeners
    dialog
      .querySelector(".export-cancel-btn")
      .addEventListener("click", closeDialog);
    backdrop.addEventListener("click", closeDialog);

    dialog
      .querySelector(".export-confirm-btn")
      .addEventListener("click", async () => {
        const orientation = dialog.querySelector(
          'input[name="orientation"]:checked'
        ).value;
        const selectedColumns = Array.from(
          dialog.querySelectorAll('input[name="export_columns"]:checked')
        ).map((cb) => cb.value);
        const category = dialog.querySelector("#exportCategory").value;
        const status = dialog.querySelector("#exportStatus").value;
        const group = dialog.querySelector("#exportGroup").value;
        const sortColumn = dialog.querySelector("#exportSortColumn").value;
        const sortDirection = dialog.querySelector(
          "#exportSortDirection"
        ).value;

        // Get filtered and sorted data
        let query = supabaseClient
          .from("inventory")
          .select(selectedColumns.join(","));

        if (category) query = query.eq("Category", category);
        if (status) query = query.eq("Status", status);
        if (group !== "all") query = query.eq("BrandGroup", group);

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching data for PDF:", error);
          return;
        }

        // Sort data
        const sortedData = this.sortExportData(data, sortColumn, sortDirection);

        // Generate PDF
        const success = await window.staffInventoryExport.generatePDF(
          sortedData,
          {
            orientation,
            columns: selectedColumns,
            filters: {
              category,
              status,
              group,
            },
          }
        );

        if (success) {
          closeDialog();
        }
      });

    // Add event listeners for preview updates with debounce
    let debounceTimer;
    const updatePreviewDebounced = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.updateExportPreview(), 300);
    };

    dialog.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("change", updatePreviewDebounced);
    });

    // Initial preview update
    await this.updateExportPreview();
  }

  sortExportData(data, sortColumn, sortDirection) {
    return data.sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle empty values
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      // Compare values
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      return sortDirection === "asc"
        ? aValue > bValue
          ? 1
          : -1
        : aValue < bValue
        ? 1
        : -1;
    });
  }

  async updateExportPreview() {
    const dialog = document.querySelector(".export-pdf-dialog");
    if (!dialog) return; // Exit if dialog is not present

    const previewContent = dialog.querySelector("#exportPreviewContent");
    if (!previewContent) return; // Exit if preview content container is not found

    const selectedColumns = Array.from(
      dialog.querySelectorAll('input[name="export_columns"]:checked')
    ).map((cb) => cb.value);

    // Check if too many columns are selected
    const warning = dialog.querySelector(".export-warning");
    const orientation = dialog.querySelector(
      'input[name="orientation"]:checked'
    ).value;
    const maxColumns = orientation === "portrait" ? 6 : 10;
    if (warning) {
      warning.style.display =
        selectedColumns.length > maxColumns ? "block" : "none";
    }

    try {
      // Get filtered data for preview
      const category = dialog.querySelector("#exportCategory")?.value || "";
      const status = dialog.querySelector("#exportStatus")?.value || "";
      const group = dialog.querySelector("#exportGroup")?.value || "all";
      const sortColumn =
        dialog.querySelector("#exportSortColumn")?.value || "Code_Colour";
      const sortDirection =
        dialog.querySelector("#exportSortDirection")?.value || "asc";

      let query = supabaseClient
        .from("inventory")
        .select(selectedColumns.join(","));

      if (category) query = query.eq("Category", category);
      if (status) query = query.eq("Status", status);
      if (group !== "all") query = query.eq("BrandGroup", group);

      const { data, error } = await query.limit(5);

      if (error) {
        console.error("Preview error:", error);
        previewContent.innerHTML =
          '<div class="error">Error loading preview</div>';
        return;
      }

      // Sort preview data
      const sortedData = this.sortExportData(data, sortColumn, sortDirection);

      // Render preview table
      previewContent.innerHTML = `
            <table>
                <thead>
                    <tr>
                        ${selectedColumns
                          .map(
                            (col) => `
                            <th>${this.formatColumnName(col)}</th>
                        `
                          )
                          .join("")}
                    </tr>
                </thead>
                <tbody>
                    ${sortedData
                      .map(
                        (item) => `
                        <tr>
                            ${selectedColumns
                              .map(
                                (col) => `
                                <td>${this.formatPreviewValue(
                                  item[col],
                                  col
                                )}</td>
                            `
                              )
                              .join("")}
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
            <div style="margin-top: 10px; font-style: italic;">Showing first 5 records</div>
        `;
    } catch (error) {
      console.error("Error updating preview:", error);
      previewContent.innerHTML =
        '<div class="error">Error loading preview</div>';
    }
  }

  formatPreviewValue(value, column) {
    if (value === null || value === undefined) return "-";
    if (this.isDateColumn(column)) return this.formatDate(value);
    if (column === "Pack_Size" || column === "Repeat_Item") {
      return value ? "JSON data" : "-";
    }
    return value;
  }
}

// Create global instance
const staffInventoryComponent = new StaffInventoryComponent();
window.staffInventoryComponent = staffInventoryComponent;
