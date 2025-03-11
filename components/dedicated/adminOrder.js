//It's ok on 11/03/2025

class AdminOrder {
  constructor() {
    // Define the initial table structure
    this.tableStructure = [
      { id: "actions", name: "Actions", locked: true },
      { id: "orderdate", name: "OrderDate", locked: true, isDate: true },
      { id: "order_type", name: "Order Type", locked: true },
      { id: "status", name: "Status", locked: true },
      { id: "customer_name", name: "Customer Name", locked: true },
      { id: "agent_state", name: "Agent State", locked: true },
      { id: "total_items", name: "T-Items", locked: true },
      { id: "order_note", name: "Order Note", locked: true },
      { id: "dispatched_state", name: "D-State" },
      { id: "invoice_no", name: "Invoice No" },
      { id: "tracking_no", name: "Tracking No" },
    ];

    // Optional columns that can be added
    this.optionalColumns = [
      { id: "removed_items", name: "Removed Items" },
      { id: "dispatched_carrier", name: "Dispatched Carrier" },
      { id: "dispatched_box", name: "Dispatched Box" },
      { id: "cancelled_at", name: "Cancelled At", isDate: true },
      { id: "dispatched_at", name: "Dispatched At", isDate: true },
      { id: "ouser", name: "User" },
      { id: "created_at", name: "Created At", locked: true, isDate: true },
      { id: "updated_at", name: "Updated At", isDate: true },
    ];

    // Initialize selected columns with required columns
    this.selectedColumns = new Set(this.tableStructure.map((col) => col.id));

    this.currentPage = 1;
    this.rowsPerPage = 10;

    // Add sorting state
    this.sortColumn = "orderdate";
    this.sortDirection = "desc";

    // Check if Supabase is already initialized
    if (window.supabaseClient) {
      this.initializeOrder();
      return;
    }

    // Wait for Supabase to be ready
    window.addEventListener(
      "supabaseReady",
      () => {
        this.initializeOrder();
      },
      { once: true }
    ); // Only listen once

    this.searchItemCode = null;
  }

  initializeOrder() {
    // Get all required DOM elements first
    this.orderTable = document.getElementById("orderTable");
    this.searchInput = document.getElementById("searchOrder");
    this.searchItemCode = document.getElementById("searchItemCode");
    this.filterSelect = document.getElementById("filterOrder");
    this.filterOrderType = document.getElementById("filterOrderType");
    this.filterAgentState = document.getElementById("filterAgentState");
    this.columnSelectBtn = document.getElementById("columnSelectBtn");
    this.columnSelection = document.getElementById("columnSelection");
    this.rowsPerPageSelect = document.getElementById("rowsPerPage");
    this.pagination = document.getElementById("tablePagination");
    this.addWholesaleBtn = document.getElementById("addWholesaleBtn");
    this.addOdmBtn = document.getElementById("addOdmBtn");

    // Add refresh button next to add ODM button
    const refreshBtn = document.createElement("button");
    refreshBtn.className = "refresh-btn";
    refreshBtn.innerHTML =
      '<span class="material-icons">refresh</span> Refresh';
    refreshBtn.style.cssText = `
      padding: 8px 16px;
      margin-left: 10px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: background-color 0.3s;
    `;
    refreshBtn.addEventListener("mouseover", () => {
      refreshBtn.style.backgroundColor = "#45a049";
    });
    refreshBtn.addEventListener("mouseout", () => {
      refreshBtn.style.backgroundColor = "#4CAF50";
    });
    refreshBtn.addEventListener("click", () => this.refreshPage());

    // Add weekly summary button
    const weeklySummaryBtn = document.createElement("button");
    weeklySummaryBtn.className = "weekly-summary-btn";
    weeklySummaryBtn.innerHTML =
      '<span class="material-icons">assessment</span> Weekly Sales Report';
    weeklySummaryBtn.style.cssText = `
      padding: 8px 16px;
      margin-left: 10px;
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: background-color 0.3s;
    `;
    weeklySummaryBtn.addEventListener("mouseover", () => {
      weeklySummaryBtn.style.backgroundColor = "#1976D2";
    });
    weeklySummaryBtn.addEventListener("mouseout", () => {
      weeklySummaryBtn.style.backgroundColor = "#2196F3";
    });
    weeklySummaryBtn.addEventListener("click", () => {
      if (!window.weeklySummary) {
        window.weeklySummary = new WeeklySummary();
      }
      window.weeklySummary.initialize();
    });

    // Add order contribution button
    const orderContributionBtn = document.createElement("button");
    orderContributionBtn.className = "order-contribution-btn";
    orderContributionBtn.innerHTML =
      '<span class="material-icons">pie_chart</span> Orders Contribution';
    orderContributionBtn.style.cssText = `
      padding: 8px 16px;
      margin-left: 10px;
      background-color: #9C27B0;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: background-color 0.3s;
    `;
    orderContributionBtn.addEventListener("mouseover", () => {
      orderContributionBtn.style.backgroundColor = "#7B1FA2";
    });
    orderContributionBtn.addEventListener("mouseout", () => {
      orderContributionBtn.style.backgroundColor = "#9C27B0";
    });
    orderContributionBtn.addEventListener("click", () => {
      if (!window.orderContribution) {
        window.orderContribution = new OrderContribution();
      }
      window.orderContribution.initialize();
    });

    // Insert refresh button after add ODM button
    this.addOdmBtn.parentNode.insertBefore(
      refreshBtn,
      this.addOdmBtn.nextSibling
    );

    // Insert weekly summary button after refresh button
    refreshBtn.parentNode.insertBefore(
      weeklySummaryBtn,
      refreshBtn.nextSibling
    );

    // Insert order contribution button after weekly summary button
    weeklySummaryBtn.parentNode.insertBefore(
      orderContributionBtn,
      weeklySummaryBtn.nextSibling
    );

    // Check if all required elements exist
    if (
      !this.orderTable ||
      !this.searchInput ||
      !this.searchItemCode ||
      !this.filterSelect ||
      !this.filterOrderType ||
      !this.filterAgentState ||
      !this.columnSelectBtn ||
      !this.columnSelection ||
      !this.rowsPerPageSelect ||
      !this.pagination ||
      !this.addWholesaleBtn ||
      !this.addOdmBtn
    ) {
      console.error("Required DOM elements not found");
      return;
    }

    // Then initialize everything
    this.setupColumnSelection();
    this.setupPagination();
    this.setupEventListeners();
    this.initialize();
  }

  async initialize() {
    // Call updateTableHeaders before loading orders
    this.updateTableHeaders();
    await this.loadOrders();
    this.setupRealtimeSubscription();
  }

  setupEventListeners() {
    // Search functionality
    this.searchInput.addEventListener("input", () => this.loadOrders());

    // Filter functionality
    this.filterSelect.addEventListener("change", () => this.loadOrders());
    this.filterOrderType.addEventListener("change", () => this.loadOrders());
    this.filterAgentState.addEventListener("change", () => this.loadOrders());

    // Add item code search listener
    this.searchItemCode.addEventListener("input", () => {
      this.currentPage = 1; // Reset to first page when searching
      this.loadOrders();
    });

    // Rows per page change
    this.rowsPerPageSelect.addEventListener("change", (e) => {
      this.rowsPerPage = parseInt(e.target.value);
      this.currentPage = 1;
      this.loadOrders();
    });

    // Column selection button
    this.columnSelectBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.columnSelection.classList.toggle("show");
    });

    // Add wholesale order button listener
    if (this.addWholesaleBtn) {
      this.addWholesaleBtn.addEventListener("click", () =>
        this.showWholesaleOrderDialog()
      );
    }

    // Add ODM order button listener
    if (this.addOdmBtn) {
      this.addOdmBtn.addEventListener("click", () => this.showOdmOrderDialog());
    }

    // Modal close handlers
    const wholesaleModal = document.getElementById("wholesaleOrderModal");
    const editWholesaleModal = document.getElementById(
      "editWholesaleOrderModal"
    );
    const editOdmModal = document.getElementById("editOdmOrderModal");

    // Setup modal close buttons
    [wholesaleModal, editWholesaleModal, editOdmModal].forEach((modal) => {
      if (modal) {
        const closeBtn = modal.querySelector(".close");
        if (closeBtn) {
          closeBtn.onclick = () => {
            modal.style.display = "none";
          };
        }
      }
    });

    // Close modals when clicking outside
    window.onclick = (event) => {
      if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
      }
    };

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

  async loadOrders() {
    try {
      // Show loading state
      const tableBody = this.orderTable.querySelector("tbody");
      tableBody.innerHTML =
        '<tr><td colspan="100%" class="loading-message">Loading orders...</td></tr>';

      // Get current filters
      const searchTerm = this.searchInput.value.toLowerCase();
      const itemCodeTerm = this.searchItemCode.value.trim();
      const statusFilter = this.filterSelect.value;
      const typeFilter = this.filterOrderType.value;
      const agentStateFilter = this.filterAgentState.value;

      // Build query with count option
      let query = supabaseClient.from("orders").select("*", { count: "exact" }); // Add count option here

      // Apply filters
      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter.toLowerCase());
      }
      if (typeFilter && typeFilter !== "ALL") {
        query = query.eq("order_type", typeFilter.toLowerCase());
      }
      if (agentStateFilter && agentStateFilter !== "ALL") {
        query = query.eq("agent_state", agentStateFilter.toLowerCase());
      }
      if (searchTerm) {
        query = query.ilike("customer_name", `%${searchTerm}%`);
      }
      if (itemCodeTerm) {
        // First get order IDs from order_items
        const { data: orderItems } = await supabaseClient
          .from("order_items")
          .select("order_id")
          .ilike("item_name", `%${itemCodeTerm}%`);

        if (orderItems && orderItems.length > 0) {
          const orderIds = [
            ...new Set(orderItems.map((item) => item.order_id)),
          ];
          query = query.in("id", orderIds);
        } else {
          // No matching items found
          tableBody.innerHTML =
            '<tr><td colspan="100%" class="no-data-message">No orders found with this item code</td></tr>';
          this.updatePagination(0);
          this.updateRecordCounter(0);
          return;
        }
      }

      // Apply sorting
      if (this.sortColumn) {
        query = query.order(this.sortColumn, {
          ascending: this.sortDirection === "asc",
        });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Apply pagination
      const from = (this.currentPage - 1) * this.rowsPerPage;
      const to = from + this.rowsPerPage - 1;
      query = query.range(from, to);

      // Execute query
      const { data: orders, error, count } = await query;

      if (error) throw error;

      // Update table with new data
      if (orders && orders.length > 0) {
        tableBody.innerHTML = "";
        orders.forEach((order) => {
          const row = document.createElement("tr");
          row.setAttribute("data-order-id", order.id);

          // Add actions column first
          const actionsCell = document.createElement("td");
          actionsCell.className = "actions-cell";

          // Check if order is dispatched or cancelled
          const isDisabledStatus = ["dispatched", "cancelled"].includes(
            order.status?.toLowerCase()
          );

          // Only show view button if order is dispatched or cancelled
          actionsCell.innerHTML = isDisabledStatus
            ? `
                <button class="view-btn" onclick="window.viewOrder.initialize('${order.id}')" title="View Order">
                    <span class="material-icons">visibility</span>
                </button>
            `
            : `
                <button onclick="adminOrder.editOrder('${order.id}', '${order.order_type}')" class='edit-btn' title="Edit Order">
                    <span class="material-icons">edit</span>
                </button>
                <button onclick="processOrder.initialize('${order.id}')" class='process-btn' title="Process Order">
                    <span class="material-icons">settings</span>
                </button>
                <button class="view-btn" onclick="window.viewOrder.initialize('${order.id}')" title="View Order">
                    <span class="material-icons">visibility</span>
                </button>
            `;
          row.appendChild(actionsCell);

          // Add data columns
          [...this.tableStructure, ...this.optionalColumns].forEach(
            (column) => {
              if (
                column.id !== "actions" &&
                this.selectedColumns.has(column.id)
              ) {
                const cell = document.createElement("td");
                cell.setAttribute("data-column", column.id);

                // Format date columns
                if (
                  [
                    "orderdate",
                    "created_at",
                    "cancelled_at",
                    "dispatched_at",
                    "updated_at",
                  ].includes(column.id)
                ) {
                  cell.textContent = new Date(order[column.id]).toLocaleString(
                    "en-AU",
                    {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );
                } else {
                  cell.textContent = order[column.id] || "";
                }
                row.appendChild(cell);
              }
            }
          );

          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML =
          '<tr><td colspan="100%" class="no-data-message">No orders found</td></tr>';
      }

      // Update pagination and record counter
      this.updatePagination(count || 0);
      this.updateRecordCounter(count || 0);
    } catch (error) {
      console.error("Error loading orders:", error);
      const tableBody = this.orderTable.querySelector("tbody");
      tableBody.innerHTML =
        '<tr><td colspan="100%" class="error-message">Error loading orders</td></tr>';
    }
  }

  createOrderRow(order) {
    const row = document.createElement("tr");
    row.setAttribute("data-order-id", order.id);

    // Add actions column first
    const actionsCell = document.createElement("td");
    actionsCell.className = "actions-cell";

    // Check if order is dispatched or cancelled
    const isDisabledStatus = ["dispatched", "cancelled"].includes(
      order.status?.toLowerCase()
    );

    // Only show view button if order is dispatched or cancelled
    actionsCell.innerHTML = isDisabledStatus
      ? `
          <button class="view-btn" onclick="window.viewOrder.initialize('${order.id}')" title="View Order">
              <span class="material-icons">visibility</span>
          </button>
      `
      : `
          <button onclick="adminOrder.editOrder('${order.id}', '${order.order_type}')" class='edit-btn' title="Edit Order">
              <span class="material-icons">edit</span>
          </button>
          <button onclick="processOrder.initialize('${order.id}')" class='process-btn' title="Process Order">
              <span class="material-icons">settings</span>
          </button>
          <button class="view-btn" onclick="window.viewOrder.initialize('${order.id}')" title="View Order">
              <span class="material-icons">visibility</span>
          </button>
      `;
    row.appendChild(actionsCell);

    // Add data columns
    [...this.tableStructure, ...this.optionalColumns].forEach((column) => {
      if (column.id !== "actions" && this.selectedColumns.has(column.id)) {
        const cell = document.createElement("td");
        cell.setAttribute("data-column", column.id);

        // Format date columns
        if (
          [
            "created_at",
            "cancelled_at",
            "dispatched_at",
            "updated_at",
          ].includes(column.id)
        ) {
          cell.textContent = new Date(order[column.id]).toLocaleString(
            "en-AU",
            {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }
          );
        } else {
          cell.textContent = order[column.id] || "";
        }

        row.appendChild(cell);
      }
    });

    return row;
  }

  async addOrder(formData) {
    try {
      const orderData = {
        customer_name: formData.get("customer_name"),
        order_type: formData.get("order_type"),
        status: "processing",
        total_items: 0,
      };

      const { data, error } = await window.supabaseClient
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (error) {
        console.error("Error adding order:", error.message);
        return;
      }

      // Reset the form
      this.addOrderForm.reset();

      // Refresh the order list
      await this.loadOrders();

      // Show the order items form
      this.showOrderItemsForm(data.id);

      // Show success notification
      this.showNotification("Order added successfully", "success");
    } catch (error) {
      console.error("Error adding order:", error);
      this.showNotification("Error adding order", "error");
    }
  }

  async showOrderItemsForm(orderId) {
    // Show modal for adding order items
    document.getElementById("orderItemsModal").style.display = "block";
    document.getElementById("orderItemsForm").dataset.orderId = orderId;

    // Load available inventory items
    const { data: inventory, error } = await window.supabaseClient
      .from("inventory")
      .select("code_colour, item_name")
      .gt("stock_qty", 0);

    if (error) {
      console.error("Error loading inventory:", error.message);
      return;
    }

    const itemSelect = document.getElementById("itemSelect");
    itemSelect.innerHTML = inventory
      .map(
        (item) =>
          `<option value="${item.code_colour}">${item.item_name}</option>`
      )
      .join("");
  }

  async addOrderItem(orderId) {
    const form = document.getElementById("orderItemsForm");
    const itemData = {
      order_id: orderId,
      item_name: form.querySelector("#itemSelect").value,
      order_qty: parseFloat(form.querySelector("#quantity").value),
      order_item_status: "active",
    };

    const { error } = await window.supabaseClient
      .from("order_items")
      .insert([itemData]);

    if (error) {
      console.error("Error adding order item:", error.message);
      return;
    }

    // Update total items in order
    await this.updateOrderTotalItems(orderId);
    form.reset();
  }

  async updateOrderTotalItems(orderId) {
    const { data, error } = await window.supabaseClient
      .from("order_items")
      .select("order_qty")
      .eq("order_id", orderId);

    if (error) {
      console.error("Error counting items:", error.message);
      return;
    }

    const totalItems = data.reduce((sum, item) => sum + item.order_qty, 0);

    await window.supabaseClient
      .from("orders")
      .update({ total_items: totalItems })
      .eq("id", orderId);
  }

  async viewOrderDetails(orderId) {
    const { data, error } = await window.supabaseClient
      .from("orders")
      .select(
        `
                *,
                order_items (
                    *,
                    inventory (item_name)
                )
            `
      )
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("Error fetching order details:", error.message);
      return;
    }

    // Populate and show order details modal
    const modal = document.getElementById("orderDetailsModal");
    const content = modal.querySelector(".modal-content");
    content.innerHTML = `
            <h2>Order Details</h2>
            <p><strong>Invoice:</strong> ${data.invoice_no || "N/A"}</p>
            <p><strong>Customer:</strong> ${data.customer_name}</p>
            <p><strong>Status:</strong> ${data.status}</p>
            <p><strong>Type:</strong> ${data.order_type}</p>
            <h3>Items:</h3>
            <ul>
                ${data.order_items
                  .map(
                    (item) => `
                    <li>${item.inventory.item_name} - Quantity: ${item.order_qty}</li>
                `
                  )
                  .join("")}
            </ul>
            <button onclick="document.getElementById('orderDetailsModal').style.display='none'">Close</button>
        `;
    modal.style.display = "block";
  }

  async editOrder(orderId, orderType) {
    try {
      // Check if order is cancelled or dispatched
      const { data: order, error } = await supabaseClient
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();

      if (error) throw error;

      const orderStatus = order.status?.toUpperCase();
      if (orderStatus === "CANCELLED") {
        this.showNotification("Cannot edit cancelled orders", "error");
        return;
      }
      if (orderStatus === "DISPATCHED") {
        this.showNotification("Cannot edit dispatched orders", "error");
        return;
      }

      // Handle different order types
      if (orderType.toUpperCase() === "WHOLESALE") {
        // Initialize EditWholesaleOrder if not exists
        if (!window.editWholesaleOrder) {
          window.editWholesaleOrder = new EditWholesaleOrder();
        }

        // Show the wholesale edit modal
        const modal = document.getElementById("editWholesaleOrderModal");
        if (!modal) {
          console.error("Wholesale edit modal not found");
          return;
        }

        // Initialize the form
        await window.editWholesaleOrder.initialize(orderId);

        // Show the modal
        modal.style.display = "block";

        // Add close button functionality
        const closeBtn = modal.querySelector(".close");
        if (closeBtn) {
          closeBtn.onclick = () => {
            modal.style.display = "none";
          };
        }

        // Close on outside click
        window.onclick = (event) => {
          if (event.target === modal) {
            modal.style.display = "none";
          }
        };
      } else if (orderType.toUpperCase() === "ODM") {
        if (!window.editOdmOrder) {
          window.editOdmOrder = new EditOdmOrder();
        }
        await window.editOdmOrder.initialize(orderId);
        document.getElementById("editOdmOrderModal").style.display = "block";
      }
    } catch (error) {
      console.error("Error editing order:", error);
      this.showNotification("Error editing order. Please try again.", "error");
    }
  }

  async updateOrder(orderId) {
    const formData = new FormData(document.getElementById("editOrderForm"));
    const orderData = Object.fromEntries(formData.entries());

    const { error } = await window.supabaseClient
      .from("orders")
      .update(orderData)
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order:", error.message);
      return;
    }

    document.getElementById("editOrderModal").style.display = "none";
    await this.loadOrders();
  }

  setupRealtimeSubscription() {
    // Subscribe to orders table changes
    const orderChannel = window.supabaseClient
      .channel("orders-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Order change received:", payload);
          switch (payload.eventType) {
            case "INSERT":
              this.handleNewOrder(payload.new);
              break;
            case "UPDATE":
              this.handleOrderUpdate(payload.new);
              break;
            case "DELETE":
              this.handleOrderDelete(payload.old.id);
              break;
          }
        }
      )
      .subscribe();

    // Subscribe to order_items table changes
    const itemsChannel = window.supabaseClient
      .channel("order-items-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        (payload) => {
          console.log("Order items change received:", payload);
          // Refresh the order containing this item
          if (payload.new?.order_id || payload.old?.order_id) {
            this.refreshOrder(payload.new?.order_id || payload.old?.order_id);
          }
        }
      )
      .subscribe();

    return () => {
      orderChannel.unsubscribe();
      itemsChannel.unsubscribe();
    };
  }

  // Add methods to handle real-time updates
  async handleNewOrder(order) {
    const tableBody = this.orderTable.querySelector("tbody");
    const existingRows = Array.from(tableBody.children);

    // Check if order should be displayed based on current filters
    if (await this.shouldDisplayOrder(order)) {
      const row = this.createOrderRow(order);

      // Insert at the correct position based on current sort
      const insertIndex = this.findInsertIndex(existingRows, order);
      if (insertIndex === existingRows.length) {
        tableBody.appendChild(row);
      } else {
        tableBody.insertBefore(row, existingRows[insertIndex]);
      }
    }
  }

  async handleOrderUpdate(updatedOrder) {
    const tableBody = this.orderTable.querySelector("tbody");
    const existingRow = tableBody.querySelector(
      `tr[data-order-id="${updatedOrder.id}"]`
    );

    if (existingRow) {
      if (await this.shouldDisplayOrder(updatedOrder)) {
        // Update existing row
        const newRow = this.createOrderRow(updatedOrder);
        existingRow.replaceWith(newRow);
      } else {
        // Remove if it no longer matches filters
        existingRow.remove();
      }
    } else if (await this.shouldDisplayOrder(updatedOrder)) {
      // Add if it now matches filters
      const row = this.createOrderRow(updatedOrder);
      const insertIndex = this.findInsertIndex(
        Array.from(tableBody.children),
        updatedOrder
      );
      if (insertIndex === tableBody.children.length) {
        tableBody.appendChild(row);
      } else {
        tableBody.insertBefore(row, tableBody.children[insertIndex]);
      }
    }
  }

  handleOrderDelete(orderId) {
    const row = this.orderTable.querySelector(`tr[data-order-id="${orderId}"]`);
    if (row) {
      row.remove();
    }
  }

  async refreshOrder(orderId) {
    const { data: order, error } = await window.supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!error && order) {
      this.handleOrderUpdate(order);
    }
  }

  // Helper methods for real-time updates
  async shouldDisplayOrder(order) {
    // Check against current filters
    const searchTerm = this.searchInput.value.toLowerCase();
    const statusFilter = this.filterSelect.value;
    const typeFilter = this.filterOrderType.value;
    const agentStateFilter = this.filterAgentState.value;

    return (
      (!searchTerm || order.customer_name.toLowerCase().includes(searchTerm)) &&
      (statusFilter === "all" || order.status === statusFilter) &&
      (typeFilter === "all" || order.order_type === typeFilter) &&
      (agentStateFilter === "all" || order.agent_state === agentStateFilter)
    );
  }

  findInsertIndex(existingRows, newOrder) {
    // Find correct position based on current sort
    return existingRows.findIndex((row) => {
      const rowOrder = this.getOrderFromRow(row);
      return this.compareOrders(newOrder, rowOrder) < 0;
    });
  }

  showAddOrderDialog() {
    // Implement wholesale order creation dialog
    console.log("Show wholesale order dialog");
  }

  showOdmOrderDialog() {
    const modal = document.getElementById("odmOrderModal");
    if (!modal) {
      console.error("ODM order modal not found");
      return;
    }

    modal.style.display = "block";

    // Create new instance if not exists
    if (!window.odmOrder) {
      window.odmOrder = new OdmOrder();
    }

    // Initialize or reset the form
    try {
      window.odmOrder.initialize();
    } catch (error) {
      console.error("Error initializing ODM order form:", error);
      modal.style.display = "none";
      return;
    }

    // Close button functionality
    const closeBtn = modal.querySelector(".close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = "none";
        // Clear form when closing
        if (window.odmOrder) {
          window.odmOrder.clearForm();
        }
      };
    }

    // Click outside to close
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
        // Clear form when closing
        if (window.odmOrder) {
          window.odmOrder.clearForm();
        }
      }
    };
  }

  clearAllFilters() {
    // Reset all filters to their default state
    this.searchInput.value = "";
    this.filterSelect.value = "ALL";
    this.filterOrderType.value = "ALL";
    this.filterAgentState.value = "ALL";
    this.startDate.value = "";
    this.endDate.value = "";
    this.invoiceSearch.value = "";

    // Force a reload of the orders
    this.currentPage = 1; // Reset to first page
    this.loadOrders();
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
    selectAllBtn.addEventListener("click", () => {
      allColumns.forEach((column) => {
        if (!column.locked) {
          this.selectedColumns.add(column.id);
        }
      });
      this.updateColumnCheckboxes();
      this.updateTableHeaders();
      this.loadOrders();
    });

    // Setup clear all button
    clearAllBtn.addEventListener("click", () => {
      allColumns.forEach((column) => {
        if (!column.locked) {
          this.selectedColumns.delete(column.id);
        }
      });
      this.updateColumnCheckboxes();
      this.updateTableHeaders();
      this.loadOrders();
    });
  }

  // Add new method to update checkboxes
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

  setupPagination() {
    this.rowsPerPageSelect.value = this.rowsPerPage;
    this.rowsPerPageSelect.addEventListener("change", (e) => {
      this.rowsPerPage = parseInt(e.target.value);
      this.currentPage = 1;

      // Update container height based on rows
      const container = document.querySelector(".order-table-container");
      container.setAttribute("data-rows", this.rowsPerPage);

      this.loadOrders();
    });

    // Set initial container height
    const container = document.querySelector(".order-table-container");
    container.setAttribute("data-rows", this.rowsPerPage);
  }

  updatePagination(totalRows) {
    if (!this.pagination) return;

    const totalPages = Math.ceil(totalRows / this.rowsPerPage);
    this.pagination.innerHTML = `
        <button onclick="adminOrder.changePage(1)" ${
          this.currentPage === 1 ? "disabled" : ""
        }>First</button>
        <button onclick="adminOrder.changePage(${this.currentPage - 1})" ${
      this.currentPage === 1 ? "disabled" : ""
    }>Previous</button>
        <span>Page ${this.currentPage} of ${totalPages}</span>
        <button onclick="adminOrder.changePage(${this.currentPage + 1})" ${
      this.currentPage === totalPages ? "disabled" : ""
    }>Next</button>
        <button onclick="adminOrder.changePage(${totalPages})" ${
      this.currentPage === totalPages ? "disabled" : ""
    }>Last</button>
    `;
  }

  changePage(page) {
    this.currentPage = page;
    this.loadOrders();
  }

  selectAllColumns() {
    // Add all required columns
    this.tableStructure.forEach((col) => {
      this.selectedColumns.add(col.id);
    });

    // Add all optional columns
    this.optionalColumns.forEach((col) => {
      this.selectedColumns.add(col.id);
    });

    this.updateTableHeaders();
    this.loadOrders();
    this.setupColumnSelection(); // Refresh checkboxes
  }

  clearAllColumns() {
    // Keep only locked columns from tableStructure
    this.selectedColumns = new Set(
      this.tableStructure.filter((col) => col.locked).map((col) => col.id)
    );

    this.updateTableHeaders();
    this.loadOrders();
    this.setupColumnSelection(); // Refresh checkboxes
  }

  updateTableHeaders() {
    const headerRow = this.orderTable.querySelector("thead tr");
    if (!headerRow) return;

    headerRow.innerHTML = "";

    // Add actions column first
    const actionsHeader = document.createElement("th");
    actionsHeader.textContent = "Actions";
    actionsHeader.className = "actions-header";
    headerRow.appendChild(actionsHeader);

    // Add other selected columns
    [...this.tableStructure, ...this.optionalColumns].forEach((column) => {
      if (column.id !== "actions" && this.selectedColumns.has(column.id)) {
        const th = document.createElement("th");
        th.innerHTML = `
          <div class="header-content">
            <span class="header-text">${column.name}</span>
            <span class="material-icons sort-icon">unfold_more</span>
          </div>
        `;
        th.setAttribute("data-sort", column.id);
        th.style.cursor = "pointer";
        th.addEventListener("click", () => this.handleSort(column.id));
        headerRow.appendChild(th);
      }
    });
  }

  handleSort(columnId) {
    // Remove sort classes from all headers
    this.orderTable.querySelectorAll("th[data-sort]").forEach((th) => {
      th.classList.remove("sort-asc", "sort-desc");
    });

    // Update sort direction
    if (this.sortColumn === columnId) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = columnId;
      this.sortDirection = "asc";
    }

    // Add sort class to current header
    const currentHeader = this.orderTable.querySelector(
      `th[data-sort="${columnId}"]`
    );
    if (currentHeader) {
      currentHeader.classList.add(
        this.sortDirection === "asc" ? "sort-asc" : "sort-desc"
      );
    }

    this.loadOrders();
  }

  getOrderFromRow(row) {
    const order = {};
    row.querySelectorAll("td").forEach((cell) => {
      const columnId = cell.getAttribute("data-column");
      if (columnId) {
        order[columnId] = cell.textContent;
      }
    });
    return order;
  }

  compareOrders(a, b) {
    const aValue = a[this.sortColumn];
    const bValue = b[this.sortColumn];

    if (this.columns[this.sortColumn]?.isDate) {
      return this.sortDirection === "asc"
        ? new Date(aValue) - new Date(bValue)
        : new Date(bValue) - new Date(aValue);
    }

    return this.sortDirection === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  }

  adjustTableHeight() {
    const tableContainer = document.querySelector(".order-table-container");
    const headerHeight = 53; // Height of header row
    const rowHeight = 53; // Height of each data row
    const padding = 20; // Padding for container
    const footerOffset = 100; // Space for pagination and bottom margin

    // Calculate desired height based on number of visible rows
    const visibleRows = Math.min(this.rowsPerPage, 100); // Cap at 100 rows for performance
    const desiredHeight = headerHeight + visibleRows * rowHeight + padding;

    // Get available space in viewport
    const availableHeight =
      window.innerHeight - tableContainer.offsetTop - footerOffset;

    // Set the height based on content or available space
    const newHeight = Math.min(desiredHeight, availableHeight);

    // Apply the new height
    requestAnimationFrame(() => {
      tableContainer.style.height = `${newHeight}px`;
      tableContainer.style.maxHeight = `${newHeight}px`;
    });
  }

  showWholesaleOrderDialog() {
    const modal = document.getElementById("wholesaleOrderModal");
    modal.style.display = "block";

    // Create new instance if not exists
    if (!window.wholesaleOrder) {
      window.wholesaleOrder = new WholesaleOrder();
      window.wholesaleOrder.initialize();
    } else {
      // Reset the form if instance exists
      window.wholesaleOrder.clearItemSelection();
      window.wholesaleOrder.tempOrderList = [];
      window.wholesaleOrder.tempStockChanges = [];
      window.wholesaleOrder.updateTables();
    }
  }

  refreshPage() {
    window.location.reload();
  }

  updateTable(data) {
    const tableBody = this.orderTable.querySelector("tbody");
    tableBody.innerHTML = "";

    const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
        return new Date(dateString).toLocaleString("en-AU", {
          timeZone: "Australia/Sydney",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (error) {
        console.error("Date formatting error:", error);
        return dateString;
      }
    };

    data.forEach((order) => {
      const row = document.createElement("tr");

      // Add actions column first
      const actionsCell = document.createElement("td");
      actionsCell.className = "actions-cell";
      actionsCell.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
      `;

      // Check if order is dispatched or cancelled
      const isDisabledStatus = ["dispatched", "cancelled"].includes(
        order.status?.toLowerCase()
      );

      // Only show view button if order is dispatched or cancelled
      actionsCell.innerHTML = isDisabledStatus
        ? `
            <button class="view-btn" onclick="window.viewOrder.initialize('${order.id}')" title="View Order">
                <span class="material-icons">visibility</span>
            </button>
        `
        : `
            <button onclick="adminOrder.editOrder('${order.id}', '${order.order_type}')" class='edit-btn' title="Edit Order">
                <span class="material-icons">edit</span>
            </button>
            <button onclick="processOrder.initialize('${order.id}')" class='process-btn' title="Process Order">
                <span class="material-icons">settings</span>
            </button>
            <button class="view-btn" onclick="window.viewOrder.initialize('${order.id}')" title="View Order">
                <span class="material-icons">visibility</span>
            </button>
        `;
      row.appendChild(actionsCell);

      // Add data columns based on selected columns
      this.tableStructure.forEach((column) => {
        if (column.id !== "actions" && this.selectedColumns.has(column.id)) {
          const cell = document.createElement("td");
          cell.setAttribute("data-column", column.id);

          // Format date columns
          if (
            [
              "orderdate",
              "created_at",
              "cancelled_at",
              "dispatched_at",
              "updated_at",
            ].includes(column.id)
          ) {
            cell.textContent = formatDate(order[column.id]);
          } else {
            cell.textContent = order[column.id] || "";
          }
          row.appendChild(cell);
        }
      });

      // Add optional columns if selected
      this.optionalColumns.forEach((column) => {
        if (this.selectedColumns.has(column.id)) {
          const cell = document.createElement("td");
          cell.setAttribute("data-column", column.id);

          // Format date columns
          if (
            [
              "orderdate",
              "created_at",
              "cancelled_at",
              "dispatched_at",
              "updated_at",
            ].includes(column.id)
          ) {
            cell.textContent = formatDate(order[column.id]);
          } else {
            cell.textContent = order[column.id] || "";
          }
          row.appendChild(cell);
        }
      });

      tableBody.appendChild(row);
    });

    // Adjust table height after updating content
    this.adjustTableHeight();
  }

  updateRecordCounter(totalCount) {
    const counterElement = document.getElementById("recordCounter");
    if (!counterElement) return;

    const start = (this.currentPage - 1) * this.rowsPerPage + 1;
    const end = Math.min(start + this.rowsPerPage - 1, totalCount);

    let counterText = `Showing ${
      totalCount === 0 ? 0 : start
    }-${end} of ${totalCount} records`;

    // Add filter information if any filters are active
    const filters = [];

    if (this.filterSelect.value !== "ALL") {
      filters.push(`status: ${this.filterSelect.value}`);
    }
    if (this.filterOrderType.value !== "ALL") {
      filters.push(`type: ${this.filterOrderType.value}`);
    }
    if (this.filterAgentState.value !== "ALL") {
      filters.push(`state: ${this.filterAgentState.value}`);
    }
    if (this.searchInput.value) {
      filters.push(`name: "${this.searchInput.value}"`);
    }
    if (this.searchItemCode.value) {
      filters.push(`item: "${this.searchItemCode.value}"`);
    }

    if (filters.length > 0) {
      counterText += ` (filtered by ${filters.join(", ")})`;
    }

    counterElement.textContent = counterText;
  }

  generateTableRow(order) {
    // Determine if order is cancelled
    const isCancelled = order.status?.toUpperCase() === "CANCELLED";

    return `
        <tr>
            <td style="
                position: sticky;
                left: 0;
                background-color: white;
                z-index: 1;
                box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            ">
                <div class="action-buttons" style="
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    padding: 4px;
                ">
                    <button onclick="adminOrder.viewOrder('${order.id}', '${
      order.order_type
    }')" 
                            class="view-btn"
                            title="View Order">
                        <span class="material-icons">visibility</span>
                    </button>
                    ${
                      isCancelled
                        ? `<button class="edit-btn disabled" 
                                  disabled 
                                  title="Cannot edit cancelled orders" 
                                  style="
                                      opacity: 0.5;
                                      cursor: not-allowed;
                                      background-color: #e9ecef;
                                  ">
                             <span class="material-icons" style="color: #6c757d;">edit_off</span>
                           </button>`
                        : `<button onclick="adminOrder.editOrder('${order.id}', '${order.order_type}')" 
                                  class="edit-btn"
                                  title="Edit Order">
                             <span class="material-icons">edit</span>
                           </button>`
                    }
                </div>
            </td>
            <td>${order.id}</td>
            <td>${order.invoice_no || "-"}</td>
            <td>${order.customer_name || "-"}</td>
            <td>${order.agent_state || "-"}</td>
            <td>${order.order_type || "-"}</td>
            <td>${order.status || "-"}</td>
            <td>${this.formatDate(order.created_at)}</td>
            <td>${this.formatDate(order.updated_at)}</td>
            <td>${this.formatDate(order.dispatched_at)}</td>
            <td>${this.formatDate(order.cancelled_at)}</td>
            <td>${order.total_items || "0"}</td>
            <td>${order.removed_items || "0"}</td>
            <td>${order.dispatched_box || "-"}</td>
            <td>${order.order_note || "-"}</td>
        </tr>
    `;
  }

  generateTableHTML(orders) {
    return `
        <div style="overflow-x: auto;">
            <table class="orders-table" style="
                border-collapse: collapse;
                width: 100%;
                position: relative;
            ">
                <thead>
                    <tr>
                        <th style="
                            position: sticky;
                            left: 0;
                            top: 0;
                            z-index: 3;
                            background-color: #f8f9fa;
                            border-bottom: 2px solid #dee2e6;
                            min-width: 100px;
                            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
                        ">Actions</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Order ID</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Invoice No</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Customer Name</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Agent State</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Order Type</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Status</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Created At</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Updated At</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Dispatched At</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Cancelled At</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Total Items</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Removed Items</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Dispatched Box</th>
                        <th style="position: sticky; top: 0; z-index: 1; background-color: #f8f9fa;">Order Note</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders
                      .map((order) => this.generateTableRow(order))
                      .join("")}
                </tbody>
            </table>
        </div>
    `;
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to notification container
    const container =
      document.querySelector(".notification-container") || document.body;
    container.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  editOdmOrder(orderId) {
    // Show the modal
    const modal = document.getElementById("editOdmOrderModal");
    if (modal) {
      modal.style.display = "block";

      // Dispatch event with order ID
      const event = new CustomEvent("show.odm.modal", {
        detail: { orderId: orderId },
      });
      document.dispatchEvent(event);
    }
  }
}

// Initialize the order management when the DOM is loaded
let adminOrder;
document.addEventListener("DOMContentLoaded", () => {
  adminOrder = new AdminOrder();
  window.adminOrder = adminOrder;
});

// Add CSS to the page for column selection styling
document.head.insertAdjacentHTML(
  "beforeend",
  `
  <style>
    .column-select-container {
      position: relative;
      display: inline-block;
    }

    #columnSelection {
      display: none;
      position: absolute;
      right: 0;
      top: 100%;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      min-width: 200px;
      max-height: 400px;
      overflow-y: auto;
    }

    #columnSelection.show {
      display: block;
    }

    .column-search {
      margin-bottom: 10px;
    }

    .column-search input {
      width: 100%;
      padding: 5px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .column-select-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }

    .column-option {
      display: flex;
      align-items: center;
      padding: 5px 0;
    }

    .column-option label {
      margin-left: 8px;
      cursor: pointer;
    }

    .record-counter {
      margin-left: 15px;
      color: #666;
      font-size: 0.9em;
    }

    .rows-per-page {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  </style>
`
);

// It's ok on 11/03/2025-jim
