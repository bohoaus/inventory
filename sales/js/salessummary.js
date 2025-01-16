class SalesSummary {
  constructor() {
    this.summaryContainer = null;
    this.initialize();
  }

  async initialize() {
    try {
      this.createSummaryContainer();
      await this.loadSummaryData();
      this.setupRealtimeSubscription();
    } catch (error) {
      console.error("Error initializing sales summary:", error);
    }
  }

  createSummaryContainer() {
    const noteBoard = document.querySelector(".note-board");
    if (!noteBoard) return;

    this.summaryContainer = document.createElement("div");
    this.summaryContainer.className = "salessummary-container";
    noteBoard.parentNode.insertBefore(
      this.summaryContainer,
      noteBoard.nextSibling
    );
  }

  async loadSummaryData() {
    try {
      // Fetch all data first
      const { data: orders, error: ordersError } = await supabaseClient
        .from("orders")
        .select("*");

      if (ordersError) throw ordersError;

      const { data: inventory, error: inventoryError } = await supabaseClient
        .from("inventory")
        .select("*");

      if (inventoryError) throw inventoryError;

      console.log("Raw Orders:", orders);
      console.log("Raw Inventory:", inventory);

      // Process future dispatches
      const currentDate = new Date();
      const futureDispatches = orders.filter((order) => {
        if (!order.dispatched_at) return false;
        const dispatchDate = new Date(order.dispatched_at);
        return (
          dispatchDate > currentDate && order.order_type.toUpperCase() === "ODM"
        );
      });

      console.log("Future Dispatches:", futureDispatches);

      // Calculate summaries
      const inventorySummary = {
        groups: this.groupBy(inventory, "item_group"),
        status: this.groupBy(inventory, "item_status"),
        categories: this.groupBy(inventory, "item_category"),
      };

      const ordersSummary = {
        wholesale: {
          picking: this.countOrders(orders, "WHOLESALE", "PICKING"),
          awaitingPayment: this.countOrders(
            orders,
            "WHOLESALE",
            "AWAITING_PAYMENT"
          ),
          onHold: this.countOrders(orders, "WHOLESALE", "ON_HOLD"),
          dispatched: this.countOrders(orders, "WHOLESALE", "DISPATCHED"),
          cancelled: this.countOrders(orders, "WHOLESALE", "CANCELLED"),
        },
        odm: {
          processing: this.countOrders(orders, "ODM", "PROCESSING"),
          onHold: this.countOrders(orders, "ODM", "ON_HOLD"),
          dispatched: this.countOrders(orders, "ODM", "DISPATCHED"),
          cancelled: this.countOrders(orders, "ODM", "CANCELLED"),
        },
      };

      console.log("Inventory Summary:", inventorySummary);
      console.log("Orders Summary:", ordersSummary);

      // Render the summaries
      this.renderSummary(futureDispatches, inventorySummary, ordersSummary);
    } catch (error) {
      console.error("Error in loadSummaryData:", error);
    }
  }

  groupBy(items, field) {
    return items.reduce((acc, item) => {
      const value = item[field] || "Unspecified";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  countOrders(orders, type, status) {
    return orders.filter((order) => {
      const orderType = order.order_type?.toUpperCase();
      const orderStatus = order.status?.toUpperCase();
      return (
        orderType === type.toUpperCase() && orderStatus === status.toUpperCase()
      );
    }).length;
  }

  renderSummary(futureDispatches, inventorySummary, ordersSummary) {
    this.summaryContainer.innerHTML = `
      ${this.renderUpcomingDispatches(futureDispatches)}
      <div class="salessummary-grid">
        <div class="salessummary-section orders-section">
          <h3>Orders Overview</h3>
          ${this.renderOrdersSummary(ordersSummary)}
        </div>
        <div class="salessummary-section inventory-section">
          <h3>Inventory Overview</h3>
          ${this.renderInventorySummary(inventorySummary)}
        </div>
      </div>
    `;
  }

  renderUpcomingDispatches(dispatches) {
    if (!dispatches.length) return "";

    return `
      <div class="salessummary-section upcoming-dispatches">
        <h3>Upcoming ODM Dispatches</h3>
        <div class="salessummary-upcoming-list">
          ${dispatches
            .map(
              (order) => `
            <div class="salessummary-upcoming-item">
              <div class="salessummary-upcoming-header">
                <span class="salessummary-customer">${
                  order.customer_name || "N/A"
                }</span>
                <span class="salessummary-dispatch-date">
                  Dispatch: ${new Date(
                    order.dispatched_at
                  ).toLocaleDateString()}
                </span>
              </div>
              <div class="salessummary-upcoming-details">
                <span class="salessummary-detail-item">Items: ${
                  order.total_items || 0
                }</span>
                <span class="salessummary-detail-item">Invoice: ${
                  order.invoice_no || "N/A"
                }</span>
                <span class="salessummary-detail-item">Box: ${
                  order.dispatched_box || "N/A"
                }</span>
                ${
                  order.order_note
                    ? `
                  <div class="salessummary-note">
                    <strong>Note:</strong> ${order.order_note}
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  renderOrdersSummary(summary) {
    return `
      <div class="salessummary-subsection">
        <h4>Wholesale Orders</h4>
        <div class="salessummary-stats">
          <div class="salessummary-stat">
            <span class="salessummary-label">Picking</span>
            <span class="salessummary-value">${summary.wholesale.picking}</span>
          </div>
          <div class="salessummary-stat">
            <span class="salessummary-label">Awaiting Payment</span>
            <span class="salessummary-value">${summary.wholesale.awaitingPayment}</span>
          </div>
          <div class="salessummary-stat">
            <span class="salessummary-label">On Hold</span>
            <span class="salessummary-value">${summary.wholesale.onHold}</span>
          </div>
          <div class="salessummary-stat">
            <span class="salessummary-label">Dispatched</span>
            <span class="salessummary-value">${summary.wholesale.dispatched}</span>
          </div>
          <div class="salessummary-stat">
            <span class="salessummary-label">Cancelled</span>
            <span class="salessummary-value">${summary.wholesale.cancelled}</span>
          </div>
        </div>
      </div>

      <div class="salessummary-subsection">
        <h4>ODM Orders</h4>
        <div class="salessummary-stats">
          <div class="salessummary-stat">
            <span class="salessummary-label">Processing</span>
            <span class="salessummary-value">${summary.odm.processing}</span>
          </div>
          <div class="salessummary-stat">
            <span class="salessummary-label">On Hold</span>
            <span class="salessummary-value">${summary.odm.onHold}</span>
          </div>
          <div class="salessummary-stat">
            <span class="salessummary-label">Dispatched</span>
            <span class="salessummary-value">${summary.odm.dispatched}</span>
          </div>
          <div class="salessummary-stat">
            <span class="salessummary-label">Cancelled</span>
            <span class="salessummary-value">${summary.odm.cancelled}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderInventorySummary(summary) {
    return `
      <div class="salessummary-subsection">
        <h4>By Group</h4>
        <div class="salessummary-list">
          ${Object.entries(summary.groups)
            .sort(([, a], [, b]) => b - a)
            .map(
              ([group, count]) => `
              <div class="salessummary-list-item">
                <span class="salessummary-item-name">${group}</span>
                <span class="salessummary-item-count">${count}</span>
              </div>
            `
            )
            .join("")}
        </div>
      </div>

      <div class="salessummary-subsection">
        <h4>By Status</h4>
        <div class="salessummary-list">
          ${Object.entries(summary.status)
            .sort(([, a], [, b]) => b - a)
            .map(
              ([status, count]) => `
              <div class="salessummary-list-item">
                <span class="salessummary-item-name">${status}</span>
                <span class="salessummary-item-count">${count}</span>
              </div>
            `
            )
            .join("")}
        </div>
      </div>

      <div class="salessummary-subsection">
        <h4>By Category</h4>
        <div class="salessummary-list">
          ${Object.entries(summary.categories)
            .sort(([, a], [, b]) => b - a)
            .map(
              ([category, count]) => `
              <div class="salessummary-list-item">
                <span class="salessummary-item-name">${category}</span>
                <span class="salessummary-item-count">${count}</span>
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  setupRealtimeSubscription() {
    supabaseClient
      .channel("sales_summary_changes")
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

  async fetchUpcomingOdmDispatches() {
    try {
      const { data: orders, error } = await supabaseClient
        .from("orders")
        .select(
          `
          id,
          customer_name,
          agent_state,
          dispatched_state,
          dispatched_box,
          order_items (
            item_name,
            total_pieces
          )
        `
        )
        .eq("order_type", "ODM")
        .eq("status", "PROCESSING")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return orders.map((order) => ({
        customerName: order.customer_name,
        agentState: order.agent_state,
        dispatchedState: order.dispatched_state || "-",
        dispatchedBox: order.dispatched_box || "-",
        totalItems: order.order_items.reduce(
          (sum, item) => sum + (item.total_pieces || 0),
          0
        ),
        items: order.order_items
          .map((item) => `${item.item_name} (${item.total_pieces})`)
          .join(", "),
      }));
    } catch (error) {
      console.error("Error fetching upcoming ODM dispatches:", error);
      return [];
    }
  }

  displayUpcomingOdmDispatches(orders) {
    const container = document.querySelector(".upcoming-odm-dispatches");
    if (!container) return;

    if (!orders.length) {
      container.innerHTML = "<p>No upcoming ODM dispatches</p>";
      return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Customer</th>
          <th>Agent State</th>
          <th>Dispatched State</th>
          <th>Box Info</th>
          <th>Total Items</th>
          <th>Items</th>
        </tr>
      </thead>
      <tbody>
        ${orders
          .map(
            (order) => `
          <tr>
            <td>${order.customerName}</td>
            <td>${order.agentState}</td>
            <td>${order.dispatchedState}</td>
            <td>${order.dispatchedBox}</td>
            <td>${order.totalItems}</td>
            <td>${order.items}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    `;

    container.innerHTML = "";
    container.appendChild(table);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SalesSummary();
});
