import {
  formatDateToSydney,
  getWeekRange,
  calculateSellingTime,
} from "./utils.js";

class SoldOutList {
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
      const buttons = document.querySelectorAll(".show-soldout-list");
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          this.showSoldOutModal();
        });
      });
    }, 100);
  }

  async showSoldOutModal() {
    try {
      // Fetch sold out items
      const { data: items, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq("item_status", "OUT OF STOCK")
        .not("soldout_date", "is", null)
        .order("soldout_date", { ascending: false });

      if (error) throw error;

      // Group items by week
      const weekGroups = this.groupItemsByWeek(items);

      // Get the latest week (first key since items are ordered by date desc)
      const latestWeek = Object.keys(weekGroups)[0];

      // Create modal
      const modal = document.createElement("div");
      modal.className = "modal soldout-modal";

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
      title.textContent = "Weekly Sold Out Items";

      // Add week filter
      const filterContainer = document.createElement("div");
      filterContainer.className = "soldout-filter";

      const weekSelect = document.createElement("select");
      weekSelect.innerHTML = `
                <option value="">Select Week</option>
                ${Object.keys(weekGroups)
                  .map(
                    (week) => `
                    <option value="${week}" ${
                      week === latestWeek ? "selected" : ""
                    }>
                        ${week}
                    </option>
                `
                  )
                  .join("")}
            `;

      // Add table container
      const tableContainer = document.createElement("div");
      tableContainer.className = "soldout-table-container";

      // Add export button container
      const headerButtons = document.createElement("div");
      headerButtons.className = "modal-header-buttons";

      const exportButton = document.createElement("button");
      exportButton.className = "export-pdf-btn";
      exportButton.innerHTML = "Export PDF";

      // Update both table and export button when selection changes
      weekSelect.onchange = () => {
        const selectedWeek = weekSelect.value;
        if (selectedWeek) {
          const weekItems = weekGroups[selectedWeek] || [];
          this.updateTable(weekItems, tableContainer);

          // Get the week range directly from utils
          const weekRange = getWeekRange(weekItems[0].soldout_date);

          exportButton.onclick = () => {
            this.generateSoldoutListPDF(
              weekRange.start,
              weekRange.end,
              weekItems
            );
          };
        }
      };

      headerButtons.appendChild(exportButton);
      filterContainer.appendChild(weekSelect);

      // Assemble modal
      content.appendChild(closeBtn);
      content.appendChild(title);
      content.appendChild(filterContainer);
      content.appendChild(headerButtons); // Move headerButtons after filter
      content.appendChild(tableContainer);
      modal.appendChild(content);
      document.body.appendChild(modal);

      // Show initial data for latest week and set up initial export handler
      if (latestWeek) {
        const initialItems = weekGroups[latestWeek];
        this.updateTable(initialItems, tableContainer);

        // Get the week range for the latest week
        const weekRange = getWeekRange(initialItems[0].soldout_date);

        exportButton.onclick = () => {
          this.generateSoldoutListPDF(
            weekRange.start,
            weekRange.end,
            initialItems
          );
        };
      }
    } catch (error) {
      console.error("Error loading sold out items:", error);
      adminInventory.showNotification("Error loading sold out items", "error");
    }
  }

  groupItemsByWeek(items) {
    const groups = {};

    items.forEach((item) => {
      const weekRange = getWeekRange(item.soldout_date);
      const weekKey = weekRange.formatted;

      if (!groups[weekKey]) {
        groups[weekKey] = [];
      }
      groups[weekKey].push(item);
    });

    return groups;
  }

  updateTable(items, container) {
    if (!items.length) {
      container.innerHTML =
        '<p class="no-data">No items found for selected week</p>';
      return;
    }

    // Sort items by status priority
    const sortedItems = this.sortItemsByStatus(items);

    const table = document.createElement("table");
    table.className = "soldout-table";

//jim add
    table.innerHTML = `
        <thead>
            <tr>
                <th>Code</th>
                <th>Colour</th>
                <th>Name</th>
                <th>ReleaseDate</th>
                <th>SoldOutDate</th>
                <th>SellingTime</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${sortedItems
              .map(
                (item) => `
                <tr class="status-${this.getStatusClass(item.soldout_status)}">
                    <td>${item.code_colour}</td>
                    <td>${item.oicolour || ""}</td>
                    <td>${item.item_name || ""}</td>
                    <td>${formatDateToSydney(item.release_date)}</td>
                    <td>${formatDateToSydney(item.soldout_date)}</td>
                    <td>${calculateSellingTime(
                      item.release_date,
                      item.soldout_date
                    )}</td>
                    <td>${item.oisales || ""}</td>
                </tr>
            `
              )
              .join("")}
        </tbody>
    `;
//                    <td>${item.oicolour || ""}</td>//jim add
//                    <td>${item.soldout_status || ""}</td>

    container.innerHTML = "";
    container.appendChild(table);
  }

  // Add helper method for sorting
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

  // Add helper method for status class names
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

  // Add this method to generate PDF for a specific week's soldout items
  async generateSoldoutListPDF(weekStart, weekEnd, items) {
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
      const usableWidth = pageWidth - margins.left - margins.right;

      // Format dates properly
      const formattedStart =
        weekStart instanceof Date ? formatDateToSydney(weekStart) : weekStart;
      const formattedEnd =
        weekEnd instanceof Date ? formatDateToSydney(weekEnd) : weekEnd;

      // Define status priority
      const statusPriority = {
        "NEW RELEASE": 1,
        "FULL PRICE": 2,
        "ON SALE": 3,
      };

      // Sort items by status first, then by brand
      const sortedItems = [...items].sort((a, b) => {
        const statusA = (a.soldout_status || "").toUpperCase();
        const statusB = (b.soldout_status || "").toUpperCase();

        // First sort by status priority
        const priorityA = statusPriority[statusA] || 999;
        const priorityB = statusPriority[statusB] || 999;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Then sort by brand
        const brandA = a.item_group?.toUpperCase() || "";
        const brandB = b.item_group?.toUpperCase() || "";

        if (brandA === "BOHO") return -1;
        if (brandB === "BOHO") return 1;
        if (brandA === "PRIMROSE") return -1;
        if (brandB === "PRIMROSE") return 1;

        // Then by ODM customer
        const odmA = a.odm_customer || "";
        const odmB = b.odm_customer || "";
        return odmA.localeCompare(odmB);
      });

      // Prepare table data with status column
      const headers = [
        "Code",
        "Brand",
        "Category",
        "Release Date",
        "Soldout Date",
        "Selling Time",
        "Status",
      ];
      const tableData = sortedItems.map((item) => [
        item.code_colour || "",
        this.getBrandInfo(item),
        item.item_category || "",
        formatDateToSydney(item.release_date),
        formatDateToSydney(item.soldout_date),
        calculateSellingTime(item.release_date, item.soldout_date),
        item.soldout_status || "-",
      ]);

      // Add title and info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Soldout Items Report", margins.left, margins.top);

      doc.setFontSize(10);
      doc.text(
        `Period: ${formattedStart} - ${formattedEnd}`,
        margins.left,
        margins.top + 6
      );
      doc.text(`Total Items: ${items.length}`, margins.left, margins.top + 12);

      // Calculate column widths as percentages of usable width
      const columnWidths = {
        0: 0.17, // Code - 17%
        1: 0.13, // Brand - 13%
        2: 0.13, // Category - 13%
        3: 0.15, // Release Date - 15%
        4: 0.15, // Soldout Date - 15%
        5: 0.12, // Selling Time - 12%
        6: 0.15, // Status - 15%
      };

      // Convert percentages to actual widths
      const columnStyles = Object.fromEntries(
        Object.entries(columnWidths).map(([key, percentage]) => [
          key,
          {
            cellWidth: usableWidth * percentage,
            fillColor: [255, 255, 255], // Ensure all cells have white background
          },
        ])
      );

      // Add table with updated styles
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: margins.top + 18,
        margin: margins,
        styles: {
          fontSize: fontSize,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255], // White background for all rows
          minCellHeight: 6,
          cellWidth: "wrap",
          halign: "left",
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: columnStyles,
        // Remove alternateRowStyles to prevent alternating colors
        didDrawPage: (data) => {
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
      doc.save(`soldout-list-${formattedStart}-${timestamp}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }

  // Add helper methods
  getBrandInfo(item) {
    if (!item.item_group) return "-";
    const group = item.item_group.toUpperCase();

    if (group === "BOHO" || group === "PRIMROSE") {
      return group;
    }

    return item.odm_customer || "-";
  }

  formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  calculateSellingTime(releaseDate, soldoutDate) {
    if (!releaseDate || !soldoutDate) return "-";
    const start = new Date(releaseDate);
    const end = new Date(soldoutDate);
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  }
}

// Initialize and make globally available
window.soldOutList = new SoldOutList();

// Also export the class for module usage
export default SoldOutList;
