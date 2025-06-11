class OrderContribution {
  constructor() {
    this.charts = {};
    this.currentWeek = new Date();
  }

  async initialize() {
    // Create modal if it doesn't exist
    this.createModal();
    this.modal.style.display = "block";

    // Load initial data for current week
    await this.loadData();
  }

//                            <h3 width:400px>Wholesale (Orders:<span style="width:150px; color:blue" id=""></span>)</h3>
//                            <h3 width:400px>ODM (Orders:<span style="width:150px; color:blue" id=""></span>)</h3>
  createModal() {
    if (!document.getElementById("orderContributionModal")) {
      const modalHTML = `
                <div id="orderContributionModal" class="order-contribution-modal">
                    <div class="order-contribution-content">
                        <div class="order-contribution-header">
                            <h2>Orders Contribution Analysis</h2>
                            <span class="order-contribution-close">&times;</span>
                        </div>

                            <div class="week-selector">
                                <label>Select Week:</label>
                                <input style="width:200px; color:blue" type="week" id="weekSelector">
                            </div>

                        <div class="order-contribution-filters">

                        </div>
                        
                        <div class="weekly-stats">

                            <div class="stat-group">
                                <div class="stat-card">
                                    <h3>Wholesale Orders:</h3>
                                    <div class="value" id="totalWholesale" style="width:60px; color:blue"> </div>
                                </div>
                                <div class="stat-card">
                                    <h3>Processing</h3>
                                    <div class="value" id="processingWholesale" style="width:40px; color:blue">0</div>
                                </div>
                                <div class="stat-card">
                                    <h3>On Hold</h3>
                                    <div class="value" id="holdWholesale" style="width:40px; color:blue">0</div>
                                </div>
                                <div class="stat-card">
                                    <h3>Dispatched</h3>
                                    <div class="value" id="dispatchedWholesale" style="width:40px; color:blue">0</div>
                                </div>
                                <div class="stat-card">
                                    <h3>Cancelled</h3>
                                    <div class="value" id="cancelledWholesale" style="width:40px; color:blue">0</div>
                                </div>
                            </div>

                            <div class="stat-group">
                                <div class="stat-card">
                                    <h3>ODM Orders:</h3>
                                    <div class="value" id="totalOdm" style="width:80px; color:blue"> </div>
                                </div>
                                <div class="stat-card">
                                    <h3>Processing</h3>
                                    <div class="value" id="processingOdm" style="width:40px; color:blue">0</div>
                                </div>
                                <div class="stat-card">
                                    <h3>On Hold</h3>
                                    <div class="value" id="holdOdm" style="width:40px; color:blue">0</div>
                                </div>
                                <div class="stat-card">
                                    <h3>Dispatched</h3>
                                    <div class="value" id="dispatchedOdm" style="width:40px; color:blue">0</div>
                                </div>
                                <div class="stat-card">
                                    <h3>Cancelled</h3>
                                    <div class="value" id="cancelledOdm" style="width:40px; color:blue">0</div>
                                </div>
                            </div>
                        </div>
                        <div class="order-contribution-charts">
                            <div class="chart-container">
                                <canvas id="agentStateChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <canvas id="dispatchedStateChart"></canvas>
                            </div>
                        </div>
                        <h3 class="section-title">Detailed Order Data</h3>
                        <div class="order-data-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order Date</th>
                                        <th>Order Type</th>
                                        <th>Status</th>
                                        <th>Customer Name</th>
                                        <th>Agent</th>
                                        <th>Dispatched</th>
                                        <th>Items</th>
                                    </tr>
                                </thead>
                                <tbody id="orderTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML("beforeend", modalHTML);

      // Add event listeners
      this.modal = document.getElementById("orderContributionModal");
      const closeBtn = this.modal.querySelector(".order-contribution-close");
      closeBtn.onclick = () => (this.modal.style.display = "none");

      window.onclick = (event) => {
        if (event.target === this.modal) {
          this.modal.style.display = "none";
        }
      };

      const weekSelector = document.getElementById("weekSelector");
      weekSelector.addEventListener("change", () => {
        // Clear previous data
        this.clearData();
        // Load new data for selected week
        this.loadData();
      });

      // Set initial week value
      const now = new Date();
      const weekNum = this.getWeekNumber(now);
      weekSelector.value = `${now.getFullYear()}-W${weekNum
        .toString()
        .padStart(2, "0")}`;
    }
    this.modal = document.getElementById("orderContributionModal");
  }

  clearData() {
    // Clear stats
    document.getElementById("totalWholesale").textContent = "0";
    document.getElementById("processingWholesale").textContent = "0";
    document.getElementById("holdWholesale").textContent = "0";
    document.getElementById("dispatchedWholesale").textContent = "0";
    document.getElementById("cancelledWholesale").textContent = "0";
    document.getElementById("totalOdm").textContent = "0";
    document.getElementById("processingOdm").textContent = "0";
    document.getElementById("holdOdm").textContent = "0";
    document.getElementById("dispatchedOdm").textContent = "0";
    document.getElementById("cancelledOdm").textContent = "0";

    // Clear charts
    if (this.charts.agentState) {
      this.charts.agentState.destroy();
    }
    if (this.charts.dispatchedState) {
      this.charts.dispatchedState.destroy();
    }

    // Clear table
    const tableBody = document.getElementById("orderTableBody");
    if (tableBody) {
      tableBody.innerHTML = "";
    }
  }

  async loadData() {
    try {
      const weekSelector = document.getElementById("weekSelector");
      const [year, week] = weekSelector.value.split("-W");
      const dates = this.getWeekDates(parseInt(year), parseInt(week));

      // Show loading state
      const tableBody = document.getElementById("orderTableBody");
      if (tableBody) {
        tableBody.innerHTML =
          '<tr><td colspan="7" style="text-align: center;">Loading...</td></tr>';
      }

      // Log the date range for debugging
      console.log(
        "Fetching orders between:",
        dates.start.toISOString(),
        "and",
        dates.end.toISOString()
      );

      // Query orders within the selected week's date range
      //  .gte("created_at", dates.start.toISOString())
      const { data: orders, error } = await supabaseClient
        .from("orders")
        .select("*")
        .gte("orderdate", dates.start.toISOString())
        .lte("orderdate", dates.end.toISOString())
        .order("orderdate", { ascending: false });

      if (error) {
        console.error("Error loading orders:", error);
        if (tableBody) {
          tableBody.innerHTML =
            '<tr><td colspan="7" style="text-align: center; color: red;">Error loading data</td></tr>';
        }
        return;
      }

      // Log the retrieved orders for debugging
      console.log("Retrieved orders:", orders);

      if (!orders || orders.length === 0) {
        if (tableBody) {
          tableBody.innerHTML =
            '<tr><td colspan="7" style="text-align: center;">No orders found for this week</td></tr>';
        }
        return;
      }

      this.updateStats(orders);
      this.createCharts(orders);
      this.updateTable(orders);
    } catch (error) {
      console.error("Error in loadData:", error);
      const tableBody = document.getElementById("orderTableBody");
      if (tableBody) {
        tableBody.innerHTML =
          '<tr><td colspan="7" style="text-align: center; color: red;">Error loading data</td></tr>';
      }
    }
  }

  updateStats(orders) {
    // Separate orders by type (case-insensitive comparison)
    const wholesaleOrders = orders.filter(
      (o) => o.order_type?.toLowerCase() === "wholesale"
    );
    const odmOrders = orders.filter(
      (o) => o.order_type?.toLowerCase() === "odm"
    );

    // Update wholesale stats with case-insensitive comparisons
    document.getElementById("totalWholesale").textContent =
      wholesaleOrders.length;
    document.getElementById("processingWholesale").textContent =
      wholesaleOrders.filter(
        (o) =>
          o.status?.toLowerCase() === "processing" ||
          o.status?.toLowerCase() === "picking"
      ).length;
    document.getElementById("holdWholesale").textContent =
      wholesaleOrders.filter(
        (o) => o.status?.toLowerCase() === "wholesale hold"
      ).length;
    document.getElementById("dispatchedWholesale").textContent =
      wholesaleOrders.filter(
        (o) => o.status?.toLowerCase() === "dispatched"
      ).length;
    document.getElementById("cancelledWholesale").textContent =
      wholesaleOrders.filter(
        (o) => o.status?.toLowerCase() === "cancelled"
      ).length;

    // Update ODM stats with case-insensitive comparisons
    document.getElementById("totalOdm").textContent = odmOrders.length;
    document.getElementById("processingOdm").textContent = odmOrders.filter(
      (o) =>
        o.status?.toLowerCase() === "processing" ||
        o.status?.toLowerCase() === "picking"
    ).length;
    document.getElementById("holdOdm").textContent = odmOrders.filter(
      (o) => o.status?.toLowerCase() === "odm hold"
    ).length;
    document.getElementById("dispatchedOdm").textContent = odmOrders.filter(
      (o) => o.status?.toLowerCase() === "dispatched"
    ).length;
    document.getElementById("cancelledOdm").textContent = odmOrders.filter(
      (o) => o.status?.toLowerCase() === "cancelled"
    ).length;
  }

  createCharts(orders) {
    this.createAgentStateChart(orders);
    this.createDispatchedStateChart(orders);
  }

  createAgentStateChart(orders) {
    const wholesaleStates = {};
    const odmStates = {};

    orders.forEach((order) => {
      if (order.agent_state) {
        const state = order.agent_state.toLowerCase();
        if (order.order_type?.toLowerCase() === "wholesale") {
          wholesaleStates[state] = (wholesaleStates[state] || 0) + 1;
        } else if (order.order_type?.toLowerCase() === "odm") {
          odmStates[state] = (odmStates[state] || 0) + 1;
        }
      }
    });

    const ctx = document.getElementById("agentStateChart");
    if (this.charts.agentState) {
      this.charts.agentState.destroy();
    }

    this.charts.agentState = new Chart(ctx, {
      type: "pie",
      data: {
        datasets: [
          {
            label: "Wholesale",
            data: Object.values(wholesaleStates),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "olive",
              "maroon",
              "blue",
              "pink",
            ],
          },
          {
            label: "ODM",
            data: Object.values(odmStates),
            backgroundColor: [
              "#FF9F40",
              "#4CAF50",
              "#9C27B0",
              "#FF5722",
              "#795548",
              "silver",
              "navy",
              "lime",
              "pink",
            ],
          },
        ],
        labels: Array.from(
          new Set([...Object.keys(wholesaleStates), ...Object.keys(odmStates)])
        ),
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right",
          },
          title: {
            display: true,
            text: "Orders by Agent State",
          },
        },
      },
    });
  }

  createDispatchedStateChart(orders) {
    const wholesaleStates = {};
    const odmStates = {};

    orders.forEach((order) => {
      if (order.dispatched_state) {
        const state = order.dispatched_state.toLowerCase();
        if (order.order_type?.toLowerCase() === "wholesale") {
          wholesaleStates[state] = (wholesaleStates[state] || 0) + 1;
        } else if (order.order_type?.toLowerCase() === "odm") {
          odmStates[state] = (odmStates[state] || 0) + 1;
        }
      }
    });

    const ctx = document.getElementById("dispatchedStateChart");
    if (this.charts.dispatchedState) {
      this.charts.dispatchedState.destroy();
    }

    this.charts.dispatchedState = new Chart(ctx, {
      type: "pie",
      data: {
        datasets: [
          {
            label: "Wholesale",
            data: Object.values(wholesaleStates),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "olive",
              "maroon",
              "blue",
              "pink",
            ],
          },
          {
            label: "ODM",
            data: Object.values(odmStates),
            backgroundColor: [
              "#FF9F40",
              "#4CAF50",
              "#9C27B0",
              "#FF5722",
              "#795548",
              "silver",
              "navy",
              "lime",
              "pink",
            ],
          },
        ],
        labels: Array.from(
          new Set([...Object.keys(wholesaleStates), ...Object.keys(odmStates)])
        ),
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right",
          },
          title: {
            display: true,
            text: "Orders by Dispatched State",
          },
        },
      },
    });
  }

  getWeekNumber(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  getWeekDates(year, week) {
    // Create date object for January 1st of the given year
    const januaryFirst = new Date(year, 0, 1);

    // Get the day of the week for January 1st (0 = Sunday, 1 = Monday, etc.)
    const dayOffset = januaryFirst.getDay();

    // Calculate the date for the first day of the given week
    const firstWeekday = new Date(year, 0, 1 + (week - 1) * 7 - dayOffset);

    // Calculate the date for the last day of the given week
    const lastWeekday = new Date(firstWeekday);
    lastWeekday.setDate(firstWeekday.getDate() + 6);

    // Set times to start and end of day
    firstWeekday.setHours(0, 0, 0, 0);
    lastWeekday.setHours(23, 59, 59, 999);

    return {
      start: firstWeekday,
      end: lastWeekday,
    };
  }

  updateTable(orders) {
    const tableBody = document.getElementById("orderTableBody");
    if (!tableBody) return;

    // Log the orders being rendered
    console.log("Rendering orders:", orders);

    if (orders.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No orders found</td></tr>';
      return;
    }

    tableBody.innerHTML = orders
      .map((order) => {
        // Log each order for debugging
        console.log("Processing order:", order);

        return `
                <tr>
                    <td>${this.formatDate(order.orderdate)}</td>
                    <td>${
                      this.capitalizeFirstLetter(order.order_type) || "-"
                    }</td>
                    <td>${this.formatStatus(order.status) || "-"}</td>
                    <td>${order.customer_name || "-"}</td>
                    <td>${
                      this.capitalizeFirstLetter(order.agent_state) || "-"
                    }</td>
                    <td>${
                      this.capitalizeFirstLetter(order.dispatched_state) || "-"
                    }</td>
                    <td>${order.total_items || "0"}</td>
                </tr>
            `;
      })
      .join("");
  }

  // Helper methods for better data display
  capitalizeFirstLetter(string) {
    if (!string) return "-";
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  formatStatus(status) {
    if (!status) return "-";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

//        day: "2-digit",
//        hour: "2-digit",
//        minute: "2-digit",
  formatDate(dateString) {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-AU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  }
}
