import { formatDateToSydney, calculateSellingTime } from "./utils.js";

// Initialize jsPDF from the window object
const { jsPDF } = window.jspdf;

class PDFExport {
  constructor() {
    this.selectedColumns = [];
    this.sortColumn = "Code_Colour";
    this.sortDirection = "asc";
    this.orientation = "portrait";
    this.maxColumnsWarning = {
      portrait: 6,
      landscape: 10,
    };
  }

  async showExportOptionsDialog() {
    try {
      const modal = document.createElement("div");
      modal.className = "modal export-modal";

      const content = document.createElement("div");
      content.className = "modal-content";

      // Fetch unique values for filters
      const categories = await this.getUniqueValues("Category");
      const statuses = await this.getUniqueValues("Status");
      const groups = await this.getUniqueValues("BrandGroup");

      content.innerHTML = `
            <div class="modal-header">
                <h2>Export PDF Settings</h2>
                <button class="modal-close">&times;</button>
                    </div>
            
            <div class="export-settings">
                <!-- Column Selection Section -->
                <div class="settings-section">
                    <h3>Select Columns</h3>
                    <div class="columns-sort-container">
                        ${this.createColumnSelectionHTML()}
                    </div>
                    <div id="columnWarning" class="warning-message" style="display: none;">
                        Warning: Too many columns selected for the current orientation
                    </div>
            </div>

                <!-- Sort and Orientation Section -->
                <div class="settings-section">
                    <h3>Sort and Layout</h3>
                    <div class="sort-container">
                        <div class="sort-group">
                            <label for="sortColumn">Sort By:</label>
                            <select id="sortColumn">
                                ${this.generateSortOptions()}
                            </select>
            </div>
                        <div class="sort-group">
                            <label for="sortDirection">Direction:</label>
                            <select id="sortDirection">
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
        </div>
                        <div class="sort-group">
                            <label for="pdfOrientation">Page Orientation:</label>
                            <select id="pdfOrientation">
                                <option value="portrait">Portrait</option>
                                <option value="landscape">Landscape</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Filters Section -->
                <div class="settings-section">
                    <h3>Filters</h3>
                    <div class="filters-container">
                        <!-- Category Filter -->
                        <div class="filter-group">
                            <label>Category</label>
                            <select multiple class="filter-select" id="category-filter">
                                <option value="">All Categories</option>
                                ${categories
                                  .map(
                                    (cat) =>
                                      `<option value="${cat}">${cat}</option>`
                                  )
                                  .join("")}
                            </select>
                        </div>

                        <!-- Status Filter -->
                        <div class="filter-group">
                            <label>Status</label>
                            <select multiple class="filter-select" id="status-filter">
                                <option value="">All Statuses</option>
                                ${statuses
                                  .map(
                                    (status) =>
                                      `<option value="${status}">${status}</option>`
                                  )
                                  .join("")}
                            </select>
                        </div>

                        <!-- Group Filter -->
                        <div class="filter-group">
                            <label>Group</label>
                            <select multiple class="filter-select" id="group-filter">
                                <option value="">All Groups</option>
                                ${groups
                                  .map(
                                    (group) =>
                                      `<option value="${group}">${group}</option>`
                                  )
                                  .join("")}
                </select>
            </div>
                    </div>
                </div>

                <!-- Preview Section -->
                <div class="settings-section">
                    <h3>Preview</h3>
                    <div class="preview-container">
                        ${this.createPreviewTableHTML()}
                    </div>
                </div>
            </div>

            <div class="export-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="primary-btn" id="exportPDF">Export PDF</button>
        </div>
    `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      // Set up event listeners
      const closeBtn = content.querySelector(".modal-close");
      const cancelBtn = content.querySelector(".cancel-btn");
      const exportBtn = content.querySelector(".primary-btn");
      const categoryFilter = content.querySelector("#category-filter");
      const statusFilter = content.querySelector("#status-filter");
      const groupFilter = content.querySelector("#group-filter");

      closeBtn.onclick = () => modal.remove();
      cancelBtn.onclick = () => modal.remove();

      exportBtn.onclick = () => {
        const filters = {
          categories: Array.from(categoryFilter.selectedOptions)
            .map((opt) => opt.value)
            .filter((v) => v),
          statuses: Array.from(statusFilter.selectedOptions)
            .map((opt) => opt.value)
            .filter((v) => v),
          groups: Array.from(groupFilter.selectedOptions)
            .map((opt) => opt.value)
            .filter((v) => v),
        };
        this.generatePDF(this.selectedColumns, filters);
        modal.remove();
      };

      // Set up column selection listeners
      this.setupEventListeners(modal);
      this.updatePreview();

      // Add filter change listeners
      [categoryFilter, statusFilter, groupFilter].forEach((filter) => {
        filter.onchange = () => this.updatePreview();
      });
    } catch (error) {
      console.error("Error initializing export dialog:", error);
      alert("Error loading export options. Please try again.");
    }
  }

  generateColumnOptions() {
    const columns = [
      { id: "Code_Colour", label: "Code" },
      { id: "Item_Name", label: "Item Name" },
      { id: "BrandGroup", label: "Group" },
      { id: "Location", label: "Location" },
      { id: "Category", label: "Category" },
      { id: "Qty", label: "Qty" },//Received 
      { id: "ReleaseDate", label: "ReleaseDate" },
      { id: "Stock", label: "Stock" },
      { id: "Item_Aging", label: "Item Aging" },
      { id: "Status", label: "Status" },
      { id: "SoldoutDate", label: "SoldoutDate" },
      { id: "UnitP", label: "UnitP" },
      { id: "Pack_Size", label: "Pack Size" },
      { id: "Repeat_Item", label: "RepeatItem" },
      { id: "mfgDate", label: "ManufactureDate" },
      { id: "Cargo", label: "Cargo" },
      { id: "estDate", label: "EstimatedDate" },
      { id: "ArriveDate", label: "ArriveDate" },
      { id: "DelayDate", label: "DelayDate" },
      { id: "odmPPO", label: "ODM PPO" },
      { id: "odmCustomer", label: "ODM Customer" },
      { id: "Item_Note", label: "Note" },
      { id: "Created", label: "Created At" },
      { id: "Updated", label: "Updated At" },
    ];

    return columns
      .map(
        (col) => `
      <option value="${col.id}">${col.label}</option>
    `
      )
      .join("");
  }

  generateSortOptions() {
    return this.generateColumnOptions(); // Reuse the same columns for sorting
  }

  async updatePreview() {
    const previewContainer = document.getElementById("previewTable");
    if (!previewContainer) return;

    try {
      // Get selected columns
      const selectedColumnsElement = document.getElementById("selectedColumns");
      if (
        !selectedColumnsElement ||
        selectedColumnsElement.options.length === 0
      ) {
        previewContainer.innerHTML =
          '<p class="warning-message">Please select columns to preview</p>';
        return;
      }

      this.selectedColumns = Array.from(selectedColumnsElement.options).map(
        (opt) => opt.value
      );

      // Get sort settings
      const sortColumn =
        document.getElementById("sortColumn")?.value || "Code_Colour";
      const sortDirection =
        document.getElementById("sortDirection")?.value || "asc";

      // Get filter values
      const categoryFilter = document.getElementById("category-filter");
      const statusFilter = document.getElementById("status-filter");
      const groupFilter = document.getElementById("group-filter");

      let query = supabaseClient
        .from("inventory")
        .select(this.selectedColumns.join(","))
        .order(sortColumn, { ascending: sortDirection === "asc" })
        .limit(10);

      // Apply filters if selected
      if (categoryFilter?.selectedOptions.length > 0) {
        const categories = Array.from(categoryFilter.selectedOptions)
          .map((opt) => opt.value)
          .filter((v) => v);
        if (categories.length > 0) {
          query = query.in("Category", categories);
        }
      }

      if (statusFilter?.selectedOptions.length > 0) {
        const statuses = Array.from(statusFilter.selectedOptions)
          .map((opt) => opt.value)
          .filter((v) => v);
        if (statuses.length > 0) {
          query = query.in("Status", statuses);
        }
      }

      if (groupFilter?.selectedOptions.length > 0) {
        const groups = Array.from(groupFilter.selectedOptions)
          .map((opt) => opt.value)
          .filter((v) => v);
        if (groups.length > 0) {
          query = query.in("BrandGroup", groups);
        }
      }

      // Fetch data
      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        previewContainer.innerHTML =
          '<p class="warning-message">No data found with current filters</p>';
        return;
      }

      // Generate preview table
      const tableHTML = `
            <table class="preview-table">
                <thead>
                    <tr>
                        ${this.selectedColumns
                          .map(
                            (col) => `<th>${this.formatColumnHeader(col)}</th>`
                          )
                          .join("")}
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (row) => `
                        <tr>
                            ${this.selectedColumns
                              .map(
                                (col) =>
                                  `<td>${this.formatCellValue(
                                    row[col],
                                    col
                                  )}</td>`
                              )
                              .join("")}
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;

      previewContainer.innerHTML = tableHTML;
    } catch (error) {
      console.error("Error updating preview:", error);
      previewContainer.innerHTML =
        '<p class="error-message">Error loading preview</p>';
    }
  }

  formatColumnHeader(column) {
    return column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  formatCellValue(value, columnId) {
    if (value === null || value === undefined) return "-";

    // Handle special column types
    switch (columnId) {
      case "Pack_Size":
        return this.formatPackSize(value);
      case "Repeat_Item":
        return this.formatRepeatItem(value);
      case "ReleaseDate":
      case "SoldoutDate":
      case "mfgDate":
      case "estDate":
      case "ArriveDate":
      case "DelayDate":
      case "Created":
      case "Updated":
        return value
          ? new Date(value).toLocaleString("en-AU", {
              timeZone: "Australia/Sydney",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
          : "-";
      default:
        return String(value);
    }
  }

  setupEventListeners(modal) {
    // Close button
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => modal.remove();
    }

    // Get column select elements
    const availableColumns = modal.querySelector("#availableColumns");
    const selectedColumns = modal.querySelector("#selectedColumns");

    if (!availableColumns || !selectedColumns) {
      console.error("Column select elements not found");
      return;
    }

    // Add columns button
    const addColumnBtn = modal.querySelector("#addColumn");
    if (addColumnBtn) {
      addColumnBtn.onclick = () => {
        if (availableColumns.selectedOptions.length > 0) {
          this.moveSelectedOptions(availableColumns, selectedColumns);
          this.checkColumnWarning();
          this.updatePreview();
        }
      };
    }

    // Remove columns button
    const removeColumnBtn = modal.querySelector("#removeColumn");
    if (removeColumnBtn) {
      removeColumnBtn.onclick = () => {
        if (selectedColumns.selectedOptions.length > 0) {
          this.moveSelectedOptions(selectedColumns, availableColumns);
          this.checkColumnWarning();
          this.updatePreview();
        }
      };
    }

    // Move up/down buttons
    const moveUpBtn = modal.querySelector("#moveUp");
    const moveDownBtn = modal.querySelector("#moveDown");

    if (moveUpBtn) {
      moveUpBtn.onclick = () => {
        if (selectedColumns.selectedOptions.length > 0) {
          this.moveOption(selectedColumns, "up");
          this.updatePreview();
        }
      };
    }

    if (moveDownBtn) {
      moveDownBtn.onclick = () => {
        if (selectedColumns.selectedOptions.length > 0) {
          this.moveOption(selectedColumns, "down");
          this.updatePreview();
        }
      };
    }

    // Sort and orientation changes
    const sortColumn = modal.querySelector("#sortColumn");
    const sortDirection = modal.querySelector("#sortDirection");
    const pdfOrientation = modal.querySelector("#pdfOrientation");

    if (sortColumn) {
      sortColumn.onchange = () => this.updatePreview();
    }
    if (sortDirection) {
      sortDirection.onchange = () => this.updatePreview();
    }
    if (pdfOrientation) {
      pdfOrientation.onchange = (e) => {
        this.orientation = e.target.value;
        this.checkColumnWarning();
      };
    }

    // Allow multiple selection with Shift and Ctrl keys
    [availableColumns, selectedColumns].forEach((select) => {
      if (select) {
        select.multiple = true;
        select.size = 10; // Show 10 items at once
      }
    });
  }

  filterColumns(searchTerm) {
    const options = document.querySelectorAll(".column-option");
    options.forEach((option) => {
      const label = option.querySelector("label").textContent.toLowerCase();
      option.style.display = label.includes(searchTerm.toLowerCase())
        ? ""
        : "none";
    });
  }

  selectAllColumns() {
    document
      .querySelectorAll('.column-option input[type="checkbox"]')
      .forEach((cb) => (cb.checked = true));
    this.updatePreview();
  }

  clearAllColumns() {
    document
      .querySelectorAll('.column-option input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
    this.updatePreview();
  }

  async generatePDF(selectedColumns, filters) {
    try {
      if (this.selectedColumns.length === 0) {
        alert("Please select at least one column to export");
        return;
      }

      // Get sort settings
      const sortColumn = document.getElementById("sortColumn").value;
      const sortDirection = document.getElementById("sortDirection").value;

      // Start with base query
      let query = supabaseClient
        .from("inventory")
        .select(this.selectedColumns.join(","))
        .order(sortColumn, { ascending: sortDirection === "asc" });

      // Apply filters
      if (filters.categories?.length > 0) {
        query = query.in("Category", filters.categories);
      }
      if (filters.statuses?.length > 0) {
        query = query.in("Status", filters.statuses);
      }
      if (filters.groups?.length > 0) {
        query = query.in("BrandGroup", filters.groups);
      }

      // Fetch filtered data
      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("No data found with current filters");
        return;
      }

      // Create PDF
      const doc = new jsPDF({
        orientation: this.orientation,
        unit: "mm",
        format: "a4",
      });

      // Set font size and margins
      const fontSize = 8;
      doc.setFontSize(fontSize);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margins = { top: 10, bottom: 10, left: 10, right: 10 };

      // Prepare table data
      const headers = this.selectedColumns.map((col) =>
        this.formatColumnHeader(col)
      );
      const tableData = data.map((row) =>
        this.selectedColumns.map((col) => this.formatCellValue(row[col], col))
      );

      // Add title and info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Inventory List", margins.left, margins.top);

      doc.setFontSize(10);
      doc.text(`Total Items: ${data.length}`, margins.left, margins.top + 6);
      doc.text(
        `Export Date: ${new Date().toLocaleString("en-AU", {
          timeZone: "Australia/Sydney",
        })}`,
        margins.left,
        margins.top + 12
      );

      // Add filter information if any filters are applied
      let filterInfo = [];
      if (filters.categories?.length)
        filterInfo.push(`Categories: ${filters.categories.join(", ")}`);
      if (filters.statuses?.length)
        filterInfo.push(`Statuses: ${filters.statuses.join(", ")}`);
      if (filters.groups?.length)
        filterInfo.push(`Groups: ${filters.groups.join(", ")}`);

      if (filterInfo.length > 0) {
        doc.setFontSize(8);
        doc.text("Applied Filters:", margins.left, margins.top + 18);
        filterInfo.forEach((info, index) => {
          doc.text(info, margins.left + 10, margins.top + 24 + index * 4);
        });
      }

      // Add table
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: margins.top + (filterInfo.length > 0 ? 30 : 20),
        margin: margins,
        styles: {
          fontSize: fontSize,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          minCellHeight: 6,
          cellWidth: "wrap",
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: Object.fromEntries(
          this.selectedColumns.map((col) => [
            col,
            {
              cellWidth: "auto",
              halign: [
                "Stock",
                "Qty",
                "UnitP",
                "Item_Aging",
              ].includes(col)
                ? "right"
                : "left",
            },
          ])
        ),
        didDrawPage: (data) => {
          const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
          const totalPages = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
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
      doc.save(`inventory-list-${timestamp}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }

  moveSelectedOptions(fromSelect, toSelect) {
    Array.from(fromSelect.selectedOptions).forEach((option) => {
      toSelect.appendChild(option);
    });
  }

  moveOption(select, direction) {
    const selectedOption = select.selectedOptions[0];
    if (!selectedOption) return;

    if (direction === "up" && selectedOption.previousElementSibling) {
      selectedOption.parentNode.insertBefore(
        selectedOption,
        selectedOption.previousElementSibling
      );
    } else if (direction === "down" && selectedOption.nextElementSibling) {
      selectedOption.parentNode.insertBefore(
        selectedOption.nextElementSibling,
        selectedOption
      );
    }
  }

  checkColumnWarning() {
    const selectedColumns = document.getElementById("selectedColumns");
    const warningElement = document.getElementById("columnWarning");
    const maxColumns = this.maxColumnsWarning[this.orientation];

    if (selectedColumns.options.length > maxColumns) {
      warningElement.style.display = "block";
    } else {
      warningElement.style.display = "none";
    }
  }

  generatePreviewTable(data) {
    return `
            <table class="preview-table">
                <thead>
                    <tr>
            ${this.selectedColumns
              .map(
                (col) => `
              <th>${this.formatColumnHeader(col)}</th>
                    `
              )
              .join("")}
                    </tr>
                </thead>
                <tbody>
          ${data
            .map(
              (row) => `
            <tr>
              ${this.selectedColumns
                .map(
                  (col) => `
                <td>${this.formatCellValue(row[col])}</td>
              `
                )
                .join("")}
                        </tr>
                    `
            )
            .join("")}
                </tbody>
            </table>
    `;
  }

  formatPackSize(packSize) {
    if (!packSize) return "-";
    try {
      const sizes =
        typeof packSize === "string" ? JSON.parse(packSize) : packSize;
      if (
        typeof sizes !== "object" ||
        !sizes ||
        Object.keys(sizes).length === 0
      )
        return "-";
      return Object.entries(sizes)
        .map(([size, qty]) => `${size}: ${qty}`)
        .join(", ");
    } catch (error) {
      console.error("Error formatting pack size:", error);
      return "-";
    }
  }

  formatRepeatItem(repeatItem) {
    if (!repeatItem) return "-";
    try {
      const repeat =
        typeof repeatItem === "string" ? JSON.parse(repeatItem) : repeatItem;
      if (
        typeof repeat !== "object" ||
        !repeat ||
        Object.keys(repeat).length === 0
      )
        return "-";
      return Object.entries(repeat)
        .map(([key, value]) => `Time ${parseInt(key) + 1}: ${value}`)
        .join(", ");
    } catch (error) {
      console.error("Error formatting repeat item:", error);
      return "-";
    }
  }

  async getUniqueValues(field) {
    try {
      // Fetch data from Supabase
      const { data, error } = await supabaseClient
        .from("inventory")
        .select(field)
        .not(field, "is", null);

      if (error) throw error;

      // Extract unique values
      const values = new Set(data.map((item) => item[field]));
      return Array.from(values).sort();
    } catch (error) {
      console.error(`Error fetching ${field} values:`, error);
      return [];
    }
  }

  applyFilters(item, filters) {
    const { categories, statuses, groups } = filters;

    // Check category filter
    if (categories?.length > 0 && !categories.includes(item.Category)) {
      return false;
    }

    // Check status filter
    if (statuses?.length > 0 && !statuses.includes(item.Status)) {
      return false;
    }

    // Check group filter
    if (groups?.length > 0 && !groups.includes(item.BrandGroup)) {
      return false;
    }

    return true;
  }

  createColumnSelectionHTML() {
    return `
        <div class="dropdown-section">
            <label>Available Columns:</label>
            <div class="column-select-wrapper">
                <select id="availableColumns" multiple>
                    ${this.generateColumnOptions()}
                </select>
                <div class="column-controls">
                    <button id="addColumn">Add →</button>
                    <button id="removeColumn">← Remove</button>
                </div>
            </div>
        </div>

        <div class="dropdown-section">
            <label>Selected Columns:</label>
            <select id="selectedColumns" multiple></select>
            <div class="column-order-controls">
                <button id="moveUp">↑ Move Up</button>
                <button id="moveDown">↓ Move Down</button>
            </div>
        </div>
    `;
  }

  createPreviewTableHTML() {
    return `<div id="previewTable"></div>`;
  }
}

// Initialize the export functionality
window.pdfExport = new PDFExport();
