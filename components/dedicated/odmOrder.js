class OdmOrder {
  constructor() {
    //this.orderdate = new Date();
    this.orderType = "odm";
    this.tempOrderList = [];
    this.searchInput = null;
    this.suggestionsList = null;
    this.orderListTable = null;
  }

  initialize() {
    const form = document.getElementById("odmOrderForm");
    if (!form) {
      console.error("ODM order form not found");
      return;
    }

    form.innerHTML = this.generateFormHTML();

    // Initialize elements after HTML is added
    this.searchInput = document.getElementById("odmItemSearch");
    this.suggestionsList = document.getElementById("odmSuggestions");
    this.orderListTable = document.getElementById("odmOrderListTable");

    // Make odmOrder globally available
    window.odmOrder = this;

    if (!this.searchInput || !this.orderListTable) {
      console.error("Required elements not found");
      return;
    }

    this.setupEventListeners();
  }

  generateFormHTML() {
    return `
            <div class="odm-form">
                <div class="customer-info">
                    <div class="form-group required">
                        <label for="customer_name">Customer Name</label>
                        <input type="text" id="customer_name">
                        <div id="customerWarning" class="warning-message"></div>
                    </div>
                    <div class="form-group required">
                        <label for="orderdate">Request Date</label>
                        <input type="date" id="orderdate">
                    </div>
                    <div class="form-group">
                        <label for="dispatched_at">Dispatched At</label>
                        <input type="datetime-local" id="dispatched_at">
                    </div>
                    <div class="form-group required">
                        <label for="agent_state">Agent State</label>
                        <select id="agent_state">
                            <option value="">Select State</option>
                            <option value="AUS-ACT">AUS-ACT</option>
                            <option value="AUS-NSW">AUS-NSW</option>
                            <option value="AUS-NT">AUS-NT</option>
                            <option value="AUS-QLD" selected>AUS-QLD</option>
                            <option value="AUS-SA">AUS-SA</option>
                            <option value="AUS-TAS">AUS-TAS</option>
                            <option value="AUS-VIC">AUS-VIC</option>
                            <option value="AUS-WA">AUS-WA</option>
                            <option value="Others">Others</option>
                            <option value="NZ">NZ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="opo">PPO#</label>
                        <input type="text" id="opo" placeholder="PO#" value="PO#">
                    </div>
                    <div class="form-group">
                        <label for="dispatched_box">Dispatched Box</label>
                        <input type="text" id="dispatched_box" value="1">
                    </div>
                </div>

                <div class="form-group">
                    <label for="order_note">Order Note</label>
                    <input type="text" id="order_note" placeholder="Add note for this order" value="OK">
                </div>

                <div class="item-search">
                    <div class="form-group">
                        <label for="odmItemSearch">Search ODM Item</label>
                        <input type="text" 
                               id="odmItemSearch"
                               placeholder="Enter item code">
                        <div id="odmSuggestions" class="suggestions-dropdown"></div>
                    </div>
                </div>

                <div class="selected-item-details" id="selectedOdmItemDetails" style="display: none;">
                    <h3>Selected Item Details</h3>
                    <div class="item-info-grid">
                        <div class="info-card">
                            <label>Item Code</label>
                            <span id="odmItemCode" class="info-value"></span>
                        </div>
                        <div class="info-card">
                            <label>Colour</label>
                            <span id="odmItemColour" class="info-value"></span>
                        </div>
                        <div class="info-card">
                            <label>Stock</label>
                            <span id="odmReceiveQty" class="info-value"></span>
                        </div>
                    </div>
                    <button type="button" id="addPackSize" class="add-pack-size-btn">Add Pack Size</button>
                </div>

                <div class="order-tables">
                    <div class="order-list">
                        <h3>Order List</h3>
                        <table id="odmOrderListTable">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Colour</th>
                                    <th>PPO#</th>
                                    <th>Stock</th>
                                    <th>Pack Size</th>
                                    <th>CountQty</th>
                                    <th>QtyDiff</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                        <button type="button" id="removeAllItems">Remove All</button>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" id="submitOrder" disabled>Submit Order</button>
                </div>
            </div>

            <!-- Pack Size Modal -->
            <div id="packSizeModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Add Pack Size</h2>
                    <div id="packSizeForm">
                        <div id="packSizeInputs"></div>
                        <button type="button" id="addPackSizeRow">Add Size</button>
                        <button type="button" id="confirmPackSize">OK</button>
                    </div>
                </div>
            </div>
        `;
  }

  setupEventListeners() {
    // Customer name validation with uppercase
    const customerNameInput = document.getElementById("customer_name");
    customerNameInput?.addEventListener("input", (e) => {
      // Convert to uppercase
      let value = e.target.value.toUpperCase();
      // Remove spaces from start
      value = value.replace(/^\s+/, "");
      // If there's a word followed by multiple spaces, keep only one space
      value = value.replace(/([A-Z]+)\s+/g, "$1 ");
      e.target.value = value;

      if (value) {
        this.checkExistingOrders(value.trim());
      } else {
        document.getElementById("customerWarning").style.display = "none";
      }

      this.updateSubmitButtonState();
    });

    // Make all text inputs uppercase except search
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach((input) => {
      if (input.id !== "odmItemSearch") {
        // Exclude search input
        input.addEventListener("input", (e) => {
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          e.target.value = e.target.value.toUpperCase();
          // Restore cursor position
          e.target.setSelectionRange(start, end);
        });
      }
    });

    // Search functionality with debouncing
    let searchTimeout;
    this.searchInput?.addEventListener("input", (e) => {
      const searchTerm = e.target.value.trim().toUpperCase();

      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Clear suggestions if search term is too short
      if (searchTerm.length < 2) {
        this.suggestionsList.innerHTML = "";
        return;
      }

      // Set new timeout
      searchTimeout = setTimeout(() => {
        this.searchOdmItems(searchTerm);
      }, 300); // 300ms debounce delay
    });

    // Add paste event handler for customer name
    customerNameInput.addEventListener("paste", (e) => {
      // Wait for the paste to complete
      setTimeout(() => {
        let value = e.target.value.toUpperCase();

        // Remove spaces from start
        value = value.replace(/^\s+/, "");

        // If there's a word followed by multiple spaces, keep only one space
        value = value.replace(/([A-Z]+)\s+/g, "$1 ");

        e.target.value = value;

        if (value) {
          this.checkExistingOrders(value.trim());
        } else {
          document.getElementById("customerWarning").style.display = "none";
        }

        this.updateSubmitButtonState();
      }, 0);
    });

    // Add pack size button
    document.getElementById("addPackSize").addEventListener("click", () => {
      this.showPackSizeModal();
    });

    // Remove all items with confirmation
    document.getElementById("removeAllItems").addEventListener("click", () => {
      if (this.tempOrderList.length === 0) {
        alert("No items to remove.");
        return;
      }

      if (
        confirm(
          "Are you sure you want to remove all items from the order list?"
        )
      ) {
        this.tempOrderList = [];
        this.updateOrderListTable();
        this.updateSubmitButtonState();
      }
    });

    // Submit order
    document.getElementById("submitOrder").addEventListener("click", () => {
      this.submitOrder();
    });
  }

  async searchOdmItems(searchTerm) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        this.suggestionsList.innerHTML = "";
        return;
      }

      const { data, error } = await supabaseClient
        .from("inventory")
        .select(
          `
          code_colour,
          scolour,
          receive_qty,
          item_status,
          odm_customer,
          item_category,
          odm_ppo
        `
        )
        .eq("item_group", "ODM")
        .or(`code_colour.ilike.%${searchTerm}%,item_name.ilike.%${searchTerm}%`)
        .order("code_colour", { ascending: true })
        .limit(10);

      if (error) throw error;

      this.displaySuggestions(data);
    } catch (error) {
      console.error("Error searching items:", error);
      this.suggestionsList.innerHTML = `
        <div class="suggestion-item error">Error searching items</div>
      `;
    }
  }

  async createOrder(formData) {
    try {
      const orderData = {
        orderdate: formData.get("orderdate"),
        customer_name: formData.get("customer_name"),
        opo: formData.get("opo"),
        order_type: this.orderType,
        status: "processing",
        agent_state: formData.get("agent_state"),
        total_items: 0,
      };

      const { data, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (error) {
        throw new Error("Error creating ODM order: " + error.message);
      }

      // Update inventory odm_qty_diff for each item
      for (const item of this.tempOrderList) {
        // Calculate total amount from pack sizes
        const packSizeTotal = Object.values(item.pack_size).reduce(
          (sum, amount) => sum + amount,
          0
        );
        const qtyDiff = packSizeTotal - item.receive_qty;

        // Update inventory with new odm_qty_diff
        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            odm_qty_diff: qtyDiff,
            item_status: "PROCESSING",
          })
          .eq("code_colour", item.code_colour);

        if (updateError) {
          throw new Error("Error updating inventory: " + updateError.message);
        }

        // Add order item
        const { error: orderItemError } = await supabase
          .from("order_items")
          .insert({
            order_id: data.id,
            item_name: item.code_colour,
            oicolour: item.scolour,
            total_pieces: packSizeTotal, // Use pack size total as total_pieces
            order_item_status: "PROCESSING",
            created_at: new Date().toISOString(),
          });

        if (orderItemError) {
          throw new Error("Error adding order item: " + orderItemError.message);
        }
      }

      // Close modal and reset form
      const modal = document.getElementById("odmOrderModal");
      modal.style.display = "none";
      this.clearForm();

      alert("Order submitted successfully!");

      // Refresh order list if needed
      if (typeof adminOrder !== "undefined") {
        adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Error submitting order. Please try again.");
    }
  }

  async addOrderItem(orderId, itemData) {
    try {
      // Get item details
      const { data: item, error: itemError } = await supabase
        .from("inventory")
        .select("item_group")
        .eq("code_colour", itemData.item_name)
        .single();

      if (itemError) {
        throw new Error("Error fetching item details: " + itemError.message);
      }

      // Verify item is ODM
      if (item.item_group !== "odm") {
        throw new Error("Selected item is not available for ODM orders");
      }

      // Calculate total from pack sizes
      const packSizeTotal = Object.values(itemData.pack_size).reduce(
        (sum, amount) => sum + amount,
        0
      );

      // Add order item
      const { error: orderItemError } = await supabase
        .from("order_items")
        .insert([
          {
            order_id: orderId,
            item_name: itemData.item_name,
            oicolour: itemData.oicolour,
            total_pieces: packSizeTotal,
            order_item_status: "PROCESSING",
          },
        ]);

      if (orderItemError) {
        throw new Error("Error adding order item: " + orderItemError.message);
      }

      // Calculate and update odm_qty_diff using pack size total
      const qtyDiff = packSizeTotal - itemData.receive_qty;

      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          odm_qty_diff: qtyDiff,
          item_status: "PROCESSING",
        })
        .eq("code_colour", itemData.item_name);

      if (updateError) {
        throw new Error("Error updating item status: " + updateError.message);
      }
    } catch (error) {
      throw error;
    }
  }

  async updateOrderStatus(orderId, status) {
    const updates = {
      status: status,
    };

    if (status === "completed") {
      updates.dispatched_at = new Date().toISOString();
    } else if (status === "cancelled") {
      updates.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (error) {
      throw new Error("Error updating order status: " + error.message);
    }

    // Update related items status
    if (status === "cancelled") {
      await this.updateOrderItemsStatus(orderId, "cancelled");
    }
  }

  async updateItemStatus(itemCode, status) {
    const { error } = await supabase
      .from("inventory")
      .update({ item_status: status })
      .eq("code_colour", itemCode);

    if (error) {
      throw new Error("Error updating item status: " + error.message);
    }
  }

  async updateOrderItemsStatus(orderId, status) {
    // Get all items in the order
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("item_name")
      .eq("order_id", orderId);

    if (itemsError) {
      throw new Error("Error fetching order items: " + itemsError.message);
    }

    // Update status for each item
    for (const item of items) {
      await this.updateItemStatus(item.item_name, status);
    }
  }

  generatePackingList(order) {
    return `
            ODM ORDER PACKING LIST
            ---------------------
            Order ID: ${order.id}
            Customer: ${order.customer_name}
            Date: ${new Date(order.created_at).toLocaleDateString()}

            Items:
            ${order.order_items
              .map(
                (item) => `
                - ${item.inventory.item_name}
                  Quantity: ${item.order_qty}
                  Status: ${item.order_item_status}
                  Manufacturing Date: ${
                    item.inventory.mfg_date
                      ? new Date(item.inventory.mfg_date).toLocaleDateString()
                      : "N/A"
                  }
            `
              )
              .join("\n")}

            Total Items: ${order.total_items}
            Status: ${order.status}
            Notes: ${order.order_note || "No notes"}
        `;
  }

  displaySuggestions(items) {
    if (!this.suggestionsList) return;

    if (!items || items.length === 0) {
      this.suggestionsList.innerHTML = `
        <div class="suggestion-item no-results">No ODM items found</div>
      `;
      return;
    }

    this.suggestionsList.innerHTML = items
      .map(
        (item) => `
          <div class="suggestion-item" onclick="odmOrder.selectItem('${
            item.code_colour
          }')">
            <div class="suggestion-main">
              <span class="item-code">${item.code_colour}</span>
              ${
                item.odm_ppo
                  ? `<span class="item-ppo">PPO: ${item.odm_ppo}</span>`
                  : ""
              }
            </div>
            <div class="suggestion-details">
              <span class="item-qty">Received: ${item.receive_qty || 0}</span>
              <span class="item-status">${item.item_status || "N/A"}</span>
            </div>
          </div>
        `
      )
      .join("");

    // Show suggestions dropdown
    this.suggestionsList.style.display = "block";
  }

  async selectItem(itemCode) {
    try {
      // Clear suggestions
      this.suggestionsList.innerHTML = "";
      this.searchInput.value = "";

      // Fetch item details with pack_size and odm_qty_diff
      const { data: item, error } = await supabaseClient
        .from("inventory")
        .select(
          `
          code_colour,
          scolour,
          receive_qty,
          item_status,
          odm_customer,
          item_category,
          odm_ppo,
          pack_size,
          odm_qty_diff
        `
        )
        .eq("code_colour", itemCode)
        .single();

      if (error) throw error;

      // Check if item already exists in order list
      if (
        this.tempOrderList.some(
          (orderItem) => orderItem.code_colour === itemCode
        )
      ) {
        alert("This item is already in the order list");
        return;
      }

      // Store selected item with uppercase values
      this.selectedItem = {
        ...item,
        code_colour: item.code_colour.toUpperCase(),
        scolour: item.scolour,
        item_name: (item.item_name || "").toUpperCase(),
        odm_customer: (item.odm_customer || "").toUpperCase(),
        odm_ppo: item.odm_ppo,
        pack_size: item.pack_size || {}, // Store existing pack size
        odm_qty_diff: item.odm_qty_diff || 0, // Store existing qty diff
      };

      // Calculate total from existing pack sizes
      const existingTotal = item.pack_size
        ? Object.values(item.pack_size).reduce(
            (sum, amount) => sum + parseInt(amount),
            0
          )
        : 0;

      // Display item details
      const itemDetails = document.getElementById("selectedOdmItemDetails");
      itemDetails.innerHTML = `
        <h3>Selected Item Details</h3>
        <div class="item-info-grid">
          <div class="info-card">
            <label>Item Code</label>
            <span id="odmItemCode" class="info-value">${
              this.selectedItem.code_colour
            }</span>
          </div>
          <div class="info-card">
            <label>Colour</label>
            <span id="odmItemColour" class="info-value">${
              this.selectedItem.scolour
            }</span>
          </div>
          <div class="info-card">
            <label>Stock</label>
            <span id="odmReceiveQty" class="info-value">${
              this.selectedItem.receive_qty || 0
            }</span>
          </div>
          <div class="info-card">
            <label>Existing Pack Size</label>
            <span class="info-value">${
              Object.entries(this.selectedItem.pack_size || {})
                .map(([size, amount]) => `${size}:${amount}`)
                .join(", ") || "None"
            }</span>
          </div>
          <div class="info-card">
            <label>CountQty</label>
            <span class="info-value">${existingTotal}</span>
          </div>
          <div class="info-card">
            <label>QtyDiff</label>
            <span class="info-value ${
              this.selectedItem.odm_qty_diff < 0 ? "negative" : "positive"
            }">
              ${this.selectedItem.odm_qty_diff || 0}
            </span>
          </div>
        </div>
        <button type="button" id="addPackSize" class="add-pack-size-btn">Add Pack Size</button>
      `;

      itemDetails.style.display = "block";

      // Reattach event listener to the new Add Pack Size button
      document.getElementById("addPackSize")?.addEventListener("click", () => {
        this.showPackSizeModal();
      });
    } catch (error) {
      console.error("Error selecting item:", error);
      alert("Error selecting item. Please try again.");
    }
  }

  showPackSizeModal() {
    const modal = document.getElementById("packSizeModal");
    const packSizeInputs = document.getElementById("packSizeInputs");
    const addRowBtn = document.getElementById("addPackSizeRow");
    const confirmBtn = document.getElementById("confirmPackSize");
    const closeBtn = modal.querySelector(".close");

    if (!modal || !packSizeInputs || !addRowBtn || !confirmBtn || !closeBtn) {
      console.error("Required modal elements not found");
      return;
    }

    // Clear previous inputs
    packSizeInputs.innerHTML = "";

    // Add existing pack sizes if any
    if (
      this.selectedItem.pack_size &&
      Object.keys(this.selectedItem.pack_size).length > 0
    ) {
      Object.entries(this.selectedItem.pack_size).forEach(([size, amount]) => {
        this.addPackSizeRow(packSizeInputs, size, amount);
      });
    } else {
      // Add one empty row if no existing pack sizes
      this.addPackSizeRow(packSizeInputs);
    }

    // Show modal
    modal.style.display = "block";

    // Add row button handler
    addRowBtn.onclick = () => this.addPackSizeRow(packSizeInputs);

    // Confirm button handler
    confirmBtn.onclick = () => this.confirmPackSizes();

    // Close button handler
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };

    // Close on outside click
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };
  }

  addPackSizeRow(container, existingSize = "", existingAmount = "") {
    const row = document.createElement("div");
    row.className = "pack-size-row";
    row.innerHTML = `
      <input type="text" class="size-input" value="${existingSize}" placeholder="Size">
      <input type="number" class="amount-input" value="${existingAmount}" placeholder="Amount" min="1">
      <button type="button" class="remove-row-btn">Remove</button>
    `;

    container.appendChild(row);

    // Add uppercase conversion for size input
    const sizeInput = row.querySelector(".size-input");
    sizeInput.addEventListener("input", (e) => {
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(start, end);
    });

    // Add validation for amount input
    const amountInput = row.querySelector(".amount-input");
    amountInput.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      if (value < 1) e.target.value = "1";
    });

    // Add remove button handler
    row.querySelector(".remove-row-btn").onclick = () => {
      if (container.children.length > 1) {
        container.removeChild(row);
      }
    };
  }

  confirmPackSizes() {
    const packSizeInputs = document.getElementById("packSizeInputs");
    const rows = packSizeInputs.querySelectorAll(".pack-size-row");
    const packSizes = {}; // Start fresh with new pack sizes
    let newTotalAmount = 0;

    // Validate and collect new pack sizes
    for (const row of rows) {
      const sizeInput = row.querySelector(".size-input").value.trim();
      const amountInput = parseInt(row.querySelector(".amount-input").value);

      if (!sizeInput || isNaN(amountInput) || amountInput <= 0) {
        alert("Please fill in all pack sizes with valid amounts");
        return;
      }

      packSizes[sizeInput] = amountInput;
      newTotalAmount += amountInput;
    }

    // Calculate existing total from inventory pack sizes
    const existingTotal = this.selectedItem.pack_size
      ? Object.values(this.selectedItem.pack_size).reduce(
          (sum, amount) => sum + parseInt(amount),
          0
        )
      : 0;

    // Calculate combined total
    const totalAmount = existingTotal + newTotalAmount;

    // Calculate quantity difference: (existing_total + new_total) - received_qty
    const receivedQty = this.selectedItem.receive_qty || 0;
    const qtyDifference = totalAmount - receivedQty; // Changed the order of subtraction

    // Add to temp order list
    const orderItem = {
      code_colour: this.selectedItem.code_colour,
      scolour: this.selectedItem.scolour,
      receive_qty: receivedQty,
      existing_pack_size: this.selectedItem.pack_size || {}, // Store existing pack size
      new_pack_size: packSizes, // Store new pack sizes separately
      existing_total: existingTotal,
      new_total: newTotalAmount,
      total_amount: totalAmount, // Combined total
      qty_difference: qtyDifference, // Now correctly calculated
      odm_ppo: this.selectedItem.odm_ppo,
    };

    this.tempOrderList.push(orderItem);

    // Update table and close modal
    this.updateOrderListTable();
    document.getElementById("packSizeModal").style.display = "none";
    document.getElementById("selectedOdmItemDetails").style.display = "none";

    // Update submit button state
    this.updateSubmitButtonState();
  }

  updateOrderListTable() {
    const tbody = this.orderListTable.querySelector("tbody");
    tbody.innerHTML = this.tempOrderList
      .map((item) => {
        // Format existing pack sizes
        const existingPackSizeDisplay = Object.entries(item.existing_pack_size)
          .map(([size, amount]) => `${size}:${amount}`)
          .join(", ");

        // Format new pack sizes
        const newPackSizeDisplay = Object.entries(item.new_pack_size)
          .map(([size, amount]) => `${size}:${amount}`)
          .join(", ");

        // Combine pack size displays
        const packSizeDisplay = [
          existingPackSizeDisplay && `Existing: (${existingPackSizeDisplay})`,
          newPackSizeDisplay && `New: (${newPackSizeDisplay})`,
        ]
          .filter(Boolean)
          .join(", ");

        // Use combined total for qty difference
        const qtyDiffClass =
          item.qty_difference < 0
            ? "negative-diff"
            : item.qty_difference > 0
            ? "positive-diff"
            : "";

        return `
          <tr>
            <td>${item.code_colour}</td>
            <td>${item.scolour}</td>
            <td>${item.odm_ppo || "-"}</td>
            <td>${item.receive_qty}</td>
            <td>${packSizeDisplay}</td>
            <td>${item.existing_total + item.new_total} (${
          item.existing_total
        } + ${item.new_total})</td>
            <td class="${qtyDiffClass}">${item.qty_difference}</td>
            <td>
              <button onclick="odmOrder.removeItem('${
                item.code_colour
              }')" class="remove-btn">
                Remove
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  removeItem(itemCode) {
    this.tempOrderList = this.tempOrderList.filter(
      (item) => item.code_colour !== itemCode
    );
    this.updateOrderListTable();
    this.updateSubmitButtonState();
  }

  updateSubmitButtonState() {
    const submitButton = document.getElementById("submitOrder");
    const customerName = document.getElementById("customer_name").value.trim();

    submitButton.disabled = !customerName || this.tempOrderList.length === 0;
  }

  async checkExistingOrders(customerName) {
    try {
      // Get all ODM orders for this customer with specific statuses
      const { data, error } = await supabaseClient
        .from("orders")
        .select(
          `
          id,
          customer_name,
          status,
          created_at,
          total_items,
          order_note,
          order_items (
            item_name,
            total_pieces,
            order_item_status
          )
        `
        )
        .eq("order_type", "ODM")
        .ilike("customer_name", customerName)
        .in("status", ["PROCESSING", "ODM HOLD"]);

      if (error) throw error;

      const warning = document.getElementById("customerWarning");

      if (data && data.length > 0) {
        // Format order details
        const orderDetails = data.map((order) => {
          // Convert UTC to Sydney time
          const sydneyDate = new Date(order.created_at).toLocaleString(
            "en-AU",
            {
              timeZone: "Australia/Sydney",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }
          );

          // Get active items count
          const activeItems = order.order_items.filter(
            (item) => item.order_item_status.toUpperCase() === "ACTIVE"
          ).length;

          // Format order summary
          return {
            date: sydneyDate,
            status: order.status.toUpperCase(),
            totalItems: order.total_items,
            activeItems: activeItems,
            note: order.order_note || "No note",
            items: order.order_items.map((item) => ({
              name: item.item_name,
              pieces: item.total_pieces,
              status: item.order_item_status,
            })),
          };
        });

        // Create warning message with order summaries
        const warningHTML = `
          <div class="warning-header">
            Warning: Customer "${customerName}" has ${
          data.length
        } pending ODM order${data.length > 1 ? "s" : ""}:
          </div>
          ${orderDetails
            .map(
              (order) => `
            <div class="order-summary">
              <div class="order-summary-header">
                Order from ${order.date}
              </div>
              <div class="order-summary-details">
                <div>Status: <span class="status-${order.status.toLowerCase()}">${
                order.status
              }</span></div>
                <div>Items: ${order.activeItems} active / ${
                order.totalItems
              } total</div>
                <div>Note: ${order.note}</div>
              </div>
              <div class="order-items-list">
                ${order.items
                  .map(
                    (item) => `
                  <div class="order-item">
                    • ${item.name} (${item.pieces} pcs) - ${item.status}
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        `;

        warning.innerHTML = warningHTML;
        warning.style.display = "block";

        // Add CSS for warning styling
        if (!document.getElementById("warningStyles")) {
          const styles = `
            <style id="warningStyles">
              #customerWarning {
                background-color: #fff3f4;
                border: 1px solid #dc3545;
                border-radius: 4px;
                padding: 15px;
                margin: 10px 0;
                font-size: 0.9em;
              }

              .warning-header {
                color: #dc3545;
                font-weight: bold;
                margin-bottom: 10px;
              }

              .order-summary {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                margin: 10px 0;
                padding: 10px;
              }

              .order-summary-header {
                font-weight: bold;
                color: #495057;
                margin-bottom: 5px;
              }

              .order-summary-details {
                margin-bottom: 8px;
                color: #666;
              }

              .status-processing {
                color: #ffc107;
                font-weight: bold;
              }

              .status-odm-hold {
                color: #dc3545;
                font-weight: bold;
              }

              .order-items-list {
                font-size: 0.9em;
                color: #666;
                margin-left: 10px;
              }

              .order-item {
                margin: 3px 0;
              }
            </style>
          `;
          document.head.insertAdjacentHTML("beforeend", styles);
        }
      } else {
        warning.style.display = "none";
      }
    } catch (error) {
      console.error("Error checking orders:", error);
      const warning = document.getElementById("customerWarning");
      warning.innerHTML = `
        <div class="warning-header">
          Error checking customer orders
        </div>
      `;
      warning.style.display = "block";
    }
  }

  async submitOrder() {
    try {
      if (!this.validateForm()) return;

      // Get and format form data
      const orderData = {
        customer_name: document
          .getElementById("customer_name")
          .value.trim()
          .toUpperCase(),
        agent_state: document.getElementById("agent_state").value.toUpperCase(),
        dispatched_box: (document.getElementById("dispatched_box")?.value || "")
          .trim()
          .toUpperCase(),
        dispatched_at: document.getElementById("dispatched_at")?.value || null,
        order_note: (document.getElementById("order_note")?.value || "")
          .trim()
          .toUpperCase(),
        order_type: "ODM",
        status: "PROCESSING",
        total_items: this.tempOrderList.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create new order
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Process each item in the order
      for (const item of this.tempOrderList) {
        try {
          // First get current inventory data
          const { data: currentInventory, error: getError } =
            await supabaseClient
              .from("inventory")
              .select("pack_size, odm_qty_diff")
              .eq("code_colour", item.code_colour)
              .single();

          if (getError) throw getError;

          // Merge existing and new pack sizes
          const updatedPackSize = {
            ...(currentInventory.pack_size || {}), // Start with existing pack sizes
            ...item.new_pack_size, // Add new pack sizes (will override if same size exists)
          };

          // Calculate new total from combined pack sizes
          const totalAmount = Object.values(updatedPackSize).reduce(
            (sum, amount) => sum + parseInt(amount),
            0
          );

          // Calculate new quantity difference
          const newQtyDiff = totalAmount - item.receive_qty;

          // Update inventory with combined pack sizes and new qty diff
          const { error: updateError } = await supabaseClient
            .from("inventory")
            .update({
              pack_size: updatedPackSize, // Combined pack sizes
              odm_qty_diff: newQtyDiff, // New quantity difference
              item_status: "PROCESSING",
              updated_at: new Date().toISOString(),
            })
            .eq("code_colour", item.code_colour);

          if (updateError) throw updateError;

          // Create new order item entry
          const orderItem = {
            order_id: order.id,
            item_name: item.code_colour.toUpperCase(),
            total_pieces: item.new_total, // Only store new pieces in order_items
            order_item_status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error: orderItemError } = await supabaseClient
            .from("order_items")
            .insert([orderItem]);

          if (orderItemError) throw orderItemError;
        } catch (itemError) {
          console.error(
            `Error processing item ${item.code_colour}:`,
            itemError
          );
          throw new Error(
            `Failed to process item ${item.code_colour}: ${itemError.message}`
          );
        }
      }

      // Success handling
      alert("Order submitted successfully!");

      // Close modal if it exists
      const modal = document.getElementById("odmOrderModal");
      if (modal) {
        modal.style.display = "none";
      }

      // Clear form
      this.clearForm();

      // Refresh order list if adminOrder exists
      if (typeof adminOrder !== "undefined") {
        adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert(`Error creating order: ${error.message}`);
    }
  }

  clearForm() {
    // Clear all input fields
    document.getElementById("customer_name").value = "";
    document.getElementById("agent_state").value = "";
    document.getElementById("order_note").value = "";
    document.getElementById("odmItemSearch").value = "";

    // Clear selected item details
    const itemDetails = document.getElementById("selectedOdmItemDetails");
    if (itemDetails) {
      itemDetails.style.display = "none";
    }

    // Clear suggestions
    if (this.suggestionsList) {
      this.suggestionsList.innerHTML = "";
    }

    // Clear temp storage
    this.tempOrderList = [];
    this.selectedItem = null;

    // Update table
    this.updateOrderListTable();

    // Reset submit button state
    this.updateSubmitButtonState();
  }

  validateForm() {
    const customerName = document.getElementById("customer_name")?.value.trim();
    const agentState = document.getElementById("agent_state")?.value;

    if (!customerName) {
      alert("Please enter customer name");
      return false;
    }

    if (!agentState) {
      alert("Please select agent state");
      return false;
    }

    if (this.tempOrderList.length === 0) {
      alert("Please add at least one item to the order");
      return false;
    }

    return true;
  }
}

// Add to your existing CSS
document.head.insertAdjacentHTML(
  "beforeend",
  `
  <style>
    .item-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .info-card {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }

    .info-card label {
      display: block;
      font-size: 0.9em;
      color: #666;
      margin-bottom: 5px;
    }

    .info-value {
      font-weight: bold;
      color: #333;
    }

    .info-value.negative {
      color: #dc3545;
    }

    .info-value.positive {
      color: #28a745;
    }

    .pack-size-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }

    .pack-size-row input {
      padding: 5px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .remove-row-btn {
      padding: 5px 10px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .remove-row-btn:hover {
      background: #c82333;
    }
  </style>
`
);
