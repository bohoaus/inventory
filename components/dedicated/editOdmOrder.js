class EditOdmOrder {
  constructor() {
    this.orderId = null;
    this.orderType = "odm";
    this.tempOrderList = [];
    this.originalOrderList = []; // Store original order items
    this.searchInput = null;
    this.suggestionsList = null;
    this.orderListTable = null;
    this.tempOrderListTable = null;
    this.selectedItem = null;

    // Bind methods to maintain 'this' context
    this.removeItem = this.removeItem.bind(this);
    this.undoChange = this.undoChange.bind(this);
    this.updateOrderListTable = this.updateOrderListTable.bind(this);
    this.updateTempOrderListTable = this.updateTempOrderListTable.bind(this);
  }

  async initialize(orderId) {
    this.orderId = orderId;
    const form = document.getElementById("editOdmOrderForm");
    if (!form) return;

    try {
      // Fetch order data and initialize lists
      const orderData = await this.fetchOrderData(orderId);
      if (!orderData) return;

      // Format the dispatched_at date correctly
      if (orderData.dispatched_at) {
        const date = new Date(orderData.dispatched_at);
        const formattedDate = date.toISOString().slice(0, 16);
        orderData.dispatched_at = formattedDate;
      }

      // Generate and set form HTML
      form.innerHTML = this.generateFormHTML(orderData);

      // Initialize elements
      this.orderListTable = document.getElementById("odmOrderListTable");
      this.tempOrderListTable = document.getElementById("tempOrderListTable");

      // Set up event listeners
      this.setupEventListeners();

      // Initialize empty tempOrderList
      this.tempOrderList = [];

      // Update tables
      this.updateOrderListTable();
      this.updateTempOrderListTable();

      // Debug log to verify list state
      console.log(
        "After initialization - Original list:",
        JSON.stringify(this.originalOrderList)
      );
    } catch (error) {
      console.error("Error initializing order:", error);
      alert("Error loading order data. Please try again.");
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

      // Fetch order items with inventory details
      const { data: orderItems, error: itemsError } = await supabaseClient
        .from("order_items")
        .select(
          `
          *,
          inventory:item_name (
            code_colour,
            pack_size,
            item_status,
            receive_qty,
            odm_ppo,
            odm_qty_diff
          )
          `
        )
        .eq("order_id", orderId)
        .neq("order_item_status", "REMOVED")
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      console.log("Fetched order items:", orderItems);

      // Group items by item_name and take only the latest entry
      const latestItems = orderItems.reduce((acc, item) => {
        if (
          !acc[item.item_name] ||
          new Date(item.created_at) > new Date(acc[item.item_name].created_at)
        ) {
          acc[item.item_name] = item;
        }
        return acc;
      }, {});

      // Store the latest items in originalOrderList with proper structure
      this.originalOrderList = Object.values(latestItems).map((item) => ({
        item_name: item.item_name,
        inventory: {
          code_colour: item.inventory?.code_colour || item.item_name,
          pack_size: this.parsePackSize(item.inventory?.pack_size),
          item_status: item.inventory?.item_status,
          receive_qty: item.inventory?.receive_qty,
          odm_ppo: item.inventory?.odm_ppo,
          odm_qty_diff: item.inventory?.odm_qty_diff,
        },
        total_pieces: item.total_pieces,
        order_item_status: item.order_item_status,
      }));

      console.log(
        "Initialized original order list:",
        JSON.stringify(this.originalOrderList)
      );

      return {
        ...orderData,
        items: Object.values(latestItems),
      };
    } catch (error) {
      console.error("Error fetching order:", error);
      return null;
    }
  }

  async loadOrderItems(orderId) {
    try {
      const { data, error } = await supabaseClient
        .from("order_items")
        .select(
          `
          *,
          inventory:item_name (
            code_colour,
            pack_size,
            item_status,
            receive_qty,
            odm_ppo,
            odm_qty_diff
          )
          `
        )
        .eq("order_id", orderId)
        .neq("order_item_status", "REMOVED")
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Loaded order items:", data); // Debug log

      // Group items by item_name and take only the latest entry
      const latestItems = data.reduce((acc, item) => {
        if (
          !acc[item.item_name] ||
          new Date(item.created_at) > new Date(acc[item.item_name].created_at)
        ) {
          acc[item.item_name] = item;
        }
        return acc;
      }, {});

      // Convert back to array and store in originalOrderList
      this.originalOrderList = Object.values(latestItems).map((item) => ({
        item_name: item.item_name, // Ensure this is set correctly
        inventory: {
          code_colour: item.inventory?.code_colour || item.item_name,
          pack_size: this.parsePackSize(item.inventory?.pack_size),
          item_status: item.inventory?.item_status,
          receive_qty: item.inventory?.receive_qty,
          odm_ppo: item.inventory?.odm_ppo,
          odm_qty_diff: item.inventory?.odm_qty_diff,
        },
        total_pieces: item.total_pieces,
        order_item_status: item.order_item_status,
      }));

      console.log("Processed original order list:", this.originalOrderList); // Debug log

      // Initialize empty tempOrderList
      this.tempOrderList = [];

      // Update both tables
      this.updateOrderListTable();
      this.updateTempOrderListTable();
    } catch (error) {
      console.error("Error loading order items:", error);
      alert("Error loading order items. Please try again.");
    }
  }

  generateFormHTML(orderData) {
    return `
        <div class="odm-form">
            <!-- Customer and Agent State -->
            <div class="form-row">
                <div class="form-group">
                    <label>Customer Name</label>
                    <input type="text" maxlength="30" 
                           value="${orderData.customer_name || ""}" 
                           disabled 
                           style="
                               background-color: #f5f5f5;
                               cursor: not-allowed;
                               color: #666;
                               border: 1px solid #ddd;
                               padding: 8px 12px;
                               border-radius: 4px;
                               width: 100%;
                           ">
                </div>
                <div class="form-group">
                    <label for="agent_state">Agent State</label>
                    <select id="agent_state" required style="width: 150px">
                        <option value="">Select State</option>
                        <option value="AUS-ACT" ${
                          orderData.agent_state?.toUpperCase() === "AUS-ACT"
                            ? "selected"
                            : ""
                        }>AUS-ACT</option>
                        <option value="AUS-NSW" ${
                          orderData.agent_state?.toUpperCase() === "AUS-NSW"
                            ? "selected"
                            : ""
                        }>AUS-NSW</option>
                        <option value="AUS-NT" ${
                          orderData.agent_state?.toUpperCase() === "AUS-NT"
                            ? "selected"
                            : ""
                        }>AUS-NT</option>
                        <option value="AUS-QLD" ${
                          orderData.agent_state?.toUpperCase() === "AUS-QLD"
                            ? "selected"
                            : ""
                        }>AUS-QLD</option>
                        <option value="AUS-SA" ${
                          orderData.agent_state?.toUpperCase() === "AUS-SA"
                            ? "selected"
                            : ""
                        }>AUS-SA</option>
                        <option value="AUS-TAS" ${
                          orderData.agent_state?.toUpperCase() === "AUS-TAS"
                            ? "selected"
                            : ""
                        }>AUS-TAS</option>
                        <option value="AUS-VIC" ${
                          orderData.agent_state?.toUpperCase() === "AUS-VIC"
                            ? "selected"
                            : ""
                        }>AUS-VIC</option>
                        <option value="AUS-WA" ${
                          orderData.agent_state?.toUpperCase() === "AUS-WA"
                            ? "selected"
                            : ""
                        }>AUS-WA</option>
                        <option value="Others" ${
                          orderData.agent_state?.toUpperCase() === "OTHERS"
                            ? "selected"
                            : ""
                        }>Others</option>
                        <option value="NZ" ${
                          orderData.agent_state?.toUpperCase() === "NZ"
                            ? "selected"
                            : ""
                        }>NZ</option>
                    </select>
                </div>
            </div>

            <!-- Dispatch Info -->
            <div class="form-row">
                <div class="form-group">
                    <label for="dispatched_box">Dispatched Box</label>
                    <input type="text" style="width: 60px" maxlength="3" 
                           id="dispatched_box" 
                           value="${orderData.dispatched_box || ""}" 
                           placeholder="Enter dispatched box">
                </div>
                <div class="form-group">
                    <label for="dispatched_at">Dispatch Date</label>
                    <input type="datetime-local" style="width: 250px" 
                           id="dispatched_at" 
                           value="${orderData.dispatched_at || ""}">
                </div>
            </div>

            <!-- Order Note with larger font -->
            <div class="form-row">
                <div class="form-group full-width">
                    <label for="order_note">Order Note</label>
                    <textarea  maxlength="50" 
                        id="order_note" 
                        placeholder="Add note for this order"
                        style="
                            font-size: 15px; 
                            padding: 10px; 
                            min-height: 100px; 
                            width: 100%; 
                            border: 1px solid #ddd; 
                            border-radius: 4px;
                            line-height: 1.4;
                        "
                    >${orderData.order_note || ""}</textarea>
                </div>
            </div>

            <!-- Order Tables -->
            <div class="order-tables" style="margin-top: 20px;">
                <!-- Original Order Items -->
                <div class="table-section">
                    <h3>Original Order Items</h3>
                    <table id="odmOrderListTable" class="order-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Item Code</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">PPO</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Received Qty</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Pack Size</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Counted Pieces</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Status</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <!-- Changes to Order -->
                <div class="table-section">
                    <h3>Changes to Order</h3>
                    <table id="tempOrderListTable" class="order-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Item Code</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">PPO</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Received Qty</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Pack Size</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Counted Pieces</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Change Type</th>
                                <th style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa;">Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="form-actions" style="
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
            ">
                <button type="button" class="save-btn" title="Save Changes">
                    <span class="material-icons">save</span>
                    Save
                </button>
            </div>
        </div>
    `;
  }

  updateOrderListTable() {
    console.log(
      "Updating order list table. Original list:",
      JSON.stringify(this.originalOrderList)
    );
    if (!this.orderListTable) return;

    const tbody = this.orderListTable.querySelector("tbody");
    // Clear existing content
    tbody.innerHTML = "";

    // Create and append rows
    this.originalOrderList.forEach((item) => {
      console.log("Processing item for table:", item);
      const packSizeDisplay = this.parsePackSizeData(item.inventory?.pack_size);

      const row = document.createElement("tr");
      row.innerHTML = `
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.item_name
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.inventory?.odm_ppo || "-"
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.inventory?.receive_qty || "-"
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${packSizeDisplay}</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.total_pieces || "-"
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.order_item_status || "-"
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">
              <button type="button"
                      class="remove-btn"
                      style="
                          padding: 6px 12px;
                          border: 1px solid #dc3545;
                          border-radius: 4px;
                          background: white;
                          color: #dc3545;
                          cursor: pointer;
                          display: flex;
                          align-items: center;
                          gap: 4px;
                      ">
                  <span class="material-icons" style="font-size: 16px;">delete</span>
                  Remove
              </button>
          </td>
      `;

      // Add event listener to the remove button
      const removeBtn = row.querySelector(".remove-btn");
      removeBtn.addEventListener("click", () => {
        console.log("Remove button clicked for item:", item.item_name);
        this.removeItem(item.item_name);
      });

      // Append the row to tbody
      tbody.appendChild(row);
    });
  }

  removeItem(itemName) {
    console.log("Removing item:", itemName);
    console.log(
      "Original list before removal:",
      JSON.stringify(this.originalOrderList)
    );

    // Find the item in the original list
    const item = this.originalOrderList.find((i) => i.item_name === itemName);
    console.log("Found item:", JSON.stringify(item));

    if (item) {
      // Create a deep copy of the item with all necessary properties
      const removedItem = {
        item_name: item.item_name,
        inventory: {
          code_colour: item.inventory?.code_colour || item.item_name,
          odm_ppo: item.inventory?.odm_ppo,
          receive_qty: item.inventory?.receive_qty,
          pack_size: this.parsePackSize(item.inventory?.pack_size),
          item_status: item.inventory?.item_status,
          odm_qty_diff: item.inventory?.odm_qty_diff,
        },
        total_pieces: item.total_pieces,
        order_item_status: "REMOVED",
        changeType: "removed",
      };

      console.log("Created removed item:", JSON.stringify(removedItem));

      // Create a new array for originalOrderList instead of modifying in place
      this.originalOrderList = [...this.originalOrderList].filter(
        (i) => i.item_name !== itemName
      );

      // Add to temp list
      this.tempOrderList.push(removedItem);

      console.log(
        "After removal - Original list:",
        JSON.stringify(this.originalOrderList)
      );
      console.log(
        "After removal - Temp list:",
        JSON.stringify(this.tempOrderList)
      );

      // Update both tables
      this.updateOrderListTable();
      this.updateTempOrderListTable();
    } else {
      console.error(
        "Item not found in original list. Original list:",
        JSON.stringify(this.originalOrderList)
      );
    }
  }

  updateTempOrderListTable() {
    if (!this.tempOrderListTable) return;

    const tbody = this.tempOrderListTable.querySelector("tbody");
    // Clear existing content
    tbody.innerHTML = "";

    // Create and append rows
    this.tempOrderList.forEach((item) => {
      const packSizeDisplay = this.parsePackSizeData(item.inventory?.pack_size);
      const changeType = item.changeType || "added";

      const row = document.createElement("tr");
      row.className = `${changeType}-change`;
      row.innerHTML = `
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.item_name
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.inventory?.odm_ppo || "-"
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.inventory?.receive_qty || "-"
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${packSizeDisplay}</td>
          <td style="border: 1px solid #ddd; padding: 12px;">${
            item.total_pieces || "-"
          }</td>
          <td style="border: 1px solid #ddd; padding: 12px;">
              <span class="change-type ${changeType}" style="
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-size: 0.85em;
                  font-weight: 500;
                  background-color: ${
                    changeType === "removed" ? "#ffebee" : "#e8f5e9"
                  };
                  color: ${changeType === "removed" ? "#c62828" : "#2e7d32"};
              ">
                  ${changeType.toUpperCase()}
              </span>
          </td>
          <td style="border: 1px solid #ddd; padding: 12px;">
              <button type="button"
                      class="undo-btn"
                      style="
                          padding: 6px 12px;
                          border: 1px solid #ddd;
                          border-radius: 4px;
                          background: white;
                          cursor: pointer;
                          display: flex;
                          align-items: center;
                          gap: 4px;
                      ">
                  <span class="material-icons" style="font-size: 16px;">undo</span>
                  Undo
              </button>
          </td>
      `;

      // Add event listener to the undo button
      const undoBtn = row.querySelector(".undo-btn");
      undoBtn.addEventListener("click", () => {
        console.log("Undo button clicked for item:", item.item_name);
        this.undoChange(item.item_name);
      });

      // Append the row to tbody
      tbody.appendChild(row);
    });
  }

  undoChange(itemName) {
    const itemIndex = this.tempOrderList.findIndex(
      (i) => i.item_name === itemName
    );
    if (itemIndex !== -1) {
      const item = this.tempOrderList[itemIndex];

      // Create a clean copy of the item for restoration
      const restoredItem = {
        item_name: item.item_name,
        inventory: {
          code_colour: item.inventory?.code_colour,
          odm_ppo: item.inventory?.odm_ppo,
          receive_qty: item.inventory?.receive_qty,
          pack_size: this.parsePackSize(item.inventory?.pack_size),
          item_status: item.inventory?.item_status,
          odm_qty_diff: item.inventory?.odm_qty_diff,
        },
        total_pieces: item.total_pieces,
        order_item_status: "PROCESSING", // Reset status to PROCESSING when restored
      };

      // Add back to original list
      this.originalOrderList.push(restoredItem);

      // Remove from temp list
      this.tempOrderList.splice(itemIndex, 1);

      // Update both tables
      this.updateOrderListTable();
      this.updateTempOrderListTable();
    }
  }

  async updateOrder() {
    try {
      // Get form data
      const agentState = document
        .getElementById("agent_state")
        .value.toUpperCase();
      const dispatchedBox = document
        .getElementById("dispatched_box")
        .value.trim();
      const dispatchedAt = document.getElementById("dispatched_at").value;
      const orderNote = document.getElementById("order_note").value.trim();

      // Get current order data first
      const { data: currentOrder, error: currentOrderError } =
        await supabaseClient
          .from("orders")
          .select("total_items, removed_items")
          .eq("id", this.orderId)
          .single();

      if (currentOrderError) throw currentOrderError;

      let totalNewItems = 0;
      let totalRemovedItems = 0;

      // Handle removed items
      for (const item of this.tempOrderList.filter(
        (i) => i.changeType === "removed"
      )) {
        // Create new order item entry for removed item
        const { error: orderItemError } = await supabaseClient
          .from("order_items")
          .insert({
            order_id: this.orderId,
            item_name: item.item_name,
            total_pieces: item.total_pieces,
            order_item_status: "REMOVED",
            created_at: new Date().toISOString(),
          });

        if (orderItemError) throw orderItemError;

        // Update inventory for removed item
        const { error: inventoryError } = await supabaseClient
          .from("inventory")
          .update({
            item_status: "CANCELLED IN WAREHOUSE",
            stock_qty: item.total_pieces,
            // odm_qty_diff remains unchanged
          })
          .eq("code_colour", item.item_name);

        if (inventoryError) throw inventoryError;

        totalRemovedItems += item.total_pieces;
      }

      // Handle added items
      for (const item of this.tempOrderList.filter(
        (i) => i.changeType === "added"
      )) {
        // Calculate total from pack sizes
        const packSizeTotal = Object.values(item.inventory.pack_size).reduce(
          (sum, amount) => sum + amount,
          0
        );

        // Calculate qty difference
        const qtyDiff = packSizeTotal - item.inventory.receive_qty;

        // Create new order item entry
        const { error: orderItemError } = await supabaseClient
          .from("order_items")
          .insert({
            order_id: this.orderId,
            item_name: item.item_name,
            total_pieces: packSizeTotal,
            order_item_status: "PROCESSING",
            created_at: new Date().toISOString(),
          });

        if (orderItemError) throw orderItemError;

        // Update inventory
        const { error: inventoryError } = await supabaseClient
          .from("inventory")
          .update({
            odm_qty_diff: qtyDiff,
            item_status: "PROCESSING",
          })
          .eq("code_colour", item.item_name);

        if (inventoryError) throw inventoryError;

        totalNewItems += packSizeTotal;
      }

      // Calculate new totals including existing amounts
      const newTotalItems = currentOrder.total_items + totalNewItems;
      const newRemovedItems = currentOrder.removed_items + totalRemovedItems;

      // Prepare update data
      const updateData = {
        agent_state: agentState,
        dispatched_box: dispatchedBox || null,
        order_note: orderNote,
        total_items: newTotalItems,
        removed_items: newRemovedItems,
        updated_at: new Date().toISOString(),
      };

      if (dispatchedAt) {
        updateData.dispatched_at = dispatchedAt;
      }

      // Update order details
      const { error: updateOrderError } = await supabaseClient
        .from("orders")
        .update(updateData)
        .eq("id", this.orderId);

      if (updateOrderError) throw updateOrderError;

      alert("Order updated successfully!");
      document.getElementById("editOdmOrderModal").style.display = "none";
      if (typeof adminOrder !== "undefined") {
        adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
  }

  setupEventListeners() {
    // Form submission
    const updateOrderBtn = document.getElementById("updateOrder");
    if (updateOrderBtn) {
      updateOrderBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.updateOrder();
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById("cancelEdit");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        document.getElementById("editOdmOrderModal").style.display = "none";
      });
    }

    // Save button - Remove old event listener if exists
    const saveBtn = document.querySelector(".save-btn");
    if (saveBtn) {
      // Remove old event listeners
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

      // Add new event listener
      newSaveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSave();
      });
    }
  }

  async searchItems(searchTerm) {
    if (!searchTerm) {
      if (this.suggestionsList) {
        this.suggestionsList.style.display = "none";
      }
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("inventory")
        .select("code_colour")
        .eq("item_group", "ODM")
        .ilike("code_colour", `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      if (!this.suggestionsList) return;

      // Clear previous suggestions
      this.suggestionsList.innerHTML = "";

      if (data.length === 0) {
        this.suggestionsList.innerHTML = `
                <div class="suggestion-item" style="
                    padding: 12px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                ">
                    No ODM items found
                </div>`;
      } else {
        this.suggestionsList.innerHTML = data
          .map(
            (item) => `
                        <div class="suggestion-item" 
                             onclick="editOdmOrder.addSearchedItem('${item.code_colour}')"
                             style="
                                 padding: 12px;
                                 cursor: pointer;
                                 border-bottom: 1px solid #eee;
                                 font-size: 16px;
                                 color: #2779f5;
                                 font-weight: 600;
                                 transition: all 0.2s ease;
                                 background-color: white;
                             "
                             onmouseover="this.style.backgroundColor='#f8f9fa'; this.style.color='#6fa6f7';"
                             onmouseout="this.style.backgroundColor='white'; this.style.color='#2779f5';"
                        >
                            ${item.code_colour}
                </div>
            `
          )
          .join("");
      }

      // Position and style suggestions dropdown
      const searchContainer = this.searchInput.closest(".search-container");
      if (searchContainer) {
        this.suggestionsList.style.width = "100%";
        this.suggestionsList.style.position = "absolute";
        this.suggestionsList.style.top = "100%";
        this.suggestionsList.style.left = "0";
        this.suggestionsList.style.display = "block";
        this.suggestionsList.style.maxHeight = "300px";
        this.suggestionsList.style.overflowY = "auto";
        this.suggestionsList.style.backgroundColor = "white";
        this.suggestionsList.style.border = "1px solid #ddd";
        this.suggestionsList.style.borderRadius = "0 0 4px 4px";
        this.suggestionsList.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        this.suggestionsList.style.zIndex = "1000";
      }
    } catch (error) {
      console.error("Error searching items:", error);
      if (this.suggestionsList) {
        this.suggestionsList.innerHTML = `
                <div class="suggestion-item" style="
                    padding: 12px;
                    text-align: center;
                    color: #dc3545;
                    font-size: 14px;
                ">
                    Error searching items
                </div>`;
      }
    }
  }

  async addSearchedItem(code) {
    try {
      // Check if item already exists in original list or temp list
      const existsInOriginal = this.originalOrderList.some(
        (item) => item.item_name === code
      );
      const existsInTemp = this.tempOrderList.some(
        (item) => item.item_name === code
      );

      if (existsInOriginal || existsInTemp) {
        alert("This item is already in the order");
        return;
      }

      const { data: item, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq("code_colour", code)
        .single();

      if (error) throw error;

      // Store selected item temporarily
      this.selectedItem = item;

      // Show pack size modal
      const modal = document.getElementById("packSizeModal");
      if (!modal) {
        throw new Error("Pack size modal not found");
      }

      // Clear previous inputs
      const packSizeInputs = document.getElementById("packSizeInputs");
      if (packSizeInputs) {
        packSizeInputs.innerHTML = "";
        this.addPackSizeRow(); // Add one empty row
      }

      modal.style.display = "block";

      // Clear search
      if (this.searchInput) {
        this.searchInput.value = "";
      }
      if (this.suggestionsList) {
        this.suggestionsList.style.display = "none";
      }
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Error adding item. Please try again.");
    }
  }

  initializePackSizeForm() {
    // Implementation for initializing pack size form
  }

  addPackSizeRow(size = "", amount = "") {
    const packSizeInputs = document.getElementById("packSizeInputs");
    const rowDiv = document.createElement("div");
    rowDiv.className = "pack-size-row";
    rowDiv.style.cssText =
      "display: grid; grid-template-columns: 2fr 1fr 40px; gap: 10px; margin-bottom: 10px;";
    rowDiv.innerHTML = `
        <input type="text" 
               class="size-input" 
               placeholder="Size" 
               value="${size}"
               style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
               onkeyup="this.value = this.value.toUpperCase()">
        <input type="number" 
               class="amount-input" 
               placeholder="Amount" 
               value="${amount}"
               min="1"
               style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <button type="button" 
                class="remove-size" 
                onclick="this.parentElement.remove()"
                style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">×</button>
    `;

    packSizeInputs.appendChild(rowDiv);
  }

  confirmPackSize() {
    const packSizeInputs = document.getElementById("packSizeInputs");
    const rows = packSizeInputs.querySelectorAll(".pack-size-row");
    const packSizes = {};
    let totalAmount = 0;

    // Validate and collect pack sizes
    for (const row of rows) {
      const sizeInput = row.querySelector(".size-input").value.trim();
      const amountInput = parseInt(row.querySelector(".amount-input").value);

      if (!sizeInput || isNaN(amountInput) || amountInput <= 0) {
        alert("Please fill in all pack sizes with valid amounts");
        return;
      }

      packSizes[sizeInput] = amountInput;
      totalAmount += amountInput;
    }

    // Add to temp order list
    this.tempOrderList.push({
      item_name: this.selectedItem.code_colour,
      total_pieces: totalAmount,
      inventory: {
        ...this.selectedItem,
        pack_size: packSizes,
      },
      changeType: "added",
    });

    // Update table and close modal
    this.updateTempOrderListTable();
    document.getElementById("packSizeModal").style.display = "none";
    this.selectedItem = null;
  }

  async handleDispatch() {
    // Get existing order data
    const { data: orderData, error: orderError } = await supabaseClient
      .from("orders")
      .select(
        "invoice_no, dispatched_box, dispatched_carrier, tracking_no, order_note"
      )
      .eq("id", this.orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order data:", orderError);
      return;
    }

    // Create and show dispatch modal
    const modalHTML = `
        <div id="dispatchModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Dispatch Order</h2>
                    <span class="close" onclick="document.getElementById('dispatchModal').remove()">&times;</span>
                </div>
                <form id="dispatchForm" onsubmit="event.preventDefault(); editOdmOrder.submitDispatch();">
                    <div class="form-group">
                        <label for="invoice_no">Invoice No*</label>
                        <input type="text" 
                               id="invoice_no" 
                               name="invoice_no" 
                               value="${orderData.invoice_no || ""}"
                               required 
                               onkeyup="this.value = this.value.toUpperCase()">
                    </div>

                    <div class="form-group">
                        <label for="dispatched_state">Dispatch State*</label>
                        <select id="dispatched_state" name="dispatched_state" required>
                            <option value="">Select State</option>
                            <option value="AUS-ACT">AUS-ACT</option>
                            <option value="AUS-NSW">AUS-NSW</option>
                            <option value="AUS-NT">AUS-NT</option>
                            <option value="AUS-QLD">AUS-QLD</option>
                            <option value="AUS-SA">AUS-SA</option>
                            <option value="AUS-TAS">AUS-TAS</option>
                            <option value="AUS-VIC">AUS-VIC</option>
                            <option value="AUS-WA">AUS-WA</option>
                            <option value="NZ">NZ</option>
                            <option value="OTHERS">OTHERS</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="dispatched_box">Dispatch Box*</label>
                        <input type="text" 
                               id="dispatched_box" 
                               name="dispatched_box" 
                               value="${orderData.dispatched_box || ""}"
                               required 
                               onkeyup="this.value = this.value.toUpperCase()">
                    </div>

                    <div class="form-group">
                        <label for="dispatched_carrier">Dispatch Carrier*</label>
                        <select id="dispatched_carrier" 
                                name="dispatched_carrier" 
                                required
                                onchange="editOdmOrder.toggleTrackingNo()">
                            <option value="">Select Carrier</option>
                            <option value="DIRECT EXPRESS">DIRECT EXPRESS</option>
                            <option value="AUSTRALIA POST EXPRESS">AUSTRALIA POST EXPRESS</option>
                            <option value="AUSTRALIA POST">AUSTRALIA POST</option>
                            <option value="DHL">DHL</option>
                            <option value="PICK UP">PICK UP</option>
                            <option value="OTHERS">OTHERS</option>
                        </select>
                    </div>

                    <div class="form-group" id="tracking_no_group" style="display: none;">
                        <label for="tracking_no">Tracking No*</label>
                        <input type="text" 
                               id="tracking_no" 
                               name="tracking_no"
                               value="${orderData.tracking_no || ""}"
                               onkeyup="this.value = this.value.toUpperCase()">
                    </div>

                    <div class="form-group">
                        <label for="order_note">Order Note</label>
                        <textarea id="order_note" 
                                name="order_note" 
                                rows="3"
                                onkeyup="this.value = this.value.toUpperCase()">${
                                  orderData.order_note || ""
                                }</textarea>
                    </div>

                    <div class="form-actions" style="margin-top: 20px; text-align: right;">
                        <button type="button" 
                                onclick="document.getElementById('dispatchModal').remove()"
                                class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Submit Dispatch</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Set initial carrier and tracking no visibility
    if (orderData.dispatched_carrier) {
      document.getElementById("dispatched_carrier").value =
        orderData.dispatched_carrier;
      this.toggleTrackingNo();
    }
  }

  toggleTrackingNo() {
    const carrier = document.getElementById("dispatched_carrier").value;
    const trackingGroup = document.getElementById("tracking_no_group");
    const trackingInput = document.getElementById("tracking_no");

    if (carrier === "PICK UP" || carrier === "OTHERS") {
      trackingGroup.style.display = "none";
      trackingInput.required = false;
    } else {
      trackingGroup.style.display = "block";
      trackingInput.required = true;
    }
  }

  async submitDispatch() {
    try {
      const form = document.getElementById("dispatchForm");
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Add dispatch timestamp
      data.dispatched_at = new Date().toISOString();
      data.status = "DISPATCHED";
      data.updated_at = new Date().toISOString();

      // Update order
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update(data)
        .eq("id", this.orderId);

      if (orderError) throw orderError;

      // Update inventory items status
      const { error: inventoryError } = await supabaseClient
        .from("inventory")
        .update({ item_status: "DISPATCHED" })
        .in(
          "code_colour",
          this.originalOrderList.map((item) => item.item_name)
        );

      if (inventoryError) throw inventoryError;

      alert("Order dispatched successfully!");
      document.getElementById("dispatchModal").remove();
      document.getElementById("editOdmOrderModal").style.display = "none";

      // Refresh order list
      if (typeof adminOrder !== "undefined") {
        adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error dispatching order:", error);
      alert("Error dispatching order. Please try again.");
    }
  }

  async handleHold() {
    try {
      const isCurrentlyHeld = await this.checkIfOrderOnHold();
      const newStatus = isCurrentlyHeld ? "PROCESSING" : "ODM HOLD";

      // Update order status
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.orderId);

      if (orderError) throw orderError;

      // Update inventory item statuses
      const { error: itemError } = await supabaseClient
        .from("inventory")
        .update({
          item_status: isCurrentlyHeld ? "ACTIVE" : "ON HOLD",
        })
        .in(
          "code_colour",
          this.originalOrderList.map((item) => item.item_name)
        );

      if (itemError) throw itemError;

      // Update UI
      this.updateButtonStates(newStatus === "ODM HOLD");

      // Show success message
      alert(
        `Order ${isCurrentlyHeld ? "unheld" : "put on hold"} successfully!`
      );

      // Refresh order list if needed
      if (typeof adminOrder !== "undefined") {
        adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error updating hold status:", error);
      alert("Error updating order status. Please try again.");
    }
  }

  async checkIfOrderOnHold() {
    try {
      const { data, error } = await supabaseClient
        .from("orders")
        .select("status")
        .eq("id", this.orderId)
        .single();

      if (error) throw error;
      return data.status?.toUpperCase() === "ODM HOLD";
    } catch (error) {
      console.error("Error checking order status:", error);
      return false;
    }
  }

  updateButtonStates(isOnHold) {
    const holdBtn = document.querySelector(".hold-btn");
    const dispatchBtn = document.querySelector(".dispatch-btn");
    const saveBtn = document.querySelector(".save-btn");
    const cancelBtn = document.querySelector(".cancel-btn");

    if (holdBtn) {
      holdBtn.innerHTML = `
            <span class="material-icons">
                ${isOnHold ? "play_circle" : "pause_circle"}
            </span>
            ${isOnHold ? "Unhold" : "Hold"}
        `;
      holdBtn.title = isOnHold ? "Unhold Order" : "Hold Order";
    }

    // Disable/enable other buttons based on hold status
    [dispatchBtn, saveBtn, cancelBtn].forEach((btn) => {
      if (btn) {
        btn.disabled = isOnHold;
        if (isOnHold) {
          btn.style.opacity = "0.5";
          btn.style.cursor = "not-allowed";
        } else {
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        }
      }
    });
  }

  async handleCancel() {
    // Check if there are any non-removed items in the original order list
    const hasNonRemovedItems = this.originalOrderList.some(
      (item) => item.order_item_status?.toUpperCase() !== "REMOVED"
    );

    if (hasNonRemovedItems) {
      alert("Please remove all items from the order before cancelling.");
      return;
    }

    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const { error } = await supabaseClient
        .from("orders")
        .update({
          status: "CANCELLED",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.orderId);

      if (error) throw error;

      alert("Order cancelled successfully!");

      // Close the edit modal
      const editModal = document.getElementById("editOdmOrderModal");
      if (editModal) {
        editModal.style.display = "none";
      }

      // Hide all four bottom buttons
      const actionButtons = document.querySelector(".form-actions");
      if (actionButtons) {
        actionButtons.style.display = "none";
      }

      // Refresh order list to update the UI
      if (typeof adminOrder !== "undefined") {
        adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Error cancelling order. Please try again.");
    }
  }

  parsePackSize(packSize) {
    if (!packSize) return {};
    try {
      return typeof packSize === "string" ? JSON.parse(packSize) : packSize;
    } catch (e) {
      console.error("Error parsing pack size:", e);
      return {};
    }
  }

  parsePackSizeData(packSize) {
    if (!packSize) return "-";
    try {
      // If it's already an object, return formatted string
      if (typeof packSize === "object") {
        return Object.entries(packSize)
          .map(([size, amount]) => `${size}:${amount}`)
          .join(", ");
      }

      // If it's a JSON string, parse and format
      if (typeof packSize === "string" && packSize.startsWith("{")) {
        const parsed = JSON.parse(packSize);
        return Object.entries(parsed)
          .map(([size, amount]) => `${size}:${amount}`)
          .join(", ");
      }

      // If it's already in "S:134, M:100" format, return as is
      if (typeof packSize === "string" && packSize.includes(":")) {
        return packSize;
      }

      return packSize.toString();
    } catch (e) {
      console.error("Error formatting pack size:", e);
      return packSize.toString();
    }
  }

  addItemToOrder(item) {
    // Add the selected item to tempOrderList
    this.tempOrderList.push({
      item_name: item.code_colour,
      total_pieces: item.receive_qty,
      inventory: item,
      changeType: "added",
    });

    // Update tables
    this.updateTempOrderListTable();

    // Clear selection
    document.getElementById("selectedOdmItemDetails").style.display = "none";
    this.selectedItem = null;
  }

  async updateOrderItems() {
    try {
      const updates = [];
      const timestamp = new Date().toISOString();

      // Handle removed items
      for (const originalItem of this.originalOrderList) {
        const isRemoved = !this.tempOrderList.some(
          (tempItem) => tempItem.item_name === originalItem.item_name
        );

        if (isRemoved) {
          updates.push({
            order_id: this.orderId,
            item_name: originalItem.item_name,
            total_pieces: originalItem.total_pieces,
            order_item_status: "REMOVED",
            created_at: timestamp,
            updated_at: timestamp,
          });
        }
      }

      // Handle added/updated items
      for (const tempItem of this.tempOrderList) {
        updates.push({
          order_id: this.orderId,
          item_name: tempItem.item_name,
          total_pieces: tempItem.total_pieces,
          order_item_status: "ACTIVE",
          created_at: timestamp,
          updated_at: timestamp,
        });
      }

      if (updates.length > 0) {
        const { error: itemsError } = await supabaseClient
          .from("order_items")
          .insert(updates);

        if (itemsError) throw itemsError;

        // Update order totals
        const { error: orderError } = await supabaseClient
          .from("orders")
          .update({
            // Count active and removed items by unique style codes
            total_items: this.tempOrderList.length,
            removed_items: this.originalOrderList.filter(
              (item) =>
                !this.tempOrderList.some(
                  (tempItem) => tempItem.item_name === item.item_name
                )
            ).length,
            updated_at: timestamp,
          })
          .eq("id", this.orderId);

        if (orderError) throw orderError;
      }

      return true;
    } catch (error) {
      console.error("Error updating order items:", error);
      return false;
    }
  }

  async handleSave() {
    try {
      // Validate orderId
      if (!this.orderId) {
        console.error("No order ID found");
        alert("Error: No order ID found. Please try reloading the page.");
        return;
      }

      console.log("Saving order with ID:", this.orderId);

      // Get the current order status
      const { data: currentOrder, error: statusError } = await supabaseClient
        .from("orders")
        .select("status")
        .eq("id", this.orderId)
        .single();

      if (statusError) {
        console.error("Error fetching order status:", statusError);
        throw new Error("Could not verify order status");
      }

      // Check if order is in a state that can be edited
      const status = currentOrder?.status?.toUpperCase();
      if (!status) {
        throw new Error("Invalid order status");
      }

      if (status === "DISPATCHED" || status === "CANCELLED") {
        alert(`Cannot edit ${status.toLowerCase()} orders`);
        return;
      }

      // Process removed items
      const removedItems = this.tempOrderList.filter(
        (i) => i.changeType === "removed"
      );
      console.log("Processing removed items:", removedItems);

      for (const item of removedItems) {
        console.log("Processing removed item:", item);

        // 1. Update order_items: find the old entry and mark as removed
        const { error: orderItemError } = await supabaseClient
          .from("order_items")
          .update({
            order_item_status: "REMOVED",
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", this.orderId)
          .eq("item_name", item.item_name)
          .eq("order_item_status", "ACTIVE");

        if (orderItemError) {
          console.error("Error updating order item:", orderItemError);
          throw new Error(`Failed to update order item: ${item.item_name}`);
        }

        // 2. Update inventory: return stock and update status
        const { error: inventoryError } = await supabaseClient
          .from("inventory")
          .update({
            stock_qty: item.total_pieces,
            item_status: "CANCELLED IN WAREHOUSE",
            updated_at: new Date().toISOString(),
          })
          .eq("code_colour", item.item_name);

        if (inventoryError) {
          console.error("Error updating inventory:", inventoryError);
          throw new Error(
            `Failed to update inventory for item: ${item.item_name}`
          );
        }
      }

      // 3. Update orders table with removed items count and other fields
      const removedItemsCount = removedItems.length;
      console.log(
        "Updating order with removed items count:",
        removedItemsCount
      );

      // Get and validate form values
      const agentState = document.getElementById("agent_state")?.value || null;
      const dispatchedBox =
        document.getElementById("dispatched_box")?.value.trim() || null;
      const dispatchedAt =
        document.getElementById("dispatched_at")?.value || null;
      const orderNote =
        document.getElementById("order_note")?.value.trim() || null;

      // Prepare update data
      const updateData = {
        removed_items: removedItemsCount,
        updated_at: new Date().toISOString(),
      };

      // Only add non-null values to update
      if (agentState) updateData.agent_state = agentState;
      if (dispatchedBox) updateData.dispatched_box = dispatchedBox;
      if (dispatchedAt) updateData.dispatched_at = dispatchedAt;
      if (orderNote) updateData.order_note = orderNote;

      console.log("Updating order with data:", updateData);

      const { error: orderUpdateError } = await supabaseClient
        .from("orders")
        .update(updateData)
        .eq("id", this.orderId);

      if (orderUpdateError) {
        console.error("Error updating order:", orderUpdateError);
        throw new Error("Failed to update order with removed items count");
      }

      alert("Order saved successfully!");

      // Close the edit modal
      const modal = document.getElementById("editOdmOrderModal");
      if (modal) {
        modal.style.display = "none";
      }

      // Refresh the orders list
      if (
        typeof adminOrder !== "undefined" &&
        typeof adminOrder.loadOrders === "function"
      ) {
        adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error saving order:", error);
      alert(`Error saving order: ${error.message || "Please try again."}`);
    }
  }
}

// Initialize only once
if (!window.editOdmOrder) {
  let editOdmOrder;
  document.addEventListener("DOMContentLoaded", () => {
    if (!editOdmOrder) {
      editOdmOrder = new EditOdmOrder();

      // Add event listener for modal opening
      document.addEventListener("show.odm.modal", function (event) {
        const orderId = event.detail?.orderId;
        if (orderId) {
          console.log("Initializing edit ODM order with ID:", orderId);
          editOdmOrder.initialize(orderId);
        } else {
          console.error("No order ID provided in modal event");
        }
      });

      // Export for global access
      window.editOdmOrder = editOdmOrder;
    }
  });
}
