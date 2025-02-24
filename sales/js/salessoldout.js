class SalesSoldout {
  constructor() {
    this.modal = null;
    this.initialize();
  }

  initialize() {
    const noteBoard = document.querySelector(".note-board");
    if (noteBoard) {
      const button = document.createElement("button");
      button.className = "salessoldout-button";
      button.textContent = "View Sold Out Items";

      const freightButton = document.querySelector(".sale-freight-button");
      if (freightButton) {
        freightButton.parentNode.insertBefore(
          button,
          freightButton.nextSibling
        );
      } else {
        noteBoard.parentNode.insertBefore(button, noteBoard);
      }

      button.addEventListener("click", () => this.showSoldOutModal());
    }
  }

  async showSoldOutModal() {
    try {
      const { data: items, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq("item_status", "OUT OF STOCK")
        .order("soldout_date", { descending: false });
//        .order("soldout_date", { ascending: false });

      if (error) throw error;

      // Get available weeks from the data
      const weeks = this.getAvailableWeeks(items);

      if (weeks.length === 0) {
        alert("No sold out items found");
        return;
      }

      this.modal = document.createElement("div");
      this.modal.className = "salessoldout-modal";
      this.modal.innerHTML = `
        <div class="salessoldout-content">
          <div class="salessoldout-header">
            <h2>Sold Out Items</h2>
            <div class="salessoldout-actions">
              <button class="salessoldout-export">Export PDF</button>
              <button class="salessoldout-close">&times;</button>
            </div>
          </div>
          <div class="salessoldout-filters">
            <select class="salessoldout-week-filter">
              ${weeks
                .map(
                  (week) => `
                <option value="${week.start.toISOString()}">${
                    week.label
                  }</option>
              `
                )
                .join("")}
            </select>
          </div>
          <div class="salessoldout-table-container">
            <table class="salessoldout-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Colour</th>
                  <th>Name</th>
                  <th>Release Date</th>
                  <th>Sold Out Date</th>
                  <th>Selling Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderTableRows(
                  this.filterByWeek(items, weeks[0].start)
                )}
              </tbody>
            </table>
          </div>
        </div>
      `;

      this.setupEventListeners(items);
      document.body.appendChild(this.modal);
    } catch (error) {
      console.error("Error showing sold out items:", error);
    }
  }

  getAvailableWeeks(items) {
    const dates = items
      .map((item) => item.soldout_date)
      .filter(Boolean)
      .map((date) => new Date(date));

    if (dates.length === 0) return [];

    const latestDate = new Date(Math.max(...dates));
    const earliestDate = new Date(Math.min(...dates));

    const weeks = [];
    let currentStart = this.getWeekStart(latestDate);
    const endDate = this.getWeekStart(earliestDate);

    while (currentStart >= endDate) {
      const weekEnd = new Date(currentStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Calculate week number
      const weekNum = this.getWeekNumber(currentStart);

      // Check if there are items in this week
      const hasItems = items.some((item) => {
        if (!item.soldout_date) return false;
        const itemDate = new Date(item.soldout_date);
        return itemDate >= currentStart && itemDate <= weekEnd;
      });

      // Only add week if it has items
      if (hasItems) {
        weeks.push({
          start: new Date(currentStart),
          end: weekEnd,
          label: `Week ${weekNum} of ${currentStart.getFullYear()} (${this.formatDateToSydney(
            currentStart
          )} - ${this.formatDateToSydney(weekEnd)})`,
        });
      }

      currentStart.setDate(currentStart.getDate() - 7);
    }

    return weeks;
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

  getWeekStart(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - result.getDay()); // Start of week (Sunday)
    return result;
  }

  filterByWeek(items, weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const filteredItems = items.filter((item) => {
      if (!item.soldout_date) return false;
      const soldOutDate = new Date(item.soldout_date);
      return soldOutDate >= weekStart && soldOutDate < weekEnd;
    });

    return this.sortItemsByStatus(filteredItems);
  }

  sortItemsByStatus(items) {
    const statusPriority = {
      "NEW RELEASE": 1,
      "FULL PRICE": 2,
      "ON SALE": 3,
    };

    return [...items].sort((a, b) => {
      const priorityA = statusPriority[a.soldout_status] || 999;
      const priorityB = statusPriority[b.soldout_status] || 999;
      return priorityA - priorityB;
    });
  }

  getStatusClass(status) {
    switch (status?.toUpperCase()) {
      case "NEW RELEASE":
        return "new-release";
      case "FULL PRICE":
        return "full-price";
      case "ON SALE":
        return "on-sale";
      default:
        return "default";
    }
  }

  calculateSellingTime(releaseDate, soldOutDate) {
    if (!releaseDate || !soldOutDate) return "N/A";

    const release = new Date(releaseDate);
    const soldOut = new Date(soldOutDate);
    const diffTime = Math.abs(soldOut - release);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `${diffDays} days`;
  }

  formatDateToSydney(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-AU", {
        timeZone: "Australia/Sydney",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "/");
  }

  renderTableRows(items) {
    return items
      .map(
        (item) => `
        <tr class="status-${this.getStatusClass(item.soldout_status)}">
          <td>${item.code_colour || "N/A"}</td>
          <td>${item.scolour || "N/A"}</td>
          <td>${item.item_name || "N/A"}</td>
          <td>${this.formatDateToSydney(item.release_date)}</td>
          <td>${this.formatDateToSydney(item.soldout_date)}</td>
          <td>${this.calculateSellingTime(
            item.release_date,
            item.soldout_date
          )}</td>
          <td>${item.sprice || "N/A"}</td>
        </tr>
      `
      )
      .join("");
  }

  setupEventListeners(items) {
    const closeBtn = this.modal.querySelector(".salessoldout-close");
    closeBtn.onclick = () => this.modal.remove();

    const weekSelect = this.modal.querySelector(".salessoldout-week-filter");
    weekSelect.addEventListener("change", (e) => {
      const weekStart = new Date(e.target.value);
      const tbody = this.modal.querySelector(".salessoldout-table tbody");
      tbody.innerHTML = this.renderTableRows(
        this.filterByWeek(items, weekStart)
      );
    });

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.modal.remove();
    });

    const exportBtn = this.modal.querySelector(".salessoldout-export");
    exportBtn.addEventListener("click", () => {
      const weekSelect = this.modal.querySelector(".salessoldout-week-filter");
      const weekStart = new Date(weekSelect.value);
      const filteredItems = this.filterByWeek(items, weekStart);
      const weekLabel = weekSelect.options[weekSelect.selectedIndex].text;
      this.exportToPDF(filteredItems, weekLabel);
    });
  }

  async exportToPDF(items, weekLabel) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("portrait");

      // Add title
      doc.setFontSize(16);
      doc.text(`Sold Out Items - ${weekLabel}`, 20, 20);

      // Add date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-AU")}`, 20, 30);

      // Create table data
      const tableData = items.map((item) => [
        item.code_colour || "",
        item.scolour || "",
        item.item_name || "",
        this.formatDateToSydney(item.release_date),
        this.formatDateToSydney(item.soldout_date),
        this.calculateSellingTime(item.release_date, item.soldout_date),
        item.sprice || "",
      ]);

      // Add table
      doc.autoTable({
        startY: 40,
        head: [
          [
            "Code",
            "Colour",
            "Name",
            "Release Date",
            "Sold Out Date",
            "Selling Time",
            "Status",
          ],
        ],
        body: tableData,
        theme: "plain",
        styles: {
          fontSize: 10,
          textColor: [0, 0, 0],
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: false,
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
        },
      });

      // Save PDF
      doc.save(
        `soldout-items-${weekLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SalesSoldout();
});
