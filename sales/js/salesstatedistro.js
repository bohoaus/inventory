class SalesStateDistro {
  constructor() {
    this.modal = null;
    this.charts = {};
    this.initialize();
  }

  initialize() {
    const noteBoard = document.querySelector(".note-board");
    if (noteBoard) {
      const button = document.createElement("button");
      button.className = "salesstatedistro-button";
      button.textContent = "View State Distribution";

      const weeklySaleButton = document.querySelector(
        ".salesweeklysale-button"
      );
      if (weeklySaleButton) {
        weeklySaleButton.parentNode.insertBefore(
          button,
          weeklySaleButton.nextSibling
        );
      } else {
        noteBoard.parentNode.insertBefore(button, noteBoard);
      }

      button.addEventListener("click", () => this.showDistroModal());
    }
  }

  async showDistroModal() {
    if (this.modal) return;

    this.modal = document.createElement("div");
    this.modal.className = "salesstatedistro-modal";
    this.modal.innerHTML = `
      <div class="salesstatedistro-content">
        <div class="modal-header">
          <h2>State Distribution</h2>
          <div class="salesstatedistro-actions">
            <button class="salesstatedistro-export">Export PDF</button>
            <span class="close">&times;</span>
          </div>
        </div>
        <div class="modal-body">
          <div class="filter-section">
            <div class="date-filter">
              <label>Select Week Period:</label>
              <div class="date-inputs">
                <input type="date" id="weekStart" class="date-input">
                <span>to</span>
                <input type="date" id="weekEnd" class="date-input" disabled>
              </div>
            </div>
          </div>
          <div class="content-scroll">
            <div class="summary-section">
              <h3>Order Summary</h3>
              <div class="summary-tables">
                <div class="summary-table">
                  <h4>Wholesale Orders <span class="total-count" id="wholesaleTotal">0</span></h4>
                  <table id="wholesaleTable">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Orders</th>
                      </tr>
                    </thead>
                    <tbody></tbody>
                  </table>
                </div>
                <div class="summary-table">
                  <h4>ODM Orders <span class="total-count" id="odmTotal">0</span></h4>
                  <table id="odmTable">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Orders</th>
                      </tr>
                    </thead>
                    <tbody></tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="charts-container">
              <div class="chart-group">
                <h3>Agent State Distribution</h3>
                <div class="chart-row">
                  <div class="chart-section">
                    <canvas id="agentStateChartWholesale"></canvas>
                  </div>
                  <div class="chart-section">
                    <canvas id="agentStateChartOdm"></canvas>
                  </div>
                </div>
              </div>
              <div class="chart-group">
                <h3>Dispatched State Distribution</h3>
                <div class="chart-row">
                  <div class="chart-section">
                    <canvas id="dispatchedStateChartWholesale"></canvas>
                  </div>
                  <div class="chart-section">
                    <canvas id="dispatchedStateChartOdm"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.setupEventListeners();
    this.initializeCharts();

    // Set default to current week
    const currentWeekStart = this.getCurrentWeekStart();
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startInput = this.modal.querySelector("#weekStart");
    const endInput = this.modal.querySelector("#weekEnd");
    startInput.value = currentWeekStart.toISOString().split("T")[0];
    endInput.value = weekEnd.toISOString().split("T")[0];

    await this.fetchAndDisplayData(currentWeekStart, weekEnd);
  }

  getCurrentWeekStart() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = now.getDate() - currentDay;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  setupEventListeners() {
    const closeBtn = this.modal.querySelector(".close");
    closeBtn.onclick = () => {
      this.modal.remove();
      this.modal = null;
    };

    const dateInputs = this.modal.querySelectorAll(".date-input");
    dateInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const startDate = new Date(
          this.modal.querySelector("#weekStart").value
        );
        const endDate = new Date(this.modal.querySelector("#weekEnd").value);
        if (startDate && endDate && startDate <= endDate) {
          this.fetchAndDisplayData(startDate, endDate);
        }
      });
    });

    const exportBtn = this.modal.querySelector(".salesstatedistro-export");
    exportBtn.addEventListener("click", () => {
      const startDate = this.modal.querySelector("#weekStart").value;
      const endDate = this.modal.querySelector("#weekEnd").value;
      const periodLabel = `${startDate} to ${endDate}`;
      const data = this.getTableData();
      this.exportToPDF(data, periodLabel);
    });

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.modal.remove();
        this.modal = null;
      }
    });

    const weekStart = this.modal.querySelector("#weekStart");
    weekStart.addEventListener("change", () => {
      const startDate = new Date(weekStart.value);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const weekEnd = this.modal.querySelector("#weekEnd");
      weekEnd.value = endDate.toISOString().split("T")[0];

      this.fetchAndDisplayData(startDate, endDate);
    });
  }

  async fetchAndDisplayData(startDate, endDate) {
    try {
      const { data: orders, error: ordersError } = await supabaseClient
        .from("orders")
        .select(
          `
          id,
          customer_name,
          agent_state,
          dispatched_state,
          order_type,
          status,
          order_items (
            id,
            total_pieces
          )
        `
        )
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        this.displayNoData();
        return;
      }

      const summary = this.summarizeOrders(orders);
      this.displayOrderSummary(summary.orderSummary);
      this.updateCharts(summary.stateDistribution);
    } catch (error) {
      console.error("Error details:", error);
      this.displayError();
    }
  }

  summarizeOrders(orders) {
    const stateDistribution = {
      agent: {
        wholesale: {},
        odm: {},
      },
      dispatched: {
        wholesale: {},
        odm: {},
      },
    };
    const orderSummary = {
      wholesale: {},
      odm: {},
    };

    orders.forEach((order) => {
      const type =
        order.order_type?.toLowerCase() === "wholesale" ? "wholesale" : "odm";

      // Agent state distribution
      const agentState = order.agent_state || "Unknown";
      if (!stateDistribution.agent[type][agentState]) {
        stateDistribution.agent[type][agentState] = {
          orders: 0,
          items: 0,
        };
      }
      stateDistribution.agent[type][agentState].orders++;
      stateDistribution.agent[type][agentState].items +=
        order.order_items.reduce(
          (sum, item) => sum + (item.total_pieces || 0),
          0
        );

      // Dispatched state distribution (only for dispatched orders)
      if (order.status === "DISPATCHED" && order.dispatched_state) {
        const dispatchedState = order.dispatched_state;
        if (!stateDistribution.dispatched[type][dispatchedState]) {
          stateDistribution.dispatched[type][dispatchedState] = {
            orders: 0,
            items: 0,
          };
        }
        stateDistribution.dispatched[type][dispatchedState].orders++;
        stateDistribution.dispatched[type][dispatchedState].items +=
          order.order_items.reduce(
            (sum, item) => sum + (item.total_pieces || 0),
            0
          );
      }

      // Order summary
      const status = order.status || "Unknown";
      if (!orderSummary[type][status]) {
        orderSummary[type][status] = {
          orders: 0,
          items: 0,
        };
      }
      orderSummary[type][status].orders++;
      orderSummary[type][status].items += order.order_items.reduce(
        (sum, item) => sum + (item.total_pieces || 0),
        0
      );
    });

    return {
      stateDistribution,
      orderSummary,
    };
  }

  displayOrderSummary(summary) {
    const displayTable = (data, tableId, totalId) => {
      const tbody = this.modal.querySelector(`#${tableId} tbody`);
      tbody.innerHTML = "";

      let totalOrders = 0;

      Object.entries(data).forEach(([status, stats]) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${status}</td>
          <td>${stats.orders}</td>
        `;
        tbody.appendChild(row);
        totalOrders += stats.orders;
      });

      // Update total count in header
      const totalElement = this.modal.querySelector(`#${totalId}`);
      totalElement.textContent = `(${totalOrders})`;
    };

    displayTable(summary.wholesale, "wholesaleTable", "wholesaleTotal");
    displayTable(summary.odm, "odmTable", "odmTotal");
  }

  updateCharts(data) {
    const updatePieChart = (chart, data, type, title) => {
      if (!data[type]) return; // Skip if no data for this type

      const states = Object.keys(data[type]);
      const values = states.map((state) => data[type][state].orders);
      const total = values.reduce((a, b) => a + b, 0);

      if (total === 0) return; // Skip if no orders

      const labels = states.map(
        (state) =>
          `${state} (${((data[type][state].orders / total) * 100).toFixed(1)}%)`
      );

      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.options.plugins.title.text = `${title} - ${type.toUpperCase()}`;
      chart.update();
    };

    // Update wholesale charts
    updatePieChart(
      this.charts.agentStateWholesale,
      data.agent,
      "wholesale",
      "Agent State Distribution"
    );
    updatePieChart(
      this.charts.dispatchedStateWholesale,
      data.dispatched,
      "wholesale",
      "Dispatched State Distribution"
    );

    // Update ODM charts
    updatePieChart(
      this.charts.agentStateOdm,
      data.agent,
      "odm",
      "Agent State Distribution"
    );
    updatePieChart(
      this.charts.dispatchedStateOdm,
      data.dispatched,
      "odm",
      "Dispatched State Distribution"
    );
  }

  displayNoData() {
    // Clear summary tables
    const wholesaleTable = this.modal.querySelector("#wholesaleTable tbody");
    const odmTable = this.modal.querySelector("#odmTable tbody");
    wholesaleTable.innerHTML = `<tr><td colspan="3">No orders found</td></tr>`;
    odmTable.innerHTML = `<tr><td colspan="3">No orders found</td></tr>`;

    // Clear charts
    this.updateCharts({
      agent: { wholesale: {}, odm: {} },
      dispatched: { wholesale: {}, odm: {} },
    });
  }

  displayError() {
    // Show error in tables
    const wholesaleTable = this.modal.querySelector("#wholesaleTable tbody");
    const odmTable = this.modal.querySelector("#odmTable tbody");
    const errorMessage = `
      <tr>
        <td colspan="3" style="color: #dc3545;">
          Error loading data. Please try again.
        </td>
      </tr>
    `;
    wholesaleTable.innerHTML = errorMessage;
    odmTable.innerHTML = errorMessage;

    // Clear charts
    this.updateCharts({
      agent: { wholesale: {}, odm: {} },
      dispatched: { wholesale: {}, odm: {} },
    });
  }

  getTableData() {
    const rows = this.modal.querySelectorAll(
      "#distroTable tbody tr, #distroTable tfoot tr"
    );
    const data = [];

    rows.forEach((row) => {
      const cells = row.cells;
      data.push({
        state: cells[0].textContent,
        orders: cells[1].textContent,
        items: cells[2].textContent,
        customers: cells[3].textContent,
      });
    });

    return data;
  }

  async exportToPDF(data, periodLabel) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const columnWidth = (pageWidth - margin * 3) / 2;

      // Add title
      doc.setFontSize(16);
      doc.text(`State Distribution - ${periodLabel}`, margin, margin + 10);

      // Add date
      doc.setFontSize(10);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-AU")}`,
        margin,
        margin + 20
      );

      // Add Order Summary title
      doc.setFontSize(14);
      doc.text("Order Summary", margin, margin + 35);

      // Get summary data
      const wholesaleTotal =
        this.modal.querySelector("#wholesaleTotal").textContent;
      const odmTotal = this.modal.querySelector("#odmTotal").textContent;
      const wholesaleData = this.getSummaryTableData("wholesaleTable");
      const odmData = this.getSummaryTableData("odmTable");

      // Add Wholesale Orders table
      doc.setFontSize(12);
      doc.text(`Wholesale Orders ${wholesaleTotal}`, margin, margin + 45);
      doc.autoTable({
        startY: margin + 50,
        head: [["Status", "Orders"]],
        body: wholesaleData,
        theme: "plain",
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: columnWidth * 0.6 },
          1: { cellWidth: columnWidth * 0.4, halign: "right" },
        },
        margin: { left: margin },
      });

      // Add ODM Orders table
      doc.text(
        `ODM Orders ${odmTotal}`,
        margin + columnWidth + margin,
        margin + 45
      );
      doc.autoTable({
        startY: margin + 50,
        head: [["Status", "Orders"]],
        body: odmData,
        theme: "plain",
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: columnWidth * 0.6 },
          1: { cellWidth: columnWidth * 0.4, halign: "right" },
        },
        margin: { left: margin + columnWidth + margin },
      });

      // Get chart images
      const chartImages = await this.getChartImages();
      const chartsStartY =
        Math.max(doc.autoTable.previous.finalY, doc.previousAutoTable.finalY) +
        20;
      const chartWidth = (pageWidth - margin * 3) / 2;
      const chartHeight = (pageHeight - chartsStartY - margin * 3) / 2;

      // Add chart titles
      doc.setFontSize(12);
      doc.text(
        "Agent State Distribution",
        margin + chartWidth / 2 - 20,
        chartsStartY - 5,
        { align: "center" }
      );
      doc.text(
        "Dispatched State Distribution",
        margin + chartWidth * 1.5 + 20,
        chartsStartY - 5,
        { align: "center" }
      );

      // Add charts
      doc.addImage(
        chartImages.agentWholesale,
        "PNG",
        margin,
        chartsStartY,
        chartWidth,
        chartHeight
      );
      doc.addImage(
        chartImages.agentOdm,
        "PNG",
        margin * 2 + chartWidth,
        chartsStartY,
        chartWidth,
        chartHeight
      );
      doc.addImage(
        chartImages.dispatchedWholesale,
        "PNG",
        margin,
        chartsStartY + chartHeight + margin,
        chartWidth,
        chartHeight
      );
      doc.addImage(
        chartImages.dispatchedOdm,
        "PNG",
        margin * 2 + chartWidth,
        chartsStartY + chartHeight + margin,
        chartWidth,
        chartHeight
      );

      // Save PDF
      doc.save(
        `state-distribution-${periodLabel
          .replace(/\s+/g, "-")
          .toLowerCase()}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }

  getSummaryTableData(tableId) {
    const tbody = this.modal.querySelector(`#${tableId} tbody`);
    const rows = Array.from(tbody.querySelectorAll("tr"));
    return rows.map((row) => [
      row.cells[0].textContent,
      row.cells[1].textContent,
    ]);
  }

  async getChartImages() {
    const getChartImage = async (chartId) => {
      const canvas = this.modal.querySelector(chartId);
      return canvas.toDataURL("image/png");
    };

    return {
      agentWholesale: await getChartImage("#agentStateChartWholesale"),
      agentOdm: await getChartImage("#agentStateChartOdm"),
      dispatchedWholesale: await getChartImage(
        "#dispatchedStateChartWholesale"
      ),
      dispatchedOdm: await getChartImage("#dispatchedStateChartOdm"),
    };
  }

  initializeCharts() {
    const createPieChart = (ctx) =>
      new Chart(ctx, {
        type: "pie",
        data: {
          labels: [],
          datasets: [
            {
              data: [],
              backgroundColor: [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
            },
            title: {
              display: true,
              text: "",
              font: {
                size: 14,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
        },
      });

    // Initialize all charts with correct IDs
    this.charts = {
      agentStateWholesale: createPieChart(
        this.modal.querySelector("#agentStateChartWholesale").getContext("2d")
      ),
      agentStateOdm: createPieChart(
        this.modal.querySelector("#agentStateChartOdm").getContext("2d")
      ),
      dispatchedStateWholesale: createPieChart(
        this.modal
          .querySelector("#dispatchedStateChartWholesale")
          .getContext("2d")
      ),
      dispatchedStateOdm: createPieChart(
        this.modal.querySelector("#dispatchedStateChartOdm").getContext("2d")
      ),
    };
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SalesStateDistro();
});
