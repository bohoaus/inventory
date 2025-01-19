class StaffInventoryExport {
  constructor() {
    // Initialize jsPDF
    this.jsPDF = window.jspdf.jsPDF;
  }

  async generatePDF(data, options) {
    try {
      console.log("Generating staff inventory PDF with options:", options);

      // Create new PDF document
      const doc = new this.jsPDF({
        orientation: options.orientation,
        unit: "mm",
        format: "a4",
      });

      // Set font
      doc.setFont("helvetica");

      // Add title
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Black text
      doc.text("Staff Inventory Report", 14, 15);

      // Add generation date
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

      // Add filters info if any are applied
      let yPos = 29;
      if (options.filters) {
        doc.setFontSize(9);
        if (options.filters.category) {
          doc.text(`Category: ${options.filters.category}`, 14, yPos);
          yPos += 7;
        }
        if (options.filters.status) {
          doc.text(`Status: ${options.filters.status}`, 14, yPos);
          yPos += 7;
        }
        if (options.filters.group !== "all") {
          doc.text(`Group: ${options.filters.group}`, 14, yPos);
          yPos += 7;
        }
      }

      // Format data for autoTable
      const tableColumns = options.columns.map((col) => ({
        header: this.formatColumnName(col),
        dataKey: col,
      }));

      // Create table with black and white theme
      doc.autoTable({
        startY: yPos,
        columns: tableColumns,
        body: data,
        theme: "plain",
        headStyles: {
          fillColor: false,
          textColor: 0,
          fontSize: 9,
          fontStyle: "bold",
          halign: "left",
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 0,
          cellPadding: 4,
          fillColor: false,
        },
        styles: {
          lineColor: [220, 220, 220], // Very light gray borders
          lineWidth: 0.1,
        },
        columnStyles: {
          // Right align number columns
          Stock: { halign: "right" },
          Qty: { halign: "right" },
          odmQtyDiff: { halign: "right" },
          // Format date columns
          ...this.getDateColumnStyles(options.columns),
        },
        didParseCell: (data) => {
          // Format cell data
          if (data.cell.raw === null || data.cell.raw === undefined) {
            data.cell.text = "-";
          } else if (this.isDateColumn(data.column.dataKey)) {
            data.cell.text = this.formatDate(data.cell.raw);
          } else if (this.isJsonColumn(data.column.dataKey)) {
            data.cell.text = "[View Details]";
          }
        },
        margin: { top: 15, right: 15, bottom: 20, left: 15 },
        didDrawPage: (data) => {
          // Add page number at the bottom
          doc.setFontSize(8);
          doc.setTextColor(0); // Black text for page numbers
          doc.text(
            `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        },
      });

      // Save the PDF
      const filename = `staff_inventory_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(filename);

      console.log("Staff inventory PDF generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating staff inventory PDF:", error);
      return false;
    }
  }

  formatColumnName(name) {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
      "soldout_date",
    ].includes(columnName);
  }

  isJsonColumn(columnName) {
    return ["pack_size", "repeat_item"].includes(columnName);
  }

  formatDate(dateString) {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  }

  getDateColumnStyles(columns) {
    const styles = {};
    columns.forEach((col) => {
      if (this.isDateColumn(col)) {
        styles[col] = { cellWidth: 25 };
      }
    });
    return styles;
  }
}

// Create global instance
window.staffInventoryExport = new StaffInventoryExport();
