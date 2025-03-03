class ViewOrder {
  constructor() {
    this.orderData = null;
    this.orderType = null;
    this.modal = null;
  }

  // Add this method to handle PDF export button click
  bindExportButton() {
    const exportBtn = document.querySelector(".export-pdf-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.exportToPDF();
      });
    }
  }

  async initialize(orderId) {
    try {
      // Get order data
      const { data: order, error } = await supabaseClient
        .from("orders")
        .select(
          `
          *,
          items:order_items(
            *,
            inventory:item_name(*)
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;

      this.orderData = order;
      this.orderType = order.order_type;

      // Show modal
      const modal = document.getElementById("viewOrderModal");
      if (!modal) return;

      this.modal = modal;
      modal.style.display = "block";

      // Generate and set modal content
      const modalContent = await this.generateModalHTML(order);
      const contentContainer = modal.querySelector(".modal-content");
      if (contentContainer) {
        contentContainer.innerHTML = modalContent;
      }

      // Setup event listeners
      this.setupEventListeners();
      // Bind export button after content is loaded
      this.bindExportButton();
    } catch (error) {
      console.error("Error initializing view order:", error);
      alert("Error loading order details. Please try again.");
    }
  }

  async fetchOrderData(orderId) {
    try {
      const { data: orderData, error: orderError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Create normalized data with proper type handling
      const normalizedData = {
        ...orderData,
        // Don't modify these values, keep them as is
        status: orderData.status,
        agent_state: orderData.agent_state,
        order_type: orderData.order_type,
        customer_name: orderData.customer_name,
        // Handle optional fields
        order_note: orderData.order_note || "-",
        total_items: orderData.total_items || 0,
        removed_items: orderData.removed_items || 0,
        invoice_no: orderData.invoice_no || "-",
        dispatched_state: orderData.dispatched_state || "-",
        dispatched_carrier: orderData.dispatched_carrier || "-",
        dispatched_box: orderData.dispatched_box || "-",
        tracking_no: orderData.tracking_no || "-",
        orderdate: orderData.orderdate,
        ouser: orderData.ouser,
        opo: orderData.opo,
        ocountry: orderData.ocountry,
      };

      // Fetch and normalize order items
      const { data: orderItems, error: itemsError } = await supabaseClient
        .from("order_items")
        .select(
          `
          *,
          inventory!inner(
            *
          )
        `
        )
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      return {
        ...normalizedData,
        items: orderItems,
      };
    } catch (error) {
      console.error("Error fetching order data:", error);
      return null;
    }
  }

  async renderModal(orderData) {
    const modalContent = document.querySelector(
      "#viewOrderModal .modal-content"
    );
    modalContent.innerHTML = await this.generateModalHTML(orderData);
    this.setupEventListeners();
  }

  async generateModalHTML(orderData) {
    return `
        <div class="modal-header">
            <h2>${
              orderData.order_type === "WHOLESALE"
                ? "Wholesale Order Details"
                : "ODM Order Details"
            }</h2>
            <span class="close">&times;</span>
        </div>
        <div class="order-details">
            ${this.generateOrderDetailsHTML(orderData)}
        </div>
        <div class="order-items">
            ${
              orderData.order_type === "WHOLESALE"
                ? await this.generateWholesaleTablesHTML(orderData)
                : await this.generateOdmTableHTML(orderData)
            }
        </div>
        <div class="modal-footer">
            <button class="export-pdf-btn">
                Export ${
                  orderData.order_type === "WHOLESALE" ? "Picking" : "Packing"
                } List
            </button>
        </div>
    `;
  }

  generateOrderDetailsHTML(orderData) {
    const formatStatus = (status, cancelledAt) => {
      if (status?.toUpperCase() === "CANCELLED" && cancelledAt) {
        return `CANCELLED (${this.formatValue("cancelled_at", cancelledAt)})`;
      }
      return status || "-";
    };

    return `
        <div class="details-grid" style="
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            padding: 5px;
        ">
            <!-- Row 1 -->
            <div class="detail-item">
                <label>Customer Name:</label>
                <span>${orderData.customer_name || "-"}</span>
            </div>
            <div class="detail-item">
                <label>Order Date:</label>
                <span>${this.formatValue(
                  "orderdate",
                  orderData.orderdate
                )}</span>
            </div>
            <div class="detail-item">
                <label>Dispatched State:</label>
                <span>${orderData.dispatched_state || "-"}</span>
            </div>
            <div class="detail-item">
                <label>Dispatched Box:</label>
                <span>${orderData.dispatched_box || "-"}</span>
            </div>

            <!-- Row 2 -->
            <div class="detail-item2">
                <label style="text-align:left; display: block; width: 100px">Order Type:</label>
                <span style="color:blue">${orderData.order_type || "-"}</span>
            </div>
            <div class="detail-item2">
                <label style="text-align:left; display: block; width: 100px">Invoice#:</label>
                <span style="color:blue">${orderData.invoice_no || "-"}</span>
            </div>
            <div class="detail-item2">
                <label style="text-align:left; display: block; width: 100px">Status:</label>
                <span style="color:blue">${formatStatus(
                  orderData.status,
                  orderData.cancelled_at
                )}</span>
            </div>
            <div class="detail-item2">
                <label style="text-align:left; display: block; width: 100px">Agent State:</label>
                <span style="color:blue">${orderData.agent_state || "-"}</span>
            </div>

            <!-- Row 3 -->
            <div class="detail-item">
                <label>Dispatched At:</label>
                <span>${this.formatValue(
                  "dispatched_at",
                  orderData.dispatched_at
                )}</span>
            </div>
            <div class="detail-item">
                <label>Updated At:</label>
                <span>${this.formatValue(
                  "updated_at",
                  orderData.updated_at
                )}</span>
            </div>
            <div class="detail-item">
                <label>Items Count:</label>
                <span>Total: ${orderData.total_items || "0"} / Removed: ${
                  orderData.removed_items || "0"
                }</span>
            </div>
            <div class="detail-item">
                <label>Dispatched Carrier:</label>
                <span>${orderData.dispatched_carrier || "-"}</span>
            </div>

            <!-- Row 4 -->
            ${
              orderData.dispatched_carrier &&
              !["PICK UP", "OTHERS"].includes(
                orderData.dispatched_carrier.toUpperCase()
              )
                ? `
                <div class="detail-item">
                    <label>Tracking#:</label>
                    <span style="color:blue">${orderData.tracking_no || "-"}</span>
                </div>
            <div class="detail-item">
                <label>Order Note:</label>
                <span style="color:blue">${orderData.order_note || "-"}</span>
            </div>
            <div class="detail-item">
                <label>PPO#:</label>
                <span style="color:blue">${orderData.opo || "-"}</span>
            </div>
            <div class="detail-item">
                <label>Country:</label>
                <span style="color:blue">${orderData.ocountry || "-"}</span>
            </div>
            `
                : ""
            }

            <!-- Order Note (Full Width) jim 25.02.22-->

        </div>
    `;
  }

  async generateWholesaleTablesHTML(orderData) {
    const activeItems = orderData.items.filter((item) =>
      ["ACTIVE", "SOLD OUT"].includes(item.order_item_status?.toUpperCase())
    );

    // Get item status history for the order
    const itemHistory = await this.getItemStatusHistory(orderData.id);

    return `
        <div class="active-items">
            <h3>Order Items</h3>
            <table>
                <thead>
                    <tr>
                        <th>Site</th>
                        <th>Qty</th>
                        <th>Item Code</th>
                        <th>Colour</th>
                        <th>Packs</th>
                        <th>PackSize</th>
                        <th>Unit/P</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      activeItems.length > 0
                        ? this.generateActiveItemsRows(activeItems, false)
                        : `<tr><td colspan="7" class="no-data">No active items</td></tr>`
                    }
                </tbody>
            </table>
        </div>
        <div class="removed-items">
            <h3>Order History</h3>
            <table>
                <thead>
                    <tr>
                        <th>Item Code</th>
                        <th>Colour</th>
                        <th>Packs</th>
                        <th>Qty</th>
                        <th>Sales</th>
                        <th>Status</th>
                        <th>AddedDate</th>
                        <th>RemovedDate</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      itemHistory.length > 0
                        ? itemHistory
                            .map(
                              (item) => `
                            <tr>
                                <td>${item.code}</td>
                                <td>${item.orderColour}</td>
                                <td>${item.orderPack}</td>
                                <td>${item.orderQty}</td>
                                <td>${item.orderSales}</td>
                                <td>${item.status || "-"}</td>
                                <td>${this.formatValue(
                                  "created_at",
                                  item.addedDate
                                )}</td>
                                <td>${
                                  item.removedDate
                                    ? this.formatValue(
                                        "updated_at",
                                        item.removedDate
                                      )
                                    : "-"
                                }</td>
                            </tr>
                        `
                            )
                            .join("")
                        : `<tr><td colspan="5" class="no-data">No history items</td></tr>`
                    }
                </tbody>
            </table>
        </div>
    `;
  }

  generateActiveItemsRows(items, forPDF = false) {
    return items
      .map((item) => {
        // Handle pack_size display
        let packSizeDisplay = "-";
        if (item.inventory?.pack_size) {
          if (typeof item.inventory.pack_size === "object") {
            packSizeDisplay = Object.entries(item.inventory.pack_size)
              .map(([size, amount]) => `${size}:${amount}`)
              .join(", ");
          } else {
            try {
              const packSize = JSON.parse(item.inventory.pack_size);
              packSizeDisplay = Object.entries(packSize)
                .map(([size, amount]) => `${size}:${amount}`)
                .join(", ");
            } catch (e) {
              console.error("Error parsing pack_size:", e);
              packSizeDisplay = item.inventory.pack_size;
            }
          }
        }

        return `
            <tr>
                ${
                  forPDF
                    ? `
                    <td></td>
                `
                    : ""
                }
                <td>${item.inventory?.item_location || "-"}</td>
                <td>${item.total_pieces}</td>
                <td>${item.item_name}</td>
                <td>${item.oicolour}</td>
                <td>${item.order_qty}</td>
                <td>${packSizeDisplay}</td>
                <td>${item.inventory?.pack_unit || "-"}</td>
                <td>${item.order_item_status}</td>
            </tr>
        `;
      })
      .join("");
  }

  generateRemovedItemsRows(items) {
    return items
      .map(
        (item) => `
                <tr>
                    <td>${item.item_name}</td>
                    <td>${this.formatValue("created_at", item.created_at)}</td>
                    <td>${this.formatValue("updated_at", item.updated_at)}</td>
                </tr>
            `
      )
      .join("");
  }

  async generateOdmTableHTML(orderData) {
    // Get the history data first
    const itemHistory = await this.getItemStatusHistory(orderData.id);

    // Get all items for each code, sorted by created_at
    const { data: allItems, error } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderData.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching items:", error);
      return "";
    }

    // Group items by code and get the latest status for each
    const latestStatusByCode = allItems.reduce((acc, item) => {
      if (
        !acc[item.item_name] ||
        new Date(item.created_at) > new Date(acc[item.item_name].created_at)
      ) {
        acc[item.item_name] = item;
      }
      return acc;
    }, {});

    // Filter active items to only show those whose latest status is not REMOVED
    const activeItems = orderData.items.filter(
      (item) =>
        latestStatusByCode[item.item_name]?.order_item_status?.toUpperCase() !==
        "REMOVED"
    );

    return `
        <div class="active-items">
            <h3>Order Items</h3>
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>PPO</th>
                        <th>Mfg Date</th>
                        <th>Arrive Date</th>
                        <th>Stock</th>
                        <th>Pack Size</th>
                        <th>CountQty</th>
                        <th>QtyDiff</th>
                    </tr>
                </thead>
                <tbody>
                    ${activeItems
                      .map((item) => {
                        let packSizeDisplay = "-";
                        if (item.inventory?.pack_size) {
                          try {
                            const packSize =
                              typeof item.inventory.pack_size === "object"
                                ? item.inventory.pack_size
                                : JSON.parse(item.inventory.pack_size);
                            packSizeDisplay = Object.entries(packSize)
                              .map(([size, amount]) => `${size}:${amount}`)
                              .join(", ");
                          } catch (e) {
                            packSizeDisplay = item.inventory.pack_size;
                          }
                        }

                        return `
                                <tr>
                                    <td>${item.item_name}</td>
                                    <td>${item.inventory?.odm_ppo || "-"}</td>
                                    <td>${this.formatValue(
                                      "maf_date",
                                      item.inventory?.mfg_date
                                    )}</td>
                                    <td>${this.formatValue(
                                      "arrive_date",
                                      item.inventory?.arrive_date
                                    )}</td>
                                    <td>${
                                      item.inventory?.receive_qty || "-"
                                    }</td>
                                    <td>${packSizeDisplay}</td>
                                    <td>${item.total_pieces || "-"}</td>
                                    <td>${
                                      item.inventory?.odm_qty_diff || "-"
                                    }</td>
                                </tr>
                            `;
                      })
                      .join("")}
                </tbody>
            </table>
        </div>
        <div class="removed-items">
            <h3>Order History</h3>
            <table>
                <thead>
                    <tr>
                        <th>Item Code</th>
                        <th>CountQty</th>
                        <th>AddedDate</th>
                        <th>RemovedDate</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      itemHistory.length > 0
                        ? itemHistory
                            .map(
                              (item) => `
                                <tr>
                                    <td>${item.code}</td>
                                    <td>${item.orderQty}</td>
                                    <td>${this.formatValue(
                                      "created_at",
                                      item.addedDate
                                    )}</td>
                                    <td>${this.formatValue(
                                      "updated_at",
                                      item.removedDate
                                    )}</td>
                                </tr>
                            `
                            )
                            .join("")
                        : `<tr><td colspan="4" class="no-data">No history items</td></tr>`
                    }
                </tbody>
            </table>
        </div>
    `;
  }

  async exportToPDF() {
    try {
      if (this.orderType === "ODM") {
        // Get all items for this order, sorted by created_at
        const { data: allItems, error } = await supabaseClient
          .from("order_items")
          .select("*")
          .eq("order_id", this.orderData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Group items by code and get the latest status for each
        const latestStatusByCode = allItems.reduce((acc, item) => {
          if (
            !acc[item.item_name] ||
            new Date(item.created_at) > new Date(acc[item.item_name].created_at)
          ) {
            acc[item.item_name] = item;
          }
          return acc;
        }, {});

        // Filter items to exclude those whose latest status is REMOVED
        const activeItems = this.orderData.items.filter(
          (item) =>
            latestStatusByCode[
              item.item_name
            ]?.order_item_status?.toUpperCase() !== "REMOVED"
        );

        // Create landscape PDF
        const doc = new jspdf.jsPDF({ orientation: "landscape" });
        const customerName = this.orderData.customer_name || "Customer";

        // Set title with black color
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0); // Black color
        doc.text(`Packing List for ${customerName}`, 20, 20);

        // Add order info in black
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const orderInfo = [
          `Created At: ${this.formatValue(
            "created_at",
            this.orderData.created_at
          )}`,
          `Dispatched Box: ${this.orderData.dispatched_box || "-"}`,
          `Dispatched At: ${this.formatValue(
            "dispatched_at",
            this.orderData.dispatched_at
          )}`,
          `Order Note: ${this.orderData.order_note || "-"}`,
        ];

        let yPos = 35;
        orderInfo.forEach((info) => {
          doc.text(info, 20, yPos);
          yPos += 7;
        });

        // Prepare table data
        const headers = [
          [
            "Code",
            "PPO",
            "Maf Date",
            "Arrive Date",
            "Received Qty",
            "Pack Size",
            "Counted Qty",
            "Qty Diff",
          ],
        ];

        const data = activeItems.map((item) => {
          let packSizeDisplay = "-";
          if (item.inventory?.pack_size) {
            try {
              const packSize =
                typeof item.inventory.pack_size === "object"
                  ? item.inventory.pack_size
                  : JSON.parse(item.inventory.pack_size);
              packSizeDisplay = Object.entries(packSize)
                .map(([size, amount]) => `${size}:${amount}`)
                .join(", ");
            } catch (e) {
              packSizeDisplay = item.inventory.pack_size;
            }
          }

          return [
            item.item_name,
            item.inventory?.odm_ppo || "-",
            this.formatValue("maf_date", item.inventory?.mfg_date),
            this.formatValue("arrive_date", item.inventory?.arrive_date),
            item.inventory?.receive_qty || "-",
            packSizeDisplay,
            item.total_pieces || "-",
            item.inventory?.odm_qty_diff || "-",
          ];
        });

        // Generate table with black and white theme
        doc.autoTable({
          head: headers,
          body: data,
          startY: yPos + 5,
          styles: {
            fontSize: 12,
            textColor: [0, 0, 0], // Black text
            fillColor: [255, 255, 255], // White background
            lineColor: [0, 0, 0], // Black borders
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [240, 240, 240], // Light gray background for header
            textColor: [0, 0, 0], // Black text for header
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 30 },
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248], // Very light gray for alternate rows
          },
          theme: "plain", // Use plain theme for simpler styling
        });

        // Save the PDF
        doc.save(`${customerName}_${new Date().toISOString()}.pdf`);
      } else {
        // Wholesale order export
        const { data: allItems, error } = await supabaseClient
          .from("order_items")
          .select(
            `
            *,
            inventory:item_name (
              item_location,
              pack_unit,
              item_name,
              scolour,
              sprice,
              pack_size
            )
          `
          )
          .eq("order_id", this.orderData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Filter active items
        const activeItems = allItems.filter((item) =>
          ["ACTIVE", "SOLD OUT"].includes(item.order_item_status?.toUpperCase())
        );

        // Create PDF
        const doc = new jspdf.jsPDF();
        const customerName = this.orderData.customer_name || "Customer";

        // Set title
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text(`Picking List for ${customerName}`, 20, 20);

        // Add order info in two columns
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        // Left column
        let yPos = 35;
        doc.text(
          `Created At: ${this.formatValue(
            "created_at",
            this.orderData.created_at
          )}`,
          20,
          yPos
        );
        doc.text(
          `Order Note: ${this.orderData.order_note || "-"}`,
          20,
          yPos + 7
        );

        // Right column
        doc.text("Picking Staff: _________________", 120, yPos);
        doc.text("Carrier: _________________", 120, yPos + 7);
        doc.text("Box: _________________", 120, yPos + 14);

        // Prepare table data
        const headers = [
          ["Pick", "Location", "Pcs", "Code", "Qty", "Size", "Status"],
        ];

        const data = activeItems.map((item) => {
          // Format pack size
          let packSizeDisplay = "-";
          if (item.inventory?.pack_size) {
            try {
              const packSize =
                typeof item.inventory.pack_size === "object"
                  ? item.inventory.pack_size
                  : JSON.parse(item.inventory.pack_size);
              packSizeDisplay = Object.entries(packSize)
                .map(([size, amount]) => `${size}:${amount}`)
                .join(", ");
            } catch (e) {
              packSizeDisplay = item.inventory.pack_size;
            }
          }

          // Add X for sold out items in Pick column
          const pickMark =
            item.order_item_status?.toUpperCase() === "SOLD OUT" ? "X" : "";

          return [
            pickMark, // Pick
            item.inventory?.item_location || "-", // Location
            item.total_pieces || "-", // Total Pieces
            item.item_name || "-", // Item Code
            item.order_qty || "-", // Order Qty
            packSizeDisplay, // Pack Size
            item.order_item_status || "-", // Status
          ];
        });

        // Generate table
        doc.autoTable({
          head: headers,
          body: data,
          startY: yPos + 25,
          styles: {
            fontSize: 12,
            cellPadding: 2,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: false,
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 15 }, // Pick
            1: { cellWidth: 25 }, // Location
            2: { cellWidth: 13 }, // Total Pieces
            3: { cellWidth: 50 }, // Item Code
            4: { cellWidth: 13 }, // Order Qty
            5: { cellWidth: 40 }, // Pack Size
            6: { cellWidth: 25 }, // Status
          },
          alternateRowStyles: {
            fillColor: false,
          },
          theme: "grid",
        });

        // Add footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(10);
        doc.text("Checked by: _________________", 20, pageHeight - 20);
        doc.text("Date: _________________", 120, pageHeight - 20);

        // Save the PDF
        doc.save(
          `${customerName}_picking_list_${new Date().toISOString()}.pdf`
        );
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }

  setupEventListeners() {
    const closeBtn = document.querySelector("#viewOrderModal .close");
    closeBtn.onclick = () => {
      document.getElementById("viewOrderModal").style.display = "none";
    };

    window.onclick = (event) => {
      const modal = document.getElementById("viewOrderModal");
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };
  }

  formatLabel(key) {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  formatValue(key, value) {
    // Special cases first (status, agent_state, order_type)
    if (["status", "agent_state", "order_type"].includes(key)) {
      if (value) {
        return value.toString().toUpperCase();
      }
      return "-";
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return "-";
    }

    // Handle empty strings
    if (value === "") {
      return "-";
    }

    // Handle dates
    if (key.includes("date") || key.includes("at")) {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return "-";

        return date.toLocaleString("en-AU", {
          timeZone: "Australia/Sydney",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (error) {
        console.error(`Error formatting date for ${key}:`, error);
        return "-";
      }
    }

    // Handle numeric values
    if (["total_items", "removed_items"].includes(key)) {
      return value.toString();
    }

    // Return string value for everything else
    return String(value);
  }

  async showOrderDetails(orderId) {
    try {
      // Fetch order details with items
      const { data: order, error } = await supabaseClient
        .from("orders")
        .select(
          `
                *,
                order_items (
                    id,
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

      if (error) throw error;

      // Get item status history
      const itemStatusHistory = await this.getItemStatusHistory(orderId);

      // Generate HTML content
      const modalContent = document.querySelector(
        "#viewOrderModal .modal-content"
      );

      // Combine existing order details with history table
      const combinedHTML = `
            ${this.generateModalHTML(order)}
            <div class="status-history">
                <h3>Item Status History</h3>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Colour</th>
                            <th>Packs</th>
                            <th>AddedDate</th>
                            <th>RemovedDate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemStatusHistory
                          .map(
                            (item) => `
                            <tr>
                                <td>${item.code}</td>
                                <td>${item.orderColopur}</td>
                                <td>${item.orderQty}</td>
                                <td>${this.formatValue(
                                  "created_at",
                                  item.addedDate
                                )}</td>
                                <td>${this.formatValue(
                                  "updated_at",
                                  item.removedDate
                                )}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

      modalContent.innerHTML = combinedHTML;

      // Show the modal
      const modal = document.getElementById("viewOrderModal");
      modal.style.display = "block";

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("Error in showOrderDetails:", error);
      alert("Error loading order details");
    }
  }

  async getItemStatusHistory(orderId) {
    try {
      // First get the order type
      const { data: orderData, error: orderError } = await supabaseClient
        .from("orders")
        .select("order_type")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Get all order items
      const { data: items, error } = await supabaseClient
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (orderData.order_type.toUpperCase() === "ODM") {
        // For ODM orders - show all history entries
        return items.map((item) => ({
          code: item.item_name,
          orderColour: item.oicolour,
          orderPack: item.order_qty,
          orderQty: item.total_pieces || "-",
          addedDate:
            item.order_item_status !== "REMOVED" ? item.created_at : null,
          removedDate:
            item.order_item_status === "REMOVED" ? item.created_at : null,
        }));
      } else {
        // For Wholesale orders - show all items with their added dates
        const itemHistory = {};

        items.forEach((item) => {
          const status = (item.order_item_status || "").toUpperCase();
          const itemKey = item.item_name;

          if (!itemHistory[itemKey]) {
            // Initialize new item entry
            itemHistory[itemKey] = {
              code: item.item_name,
              orderColour: item.oicolour,
              orderSales: item.oisales || null,              
              orderPack: item.order_qty || "-",
              orderQty: item.total_pieces || "-",
              addedDate: item.created_at, // Always store created_at as added date
              removedDate: status === "REMOVED" ? item.updated_at : null,
              status: status,
            };
          } else {
            // Update existing item entry
            if (status === "REMOVED") {
              itemHistory[itemKey].removedDate = item.updated_at;
            }
            // Keep the earliest added date
            if (
              new Date(item.created_at) <
              new Date(itemHistory[itemKey].addedDate)
            ) {
              itemHistory[itemKey].addedDate = item.created_at;
            }
          }
        });

        // Convert to array and sort by added date
        return Object.values(itemHistory)
          .sort((a, b) => new Date(a.addedDate) - new Date(b.addedDate))
          .map((item) => ({
            code: item.code,
            orderColour: item.orderColour,
            orderSales: item.orderSales,
            orderPack: item.orderPack,
            orderQty: item.orderQty,
            addedDate: item.addedDate,
            removedDate: item.removedDate,
            status: item.status,
          }));
      }
    } catch (error) {
      console.error("Error in getItemStatusHistory:", error);
      return [];
    }
  }
}

// Initialize viewOrder instance and make it globally available
let viewOrder;
document.addEventListener("DOMContentLoaded", () => {
  viewOrder = new ViewOrder();
  window.viewOrder = viewOrder;
});
