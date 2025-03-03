class SalesOrdersComponent {
  constructor() {
    this.container = null;
    this.searchInput = null;
    this.searchItemCode = null;
    this.statusFilter = null;
    this.agentStateFilter = null;
    this.rowsPerPage = null;
    this.currentPage = 1;
    this.sortColumn = "orderdate";
    this.sortDirection = "desc";
    this.currentFilter = "all";

    // Define the initial table structure
    this.tableStructure = [
      { id: "actions", name: "Actions", locked: true },
      { id: "orderdate", name: "OrderDate", locked: true, isDate: true },
      { id: "opo", name: "PO#", locked: true },
      { id: "ocountry", name: "Country", locked: true },
      { id: "customer_name", name: "Customer Name", locked: true },
      { id: "order_type", name: "Order Type", locked: true },
      { id: "status", name: "Status", locked: true },
      { id: "agent_state", name: "Agent State", locked: true },
      { id: "total_items", name: "T-Items", locked: true },
      { id: "order_note", name: "Order Note", locked: true },
      { id: "dispatched_state", name: "D-State" },
      { id: "invoice_no", name: "Invoice#" },
      { id: "tracking_no", name: "Tracking#" },
      { id: "ocountry", name: "Country", locked: true },
    ];

    // Optional columns that can be added
    this.optionalColumns = [
      { id: "removed_items", name: "Removed Items" },
      { id: "dispatched_carrier", name: "Dispatched Carrier" },
      { id: "dispatched_box", name: "Dispatched Box" },
      { id: "cancelled_at", name: "Cancelled At", isDate: true },
      { id: "dispatched_at", name: "Dispatched At", isDate: true },
      { id: "created_at", name: "Created At", locked: true, isDate: true },
      { id: "updated_at", name: "Updated At", isDate: true },
    ];

    // Initialize selected columns with required columns
    this.selectedColumns = new Set(this.tableStructure.map((col) => col.id));
  }

  async initialize(containerId) {
    console.log("Initializing sales orders component...");

    // Get DOM elements
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error("Container not found:", containerId);
      return;
    }

    // Create UI elements first
    this.createUIElements();

    // Remove any existing modal
    const existingModal = document.getElementById("orderDetailsModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create and add modal HTML to document body
    const modalHTML = this.createModalHTML();
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    console.log("Modal HTML added to document body");

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

    // Load initial data
    await this.loadOrders();

    // Setup event listeners
    this.setupEventListeners();
    this.setupRealtimeSubscription();
  }

  createUIElements() {
    // Create table structure
    this.container.innerHTML = `
      <div class="Salesorders-controls">
        <div class="Salesorders-search-filter">
          <input type="text" placeholder="Search by customer name" class="Salesorders-search">
          <input type="text" placeholder="Search by item code" class="Salesorders-item-search">
          <select class="Salesorders-status-filter">
            <option value="">All Status</option>
            <option value="PICKING">PICKING</option>
            <option value="AWAITING PAYMENT">AWAITING PAYMENT</option>
            <option value="WHOLESALE ON HOLD">WHOLESALE ON HOLD</option>
            <option value="ODM ON HOLD">ODM ON HOLD</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <select class="Salesorders-agent-state-filter">
            <option value="">All Agent States</option>
            <option value="AUS-ACT">AUS-ACT</option>
            <option value="AUS-NSW">AUS-NSW</option>
            <option value="AUS-NT">AUS-NT</option>
            <option value="AUS-QLD">AUS-QLD</option>
            <option value="AUS-SA">AUS-SA</option>
            <option value="AUS-TAS">AUS-TAS</option>
            <option value="AUS-VIC">AUS-VIC</option>
            <option value="AUS-WA">AUS-WA</option>
          </select>
          <button class="Salesorders-clear-btn">Clear Filters</button>
        </div>
        <div class="Salesorders-group-buttons">
          <button class="Salesorders-group-btn" data-type="wholesale">WHOLESALE</button>
          <button class="Salesorders-group-btn" data-type="odm">ODM</button>
        </div>
        <div class="Salesorders-display-controls">
          <select class="Salesorders-rows-per-page">
            <option value="10" selected>10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          <button class="Salesorders-column-select-btn">Select Columns</button>
          <div class="Salesorders-column-selection">
            <div class="column-search">
              <input type="text" placeholder="Search columns">
            </div>
            <div class="column-select-actions">
              <button id="selectAllColumns">Select All</button>
              <button id="clearAllColumns">Clear All</button>
            </div>
            <div class="column-options"></div>
          </div>
        </div>
      </div>
      <div class="Salesorders-records-info"></div>
      <div class="Salesorders-table-wrapper">
        <div class="Salesorders-table-container">
          <table class="Salesorders-table">
            <thead>
              <tr></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div class="Salesorders-pagination"></div>
    `;

    // Get references to elements
    this.searchInput = this.container.querySelector(".Salesorders-search");
    this.searchItemCode = this.container.querySelector(
      ".Salesorders-item-search"
    );
    this.statusFilter = this.container.querySelector(
      ".Salesorders-status-filter"
    );
    this.agentStateFilter = this.container.querySelector(
      ".Salesorders-agent-state-filter"
    );
    this.rowsPerPage = this.container.querySelector(
      ".Salesorders-rows-per-page"
    );
    this.columnSelectBtn = this.container.querySelector(
      ".Salesorders-column-select-btn"
    );
    this.columnSelection = this.container.querySelector(
      ".Salesorders-column-selection"
    );

    // Setup column selection
    this.setupColumnSelection();

    // Update table headers
    this.updateTableHeaders();

    // Add clear filters button handler
    const clearBtn = this.container.querySelector(".Salesorders-clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearAllFilters());
    }
  }

  setupColumnSelection() {
    const columnOptions = document.querySelector(".column-options");
    const selectAllBtn = document.getElementById("selectAllColumns");
    const clearAllBtn = document.getElementById("clearAllColumns");
    const columnSearchInput = document.querySelector(".column-search input");

    if (!columnOptions || !selectAllBtn || !clearAllBtn) return;

    // Clear existing options
    columnOptions.innerHTML = "";

    // Combine all columns for the selection menu
    const allColumns = [
      ...this.tableStructure.filter((col) => col.id !== "actions"),
      ...this.optionalColumns,
    ];

    // Create checkbox for each column
    allColumns.forEach((column) => {
      const option = document.createElement("div");
      option.className = "column-option";

      const isLocked = this.tableStructure.find(
        (col) => col.id === column.id
      )?.locked;
      const isSelected = this.selectedColumns.has(column.id);

      option.innerHTML = `
        <input type="checkbox" 
               id="col_${column.id}" 
               ${isLocked ? "checked disabled" : ""}
               ${isSelected ? "checked" : ""}>
        <label for="col_${column.id}">${column.name}</label>
      `;

      if (!isLocked) {
        option.querySelector("input").addEventListener("change", (e) => {
          if (e.target.checked) {
            this.selectedColumns.add(column.id);
          } else {
            this.selectedColumns.delete(column.id);
          }
          this.updateTableHeaders();
          this.loadOrders();
        });
      }

      columnOptions.appendChild(option);
    });

    // Setup column search functionality
    if (columnSearchInput) {
      columnSearchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll(".column-option").forEach((option) => {
          const label = option.querySelector("label").textContent.toLowerCase();
          option.style.display = label.includes(searchTerm) ? "" : "none";
        });
      });
    }

    // Setup select all button
    selectAllBtn.addEventListener("click", () => this.selectAllColumns());

    // Setup clear all button
    clearAllBtn.addEventListener("click", () => this.clearAllColumns());

    // Column select button click handler
    this.columnSelectBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.columnSelection.classList.toggle("show");
    });

    // Click outside to close column selection
    document.addEventListener("click", (e) => {
      if (
        !this.columnSelection.contains(e.target) &&
        !this.columnSelectBtn.contains(e.target)
      ) {
        this.columnSelection.classList.remove("show");
      }
    });
  }

  updateTableHeaders() {
    const headerRow = document.querySelector(".Salesorders-table thead tr");
    if (!headerRow) return;

    headerRow.innerHTML = "";

    // Add all selected columns
    [...this.tableStructure, ...this.optionalColumns].forEach((column) => {
      if (this.selectedColumns.has(column.id)) {
        const th = document.createElement("th");
        th.className = "Salesorders-th";
        if (column.id !== "actions") {
          th.setAttribute(
            "onclick",
            `window.salesOrdersComponent.sortBy('${column.id}')`
          );
          th.innerHTML = `
            ${column.name}
            <span class="Salesorders-sort-icon">↕</span>
          `;
        } else {
          th.textContent = column.name;
        }
        headerRow.appendChild(th);
      }
    });
  }

  setupEventListeners() {
    // Search inputs
    this.searchInput.addEventListener("input", () => this.loadOrders());
    this.searchItemCode.addEventListener("input", () => this.loadOrders());

    // Filters
    this.statusFilter.addEventListener("change", () => this.loadOrders());
    this.agentStateFilter.addEventListener("change", () => this.loadOrders());

    // Type filter buttons
    document.querySelectorAll(".Salesorders-group-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const type = e.target.dataset.type;
        document.querySelectorAll(".Salesorders-group-btn").forEach((b) => {
          b.classList.toggle("active", b === e.target);
        });
        this.currentFilter = type === this.currentFilter ? "all" : type;
        this.loadOrders();
      });
    });

    // Rows per page
    this.rowsPerPage.addEventListener("change", () => {
      this.currentPage = 1;
      this.loadOrders();
    });
  }

  async loadOrders() {
    try {
      console.log("Loading orders...");
      console.log("Current filter:", this.currentFilter);
      console.log("Sort column:", this.sortColumn);
      console.log("Sort direction:", this.sortDirection);

      // Get total count
      const { count: totalCount } = await supabaseClient
        .from("orders")
        .select("*", { count: "exact", head: true });

      console.log("Total count:", totalCount);

      // Build query
      let query = supabaseClient
        .from("orders")
        .select("*, order_items(*)", { count: "exact" });

      // Apply filters
      const searchTerm = this.searchInput.value.trim().toLowerCase();
      const itemCodeTerm = this.searchItemCode.value.trim().toLowerCase();
      const statusFilter = this.statusFilter.value;
      const agentStateFilter = this.agentStateFilter.value;

      console.log("Applied filters:", {
        searchTerm,
        itemCodeTerm,
        statusFilter,
        agentStateFilter,
      });

      if (searchTerm) {
        query = query.ilike("customer_name", `%${searchTerm}%`);
      }

      if (itemCodeTerm) {
        // First, find orders with matching items
        const { data: matchingItems } = await supabaseClient
          .from("order_items")
          .select("order_id")
          .ilike("item_name", `%${itemCodeTerm}%`);

        if (matchingItems && matchingItems.length > 0) {
          // Get unique order IDs
          const orderIds = [
            ...new Set(matchingItems.map((item) => item.order_id)),
          ];
          // Filter orders by these IDs
          query = query.in("id", orderIds);
        } else {
          // No matching items found
          this.renderOrdersTable([]);
          this.updateRecordsInfo(totalCount, 0);
          return;
        }
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      if (this.currentFilter !== "all") {
        query = query.eq("order_type", this.currentFilter.toUpperCase());
      }

      if (agentStateFilter) {
        query = query.eq("agent_state", agentStateFilter);
      }

      // Add sorting with NULLS LAST
      query = query.order(this.sortColumn, {
        ascending: this.sortDirection === "asc",
        nullsFirst: false,
      });

      console.log("Executing query...");
      // Execute query
      const { data, error, count: filteredCount } = await query;

      if (error) {
        console.error("Error loading orders:", error);
        return;
      }

      console.log("Orders loaded:", data?.length || 0);
      console.log("First order:", data?.[0]);

      // Custom sort for empty strings and zero values
      if (data) {
        data.sort((a, b) => {
          const aVal = a[this.sortColumn];
          const bVal = b[this.sortColumn];

          // Handle null, undefined, empty string, and 0 values
          const isAEmpty =
            aVal === null || aVal === undefined || aVal === "" || aVal === 0;
          const isBEmpty =
            bVal === null || bVal === undefined || bVal === "" || bVal === 0;

          // Put empty values at the bottom
          if (isAEmpty && !isBEmpty) return 1;
          if (!isAEmpty && isBEmpty) return -1;
          if (isAEmpty && isBEmpty) return 0;

          // For dates
          if (this.sortColumn.includes("_at")) {
            const dateA = new Date(aVal);
            const dateB = new Date(bVal);
            return this.sortDirection === "asc" ? dateA - dateB : dateB - dateA;
          }

          // For numbers
          if (typeof aVal === "number" && typeof bVal === "number") {
            return this.sortDirection === "asc" ? aVal - bVal : bVal - aVal;
          }

          // For strings (case-insensitive)
          const strA = String(aVal).toLowerCase();
          const strB = String(bVal).toLowerCase();
          return this.sortDirection === "asc"
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA);
        });
      }

      // Update records info
      this.updateRecordsInfo(totalCount, filteredCount || 0);

      // Apply pagination
      const itemsPerPage = parseInt(this.rowsPerPage.value);
      const startIndex = (this.currentPage - 1) * itemsPerPage;
      const paginatedData = data
        ? data.slice(startIndex, startIndex + itemsPerPage)
        : [];

      console.log("Paginated data:", {
        itemsPerPage,
        startIndex,
        displayedOrders: paginatedData.length,
      });

      // Render table
      this.renderOrdersTable(paginatedData);

      // Update pagination
      this.renderPagination(filteredCount || 0);
    } catch (error) {
      console.error("Error in loadOrders:", error);
    }
  }

  renderOrdersTable(orders) {
    console.log("Rendering orders table with", orders?.length || 0, "orders");
    const tableBody = document.querySelector(".Salesorders-table tbody");

    if (!orders || orders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="${this.getVisibleColumnsCount()}" class="Salesorders-no-data">No orders found</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = orders
      .map((order) => {
        let cells = "";
        [...this.tableStructure, ...this.optionalColumns].forEach((column) => {
          if (this.selectedColumns.has(column.id)) {
            if (column.id === "actions") {
              cells += `
                <td class="Salesorders-td" data-column="actions">
                  <button class="Salesorders-view-btn" data-id="${order.id}">
                    View Details
                  </button>
                </td>
              `;
            } else if (column.isDate) {
              cells += `
                <td class="Salesorders-td" data-column="${column.id}">
                  ${order[column.id] ? this.formatDate(order[column.id]) : "-"}
                </td>
              `;
            } else if (column.id === "status") {
              cells += `
                <td class="Salesorders-td" data-column="${column.id}">
                  <span class="Salesorders-status-${order.status
                    ?.toLowerCase()
                    ?.replace(/\s+/g, "-")}">
                    ${order.status || "-"}
                  </span>
                </td>
              `;
            } else {
              cells += `
                <td class="Salesorders-td" data-column="${column.id}">
                  ${order[column.id] || "-"}
                </td>
              `;
            }
          }
        });
        return `<tr class="Salesorders-tr">${cells}</tr>`;
      })
      .join("");

    // Add click event listeners to view buttons after rendering
    document.querySelectorAll(".Salesorders-view-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const orderId = e.target.dataset.id;
        console.log("View button clicked for order:", orderId);
        this.viewDetails(orderId);
      });
    });
  }

  async viewDetails(orderId) {
    console.log("View details clicked for order:", orderId);
    try {
      const modal = document.getElementById("orderDetailsModal");
      if (!modal) {
        console.error("Modal element not found in the DOM");
        return;
      }
      console.log("Modal element found");

      // Fetch order details with all order items
      const { data: order, error } = await supabaseClient
        .from("orders")
        .select(
          `
          *,
          order_items (
            id,
            order_id,
            item_name,
            oicolour,
            oisales,
            order_qty,
            total_pieces,
            order_item_status,
            created_at,
            updated_at
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("Error fetching order details:", error);
        throw error;
      }
      console.log("Order details fetched:", order);
      console.log("Order items:", order.order_items);

      // Update modal content
      const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value || "-";
        } else {
          console.error(`Element not found: ${id}`);
        }
      };

      // Update all order details
      const orderFields = [
        { key: "customer_name", label: "Customer" },
        { key: "order_type", label: "Type" },
        { key: "orderdate", label: "OrderDate" },
        { key: "ocountry", label: "Country" },
        { key: "status", label: "Status" },
        { key: "agent_state", label: "AgentState" },
        { key: "dispatched_state", label: "DispatchState" },
        { key: "dispatched_carrier", label: "DispatchCarrier" },
        { key: "dispatched_box", label: "DispatchBox" },
        { key: "total_items", label: "TotalItems" },
        { key: "removed_items", label: "RemovedItems" },
        { key: "invoice_no", label: "InvoiceNo" },
        { key: "tracking_no", label: "TrackingNo" },
        { key: "order_note", label: "Notes" },
        { key: "created_at", label: "Created", isDate: true },
        { key: "updated_at", label: "Updated", isDate: true },
        { key: "dispatched_at", label: "DispatchedAt", isDate: true },
        { key: "cancelled_at", label: "CancelledAt", isDate: true },
      ];

      orderFields.forEach(({ key, label, isDate }) => {
        const value = order[key];
        if (isDate) {
          updateElement(`detail${label}`, value ? this.formatDate(value) : "-");
        } else {
          updateElement(`detail${label}`, value || "-");
        }
      });

      // Sort order items by status and date
      const sortedItems = [...order.order_items].sort((a, b) => {
        // First sort by status (active first)
        if (
          a.order_item_status === "active" &&
          b.order_item_status !== "active"
        )
          return -1;
        if (
          a.order_item_status !== "active" &&
          b.order_item_status === "active"
        )
          return 1;

        // Then sort by date (newest first)
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });

      // Render order items
      const itemsTable = document.getElementById("orderItemsTable");
      if (!itemsTable) {
        console.error("Items table element not found");
        return;
      }

      itemsTable.innerHTML = `
        <thead>
          <tr>
            <th>Item</th>
            <th>Colour</th>
            <th>Sales</th>
            <th>Packs</th>
            <th>Qty</th>
            <th>AddedAt</th>
            <th>RemovedAt</th>
          </tr>
        </thead>
        <tbody>
          ${sortedItems
            .map((item) => {
              console.log("Processing item:", item);
              console.log("Item status:", item.order_item_status);
              console.log("Item updated_at:", item.updated_at);
              const isRemoved = item.order_item_status === "REMOVED";
              return `
              <tr class="Salesorders-item-${
                item.order_item_status || "removed"
              }">
                <td>${item.item_name || "-"}</td>
                <td>${item.oicolour || "-"}</td>
                <td>${item.oisales || "-"}</td>
                <td>${item.order_qty || "-"}</td>
                <td>${item.total_pieces || "-"}</td>
                <td>${
                  item.created_at ? this.formatDate(item.created_at) : "-"
                }</td>
                <td>${
                  isRemoved && item.updated_at
                    ? this.formatDate(item.updated_at)
                    : "-"
                }</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      `;

      console.log("Order items table rendered");

      // Show modal
      modal.style.display = "block";
      modal.style.zIndex = "1000";
      console.log("Modal displayed");

      // Setup close handlers
      const closeModal = () => {
        modal.style.display = "none";
        console.log("Modal closed");
      };

      // Close button handler
      const closeBtn = modal.querySelector(".close");
      if (closeBtn) {
        closeBtn.onclick = closeModal;
      }

      // Click outside modal to close
      modal.onclick = (event) => {
        if (event.target === modal) {
          closeModal();
        }
      };

      // Escape key to close
      const escHandler = (event) => {
        if (event.key === "Escape" && modal.style.display === "block") {
          closeModal();
          document.removeEventListener("keydown", escHandler);
        }
      };
      document.addEventListener("keydown", escHandler);
    } catch (error) {
      console.error("Error in viewDetails:", error);
    }
  }

  setupRealtimeSubscription() {
    supabaseClient
      .channel("orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => this.loadOrders()
      )
      .subscribe();
  }

  filterByGroup(group) {
    this.currentFilter = group;
    document.querySelectorAll(".Salesorders-group-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.group === group);
    });
    this.loadOrders();
  }

  sortBy(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    // Update sort indicators
    document.querySelectorAll(".Salesorders-sort-icon").forEach((icon) => {
      icon.textContent = "↕";
      icon.classList.remove("active");
    });

    const currentIcon = document.querySelector(
      `th[onclick*="${column}"] .Salesorders-sort-icon`
    );
    if (currentIcon) {
      currentIcon.textContent = this.sortDirection === "asc" ? "↑" : "↓";
      currentIcon.classList.add("active");
    }

    this.loadOrders();
  }

  formatDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
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
    paginationContainer.className = "Salesorders-pagination";

    // Previous button
    const prevButton = document.createElement("button");
    prevButton.textContent = "Previous";
    prevButton.className = "Salesorders-pagination-btn";
    prevButton.disabled = this.currentPage === 1;
    prevButton.onclick = () => this.changePage(this.currentPage - 1);
    paginationContainer.appendChild(prevButton);

    // Calculate page range
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
      firstButton.className = "Salesorders-pagination-btn";
      firstButton.onclick = () => this.changePage(1);
      paginationContainer.appendChild(firstButton);

      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.className = "Salesorders-pagination-ellipsis";
        paginationContainer.appendChild(ellipsis);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement("button");
      pageButton.textContent = i;
      pageButton.className = "Salesorders-pagination-btn";
      if (i === this.currentPage) {
        pageButton.classList.add("Salesorders-pagination-active");
      }
      pageButton.onclick = () => this.changePage(i);
      paginationContainer.appendChild(pageButton);
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.className = "Salesorders-pagination-ellipsis";
        paginationContainer.appendChild(ellipsis);
      }

      const lastButton = document.createElement("button");
      lastButton.textContent = totalPages;
      lastButton.className = "Salesorders-pagination-btn";
      lastButton.onclick = () => this.changePage(totalPages);
      paginationContainer.appendChild(lastButton);
    }

    // Next button
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.className = "Salesorders-pagination-btn";
    nextButton.disabled = this.currentPage === totalPages;
    nextButton.onclick = () => this.changePage(this.currentPage + 1);
    paginationContainer.appendChild(nextButton);

    // Replace existing pagination
    const existingPagination = document.querySelector(
      ".Salesorders-pagination"
    );
    if (existingPagination) {
      existingPagination.remove();
    }
    this.container.appendChild(paginationContainer);
  }

  changePage(page) {
    this.currentPage = page;
    this.loadOrders();
  }

  clearAllFilters() {
    // Clear search inputs
    this.searchInput.value = "";
    this.searchItemCode.value = "";

    // Reset filters
    this.statusFilter.value = "";
    this.agentStateFilter.value = "";

    // Reset type filter buttons
    document.querySelectorAll(".Salesorders-group-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    this.currentFilter = "all";

    // Reset page
    this.currentPage = 1;

    // Reload orders
    this.loadOrders();
  }

  updateRecordsInfo(totalRecords, filteredRecords) {
    const recordsInfo = document.querySelector(".Salesorders-records-info");
    const start = (this.currentPage - 1) * parseInt(this.rowsPerPage.value) + 1;
    const end = Math.min(
      start + parseInt(this.rowsPerPage.value) - 1,
      filteredRecords
    );

    // Get active filters
    const activeFilters = [];

    // Search terms
    const searchTerm = this.searchInput.value.trim();
    if (searchTerm) {
      activeFilters.push(`customer name "<strong>${searchTerm}</strong>"`);
    }

    const itemCodeTerm = this.searchItemCode.value.trim();
    if (itemCodeTerm) {
      activeFilters.push(`item code "<strong>${itemCodeTerm}</strong>"`);
    }

    // Status filter
    const statusFilter = this.statusFilter.value;
    if (statusFilter) {
      activeFilters.push(`status "<strong>${statusFilter}</strong>"`);
    }

    // Type filter
    if (this.currentFilter !== "all") {
      activeFilters.push(`type "<strong>${this.currentFilter}</strong>"`);
    }

    // State filter
    const stateFilter = this.agentStateFilter.value;
    if (stateFilter) {
      activeFilters.push(
        `state "<strong>${stateFilter.toUpperCase()}</strong>"`
      );
    }

    // Build the filter info text
    let filterInfo = "";
    if (activeFilters.length > 0) {
      filterInfo = `<br>Filters: ${activeFilters.join(", ")}`;
    }

    recordsInfo.innerHTML = `
      <div class="Salesorders-records-count">
        Showing <strong>${
          filteredRecords === 0 ? 0 : start
        }</strong> to <strong>${end}</strong> of <strong>${filteredRecords}</strong> filtered records (Total: <strong>${totalRecords}</strong> records)${filterInfo}
      </div>
    `;
  }

  getVisibleColumnsCount() {
    return [...this.tableStructure, ...this.optionalColumns].filter((col) =>
      this.selectedColumns.has(col.id)
    ).length;
  }

  selectAllColumns() {
    this.optionalColumns.forEach((col) => {
      this.selectedColumns.add(col.id);
    });
    this.updateColumnCheckboxes();
    this.updateTableHeaders();
    this.loadOrders();
  }

  clearAllColumns() {
    this.optionalColumns.forEach((col) => {
      this.selectedColumns.delete(col.id);
    });
    // Keep locked columns
    this.tableStructure
      .filter((col) => col.locked)
      .forEach((col) => {
        this.selectedColumns.add(col.id);
      });
    this.updateColumnCheckboxes();
    this.updateTableHeaders();
    this.loadOrders();
  }

  updateColumnCheckboxes() {
    document
      .querySelectorAll(".column-option input[type='checkbox']")
      .forEach((checkbox) => {
        const columnId = checkbox.id.replace("col_", "");
        if (!this.tableStructure.find((col) => col.id === columnId)?.locked) {
          checkbox.checked = this.selectedColumns.has(columnId);
        }
      });
  }

  createModalHTML() {
    return `
      <div class="Salesorders-modal" id="orderDetailsModal">
        <div class="Salesorders-modal-content">
          <span class="close">&times;</span>
          <h2>Order Details</h2>
          <div id="orderDetails">
            <div class="Salesorders-detail-section">
              <h3>Order Information</h3>
              <div class="Salesorders-detail-group">
                <div class="Salesorders-detail-row">
                  <label>Customer Name:</label>
                  <span style="color:blue" id="detailCustomer"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Order Type:</label>
                  <span id="detailType"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Status:</label>
                  <span id="detailStatus"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>AgentState:</label>
                  <span id="detailAgentState"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>DispatchState:</label>
                  <span id="detailDispatchState"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>DispatchCarrier:</label>
                  <span id="detailDispatchCarrier"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Dispatch Box:</label>
                  <span id="detailDispatchBox"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>T-Items:</label>
                  <span id="detailTotalItems"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>RemovedItems:</label>
                  <span id="detailRemovedItems"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Invoice#:</label>
                  <span id="detailInvoiceNo"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Tracking#:</label>
                  <span id="detailTrackingNo"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Order Note:</label>
                  <span id="detailNotes"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Created At:</label>
                  <span id="detailCreated"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>Updated At:</label>
                  <span id="detailUpdated"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>DispatchedAt:</label>
                  <span id="detailDispatchedAt"></span>
                </div>
                <div class="Salesorders-detail-row">
                  <label>CancelledAt:</label>
                  <span id="detailCancelledAt"></span>
                </div>
              </div>
            </div>

            <div class="Salesorders-detail-section">
              <h3>Order Items</h3>
              <div class="Salesorders-detail-group">
                <table id="orderItemsTable" class="Salesorders-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Colour</th>
                      <th>Packs</th>
                      <th>Pieces</th>
                      <th>Added At</th>
                      <th>Removed</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Create global instance
const salesOrdersComponent = new SalesOrdersComponent();
window.salesOrdersComponent = salesOrdersComponent;
