class AdminSummary {
  constructor() {
    this.initialize();
  }

  async initialize() {
    this.summaryContainer = document.getElementById("adminSummary");
    if (!this.summaryContainer) {
      console.error("Admin summary container not found");
      return;
    }

    await this.loadSummaryData();
    this.setupRealtimeSubscription();
  }

  async loadSummaryData() {
    try {
      // Get future dispatches
      const { data: futureDispatches, error: dispatchError } =
        await supabaseClient
          .from("orders")
          .select("*")
          .gt("dispatched_at", new Date().toISOString())
          .order("dispatched_at", { ascending: true });

      if (dispatchError) throw dispatchError;

      // Get inventory summary
      const { data: inventory, error: inventoryError } = await supabaseClient
        .from("inventory")
        .select("*");

      if (inventoryError) throw inventoryError;

      // Get orders summary
      const { data: orders, error: ordersError } = await supabaseClient
        .from("orders")
        .select("*");

      if (ordersError) throw ordersError;

      this.renderSummary(futureDispatches, inventory, orders);
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  }

  renderSummary(futureDispatches, inventory, orders) {
    // Calculate summaries
    const inventorySummary = this.calculateInventorySummary(inventory);
    const ordersSummary = this.calculateOrdersSummary(orders);
    const dispatchesSummary = this.calculateDispatchesSummary(futureDispatches);

    this.summaryContainer.innerHTML = `
            <div class="summary-section future-dispatches">
                <h3>Upcoming Dispatches</h3>
                ${this.renderDispatchesList(dispatchesSummary)}
            </div>
            <div class="summary-grid">
                <div class="summary-section inventory-summary">
                    <h3>Inventory Summary</h3>
                    ${this.renderInventorySummary(inventorySummary)}
                </div>
                <div class="summary-section orders-summary">
                    <h3>Orders Summary</h3>
                    ${this.renderOrdersSummary(ordersSummary)}
                </div>
            </div>
        `;
  }

  calculateInventorySummary(inventory) {
    const summary = {
      categories: {},
      status: {},
      groups: {},
      total: inventory.length,
    };

    inventory.forEach((item) => {
      // Count by category
      summary.categories[item.item_category] =
        (summary.categories[item.item_category] || 0) + 1;
      // Count by status
      summary.status[item.item_status] =
        (summary.status[item.item_status] || 0) + 1;
      // Count by group
      summary.groups[item.item_group] =
        (summary.groups[item.item_group] || 0) + 1;
    });

    return summary;
  }

  calculateOrdersSummary(orders) {
    const summary = {
      types: {},
      status: {},
      total: orders.length,
      // Update status types
      status_counts: {
        picking: 0,
        "awaiting payment": 0,
        "odm on hold": 0,
        "wholesale on hold": 0,
        dispatched: 0,
        cancelled: 0,
        processing: 0,
      },
    };

    orders.forEach((order) => {
      // Count by type
      summary.types[order.order_type] =
        (summary.types[order.order_type] || 0) + 1;
      // Count by status
      const status = order.status.toLowerCase();
      summary.status[status] = (summary.status[status] || 0) + 1;
      // Update specific status count if status exists
      if (summary.status_counts.hasOwnProperty(status)) {
        summary.status_counts[status]++;
      }
    });

    return summary;
  }

  calculateDispatchesSummary(dispatches) {
    return dispatches.map((dispatch) => ({
      date: new Date(dispatch.dispatched_at).toLocaleDateString(),
      time: new Date(dispatch.dispatched_at).toLocaleTimeString(),
      type: dispatch.order_type,
      status: dispatch.status,
      customer: dispatch.customer_name,
      total_items: dispatch.total_items || 0,
      dispatched_box: dispatch.dispatched_box || 0,
      invoice_no: dispatch.orders?.invoice_no || "N/A", // Get invoice_no from orders
      order_note: dispatch.order_note || "",
    }));
  }

  calculateTotalQuantity(items) {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce(
      (total, item) => total + (parseInt(item.quantity) || 0),
      0
    );
  }

  renderDispatchesList(dispatches) {
    if (dispatches.length === 0) {
      return '<p class="no-data">No upcoming dispatches</p>';
    }

    return `
            <div class="dispatches-list">
                ${dispatches
                  .map(
                    (dispatch) => `
                    <div class="dispatch-item">
                        <div class="dispatch-main-info">
                            <div class="dispatch-header">
                                <span class="dispatch-datetime">
                                    <i class="far fa-calendar"></i> ${
                                      dispatch.date
                                    } 
                                    <i class="far fa-clock"></i> ${
                                      dispatch.time
                                    }
                                </span>
                                <span class="dispatch-type ${dispatch.type.toLowerCase()}">${
                      dispatch.type
                    }</span>
                                <span class="dispatch-status ${dispatch.status.toLowerCase()}">${
                      dispatch.status
                    }</span>
                            </div>
                            <div class="dispatch-order-info">
                                <span class="customer-name">
                                    <i class="far fa-user"></i>
                                    <strong>Customer:</strong> ${
                                      dispatch.customer
                                    }
                                </span>
                            </div>
                        </div>
                        <div class="dispatch-details">
                            <div class="order-summary">
                                <div class="summary-grid">
                                    <span class="total-items">
                                        <i class="fas fa-cubes"></i>
                                        <strong>Total Items:</strong> ${
                                          dispatch.total_items
                                        }
                                    </span>
                                    <span class="box-count">
                                        <i class="fas fa-box"></i>
                                        <strong>Boxes:</strong> ${
                                          dispatch.dispatched_box
                                        }
                                    </span>
                                    <span class="invoice-number">
                                        <i class="fas fa-file-invoice"></i>
                                        <strong>Invoice #:</strong> ${
                                          dispatch.invoice_no
                                        }
                                    </span>
                                    ${
                                      dispatch.order_note
                                        ? `
                                        <span class="note-preview">
                                            <i class="fas fa-sticky-note"></i>
                                            <strong>Note:</strong> ${dispatch.order_note.substring(
                                              0,
                                              30
                                            )}${
                                            dispatch.order_note.length > 30
                                              ? "..."
                                              : ""
                                          }
                                        </span>
                                    `
                                        : `
                                        <span class="note-preview empty">
                                            <i class="fas fa-sticky-note"></i>
                                            <strong>Note:</strong> No note
                                        </span>
                                    `
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
  }

  renderInventorySummary(summary) {
    return `
            <div class="summary-content">
                <div class="summary-total">Total Items: ${summary.total}</div>
                <div class="summary-details">
                    <div class="summary-group">
                        <h4>Categories</h4>
                        ${Object.entries(summary.categories)
                          .map(
                            ([category, count]) => `
                            <div class="summary-item">
                                <span class="item-label">${category}</span>
                                <span class="item-count">${count}</span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="summary-group">
                        <h4>Status</h4>
                        ${Object.entries(summary.status)
                          .map(
                            ([status, count]) => `
                            <div class="summary-item">
                                <span class="item-label">${status}</span>
                                <span class="item-count">${count}</span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="summary-group">
                        <h4>Groups</h4>
                        ${Object.entries(summary.groups)
                          .map(
                            ([group, count]) => `
                            <div class="summary-item">
                                <span class="item-label">${group}</span>
                                <span class="item-count">${count}</span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;
  }

  renderOrdersSummary(summary) {
    return `
            <div class="summary-content">
                <div class="summary-total">Total Orders: ${summary.total}</div>
                <div class="summary-details">
                    <div class="summary-group">
                        <h4>Types</h4>
                        ${Object.entries(summary.types)
                          .map(
                            ([type, count]) => `
                            <div class="summary-item">
                                <span class="item-label">${type}</span>
                                <span class="item-count">${count}</span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="summary-group">
                        <h4>Status Overview</h4>
                        <div class="status-grid">
                            <div class="status-item ${
                              summary.status_counts.picking > 0
                                ? "has-orders"
                                : ""
                            }" data-status="picking">
                                <span class="status-label">Picking</span>
                                <span class="status-count">${
                                  summary.status_counts.picking
                                }</span>
                            </div>
                            <div class="status-item ${
                              summary.status_counts["awaiting payment"] > 0
                                ? "has-orders"
                                : ""
                            }" data-status="awaiting-payment">
                                <span class="status-label">Awaiting Payment</span>
                                <span class="status-count">${
                                  summary.status_counts["awaiting payment"]
                                }</span>
                            </div>
                            <div class="status-item ${
                              summary.status_counts["odm on hold"] > 0
                                ? "has-orders"
                                : ""
                            }" data-status="odm-hold">
                                <span class="status-label">ODM On Hold</span>
                                <span class="status-count">${
                                  summary.status_counts["odm on hold"]
                                }</span>
                            </div>
                            <div class="status-item ${
                              summary.status_counts["wholesale on hold"] > 0
                                ? "has-orders"
                                : ""
                            }" data-status="wholesale-hold">
                                <span class="status-label">Wholesale On Hold</span>
                                <span class="status-count">${
                                  summary.status_counts["wholesale on hold"]
                                }</span>
                            </div>
                            <div class="status-item ${
                              summary.status_counts.dispatched > 0
                                ? "has-orders"
                                : ""
                            }" data-status="dispatched">
                                <span class="status-label">Dispatched</span>
                                <span class="status-count">${
                                  summary.status_counts.dispatched
                                }</span>
                            </div>
                            <div class="status-item ${
                              summary.status_counts.cancelled > 0
                                ? "has-orders"
                                : ""
                            }" data-status="cancelled">
                                <span class="status-label">Cancelled</span>
                                <span class="status-count">${
                                  summary.status_counts.cancelled
                                }</span>
                            </div>
                            <div class="status-item ${
                              summary.status_counts.processing > 0
                                ? "has-orders"
                                : ""
                            }" data-status="processing">
                                <span class="status-label">Processing</span>
                                <span class="status-count">${
                                  summary.status_counts.processing
                                }</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  setupRealtimeSubscription() {
    // Subscribe to inventory changes
    supabaseClient
      .channel("admin_summary_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => this.loadSummaryData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => this.loadSummaryData()
      )
      .subscribe();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.adminSummary = new AdminSummary();
});
