class EditWholesaleOrder {
  constructor() {
    this.orderId = null;
    this.orderType = "wholesale";
    this.searchInput = null;
    this.suggestionsList = null;
    this.selectedItem = null;
    this.tempOrderList = [];
    this.tempStockChanges = [];
    this.orderChanges = [];
    this.originalOrderItems = []; // Store original order items
    this.searchTimeout = null;
  }

  // Add utility function for input formatting
  formatInput(input) {
    if (input === null || input === undefined) return "";

    // Convert input to string before processing
    const str = String(input);

    return str
      .toUpperCase()
      .replace(/^\s+/, "")
      .replace(/\s{2,}/g, " ");
  }

  // Add input formatter to all text inputs
  setupInputFormatting(element) {
    if (!element) return;

    element.addEventListener("input", (e) => {
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = this.formatInput(e.target.value);
      // Restore cursor position
      e.target.setSelectionRange(start, end);
    });

    // Format on blur to catch any missed formatting
    element.addEventListener("blur", (e) => {
      e.target.value = this.formatInput(e.target.value);
    });
  }

  async initialize(orderId) {
    this.orderId = orderId;
    const form = document.getElementById("editWholesaleOrderForm");
    if (!form) return;

    try {
      // Fetch order data and order items in parallel
      const [orderResponse, itemsResponse] = await Promise.all([
        supabaseClient.from("orders").select("*").eq("id", orderId).single(),
        supabaseClient
          .from("order_items")
          .select(
            `
            *,
            inventory:item_name(
              code_colour,
              scolour,
              sprice,
              swsp2,
              item_name,
              pack_unit,
              item_status
            )
          `
          )
          .eq("order_id", orderId)
          .neq("order_item_status", "REMOVED"),
      ]);

      if (orderResponse.error) throw orderResponse.error;
      if (itemsResponse.error) throw itemsResponse.error;

      const orderData = orderResponse.data;
      const orderItems = itemsResponse.data;

      // Store original order items
      this.originalOrderItems = orderItems.map((item) => ({
        code_colour: item.item_name,
        scolour: item.oicolour,
        oiprice: item.oiprice,
        oisales: item.oisales,
        pack_unit: item.inventory.pack_unit,
        order_qty: item.order_qty,
        total_pieces:
          item.inventory.item_status?.toUpperCase() === "SOLD OUT"
            ? 0
            : item.order_qty * parseInt(item.inventory.pack_unit),
        status:
          item.inventory.item_status?.toUpperCase() === "SOLD OUT"
            ? "SOLD OUT"
            : item.order_item_status || "ACTIVE",
        isOriginal: true,
      }));

      // Initialize tempOrderList with existing items
      this.tempOrderList = [...this.originalOrderItems];

      // Initialize empty arrays
      this.tempStockChanges = [];
      this.orderChanges = [];

      const agentState = (orderData.agent_state || "").toLowerCase();
      console.log("Fetched agent_state:", agentState);

      // Generate and set form HTML
      form.innerHTML = `
        Boho & Primrose Updating:
        <div class="editwholesaleorder-form">
          <div class="editwholesaleorder-section">
            <div class="editwholesaleorder-row">
              <div class="editwholesaleorder-group" style="display:flex; flex-direction: row; justify-content: center; align-items: center; width: 300px">
                        <label style="text-align:left; display: block; width: 400px"">Customer Name</label>
                        <input type="text" style="text-align:left; display: block; width: 400px" 
                          value="${orderData.customer_name || ""}" disabled>
                    </div>
              <div class="editwholesaleorder-group" style="display:flex; flex-direction: row; justify-content: center; align-items: center">
                      <label for="agent_state" style="text-align:center; display: block; width: 15000px">Agent State</label>
                      <select id="agent_state" required style="width: 200px; color:blue">
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
              <div class="editwholesaleorder-group" style="display:flex; flex-direction: row; justify-content: center; align-items: center">
                        <label style="text-align:left; display: block; width: 60px">Invoice#</label>
                        <input type="text" style="text-align:left; display: block; width: 90px" maxlength="10" 
                          value="${orderData.invoice_no || ""}">
                    </div>
                </div>
            <div class="editwholesaleorder-group" style="display:flex; flex-direction: row; justify-content: center; align-items: center">
                    <label for="order_note" style="text-align:left; display: block; width: 100px">Order Note</label>
              <textarea style="color:red" id="order_note" rows="1" placeholder="Add note for this order">${
                orderData.order_note || ""
              }</textarea>
                </div>
            </div>

            <!-- Order List Table -->
            <div class="editwholesaleorder-table-container">
                    <h3>Order List</h3>
              <div class="table-actions">
                    <h3 style="text-align:left">Order List</h3>
                <button style="text-align:right" onclick="editWholesaleOrder.removeAllItems()" class="editwholesaleorder-btn-secondary">
                  Remove All
                </button>
              </div>
              <table id="orderListTable" class="editwholesaleorder-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Colour</th>
                                <th>Unit/P</th>
                                <th>Packs</th>
                                <th>T-Pieces</th>
                                <th>Sales</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <!-- Order Changes Table -->
            <div class="editwholesaleorder-table-container">
                    <h3>Order Changes</h3>
              <table id="orderChangesTable" class="editwholesaleorder-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Item Code</th>
                                <th>Colour</th>
                                <th>Status</th>
                                <th>Change Type</th>
                                <th>Old Value</th>
                                <th>New Value</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

          <div class="editwholesaleorder-actions">
            <button type="button" class="editwholesaleorder-btn editwholesaleorder-btn-secondary" onclick="document.getElementById('editWholesaleOrderModal').style.display='none'">Cancel</button>
            <button type="submit" class="editwholesaleorder-btn editwholesaleorder-btn-primary">Update Order</button>
            </div>
        </div>
    `;

      this.setupEventListeners();

      // Update tables with initial data
      this.updateTables();
    } catch (error) {
      console.error("Error initializing order:", error);
      alert("Error loading order data. Please try again.");
    }
  }

  setupEventListeners() {
    const form = document.getElementById("editWholesaleOrderForm");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.updateOrder();
    });

    // Setup search input handler
    this.searchInput = document.getElementById("itemSearch");
    this.suggestionsList = document.getElementById("suggestions");

    this.searchInput?.addEventListener("input", (e) => {
      // Format the input value
      const searchTerm = this.formatInput(e.target.value);
      if (searchTerm !== e.target.value) {
        e.target.value = searchTerm;
      }
      this.searchItems(searchTerm);
    });

    // Setup input formatting for all text inputs
    this.setupAllInputFormatting();

    // Add order quantity input setup
    this.setupOrderQuantityInput();
  }

  async searchItems(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
      this.suggestionsList.innerHTML = "";
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .or(`code_colour.ilike.%${searchTerm}%,item_name.ilike.%${searchTerm}%`)
        .in("item_group", ["BOHO", "PRIMROSE"])
        .order("code_colour", { ascending: true })
        .limit(10);

      if (error) throw error;

      this.showSuggestions(data);
    } catch (error) {
      console.error("Error searching items:", error);
    }
  }

  showSuggestions(items) {
    if (!this.suggestionsList) return;

    this.suggestionsList.innerHTML = items
      .map(
        (item) => `
          <div class="editwholesaleorder-suggestion-item" onclick="editWholesaleOrder.selectItem('${
            item.code_colour
          }')">
            <div class="suggestion-main">${this.formatInput(
              item.code_colour
            )} - ${this.formatInput(item.item_name)}</div>
        <div class="suggestion-details">
              <span class="group-tag">${this.formatInput(
                item.item_group
              )}</span>
              <span class="stock-tag">Stock: ${String(
                item.stock_qty || 0
              )}</span>
              <span class="status-tag">${this.formatInput(
                item.item_status || "N/A"
              )}</span>
        </div>
      </div>
    `
      )
      .join("");
  }

  async selectItem(code) {
    try {
      const { data: item, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq("code_colour", code)
        .single();

      if (error) throw error;

      // Check if item exists in tempStockChanges to get remaining stock
      const stockChange = this.tempStockChanges.find(
        (change) => change.code_colour === code
      );

      if (stockChange) {
        item.stock_qty = stockChange.remaining_stock; // Use remaining stock if exists
      }

      this.selectedItem = item;
      this.displaySelectedItem(item);
    } catch (error) {
      console.error("Error selecting item:", error);
    }
  }

  displaySelectedItem(item) {
    const selectedItemInfo = document.getElementById("selectedItemInfo");
    selectedItemInfo.style.display = "block";

    document.getElementById("selectedItemCode").value = this.formatInput(
      item.code_colour
    );
    document.getElementById("selectedItemName").value = this.formatInput(
      item.item_name
    );
    document.getElementById("selectedItemStatus").value = this.formatInput(
      item.item_status
    );
    document.getElementById("selectedItemPackUnit").value = String(
      item.pack_unit || ""
    );
    document.getElementById("selectedItemStock").value = String(
      item.stock_qty || "0"
    );

    // Clear search
    this.searchInput.value = "";
    this.suggestionsList.innerHTML = "";
  }

  async updateOrder() {
    try {
      // Get form values with correct column names and convert to uppercase
      const orderUpdate = {
        agent_state: document.getElementById("agent_state").value.toUpperCase(),
        order_note: document.getElementById("order_note")
          .value.trim().toUpperCase(),
        updated_at: new Date().toISOString(),
      };

      // Calculate number of unique items removed (not their quantities)
      const removedItems = new Set(
        this.orderChanges
          .filter((change) => change.change_type.includes("removed"))
          .map((change) => change.code_colour)
      ).size;

      // Add removed items count to order update
      orderUpdate.removed_items = removedItems;

      // Start transaction
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update(orderUpdate)
        .eq("id", this.orderId);

      if (orderError) throw orderError;

      // Handle removed items
      for (const change of this.orderChanges.filter((c) =>
        c.change_type.includes("removed")
      )) {
        // Get current inventory status
        const { data: inventoryItem, error: invError } = await supabaseClient
          .from("inventory")
          .select("item_status, stock_qty")
          .eq("code_colour", change.code_colour)
          .single();

        if (invError) throw invError;

        // Update order_items with removed status
        const { error: itemError } = await supabaseClient
          .from("order_items")
          .update({ order_item_status: "REMOVED" })
          .eq("order_id", this.orderId)
          .eq("item_name", change.code_colour);

        if (itemError) throw itemError;

        // Update inventory stock and status if needed
        const newStockQty = inventoryItem.stock_qty + change.old_value;
        const updates = {
          stock_qty: newStockQty,
        };

        // If current stock is 0, also update status to CANCELLED RESTOCK
        if (inventoryItem.stock_qty === 0) {
          updates.item_status = "CANCELLED RESTOCK";
        }

        const { error: stockError } = await supabaseClient
          .from("inventory")
          .update(updates)
          .eq("code_colour", change.code_colour);

        if (stockError) throw stockError;
      }

      // Close modal and refresh page
      document.getElementById("editWholesaleOrderModal").style.display = "none";
      window.location.reload();
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
  }

  setupAllInputFormatting() {
    // Format dispatched box input
    const dispatchedBoxInput = document.getElementById("dispatched_box");
    this.setupInputFormatting(dispatchedBoxInput);

    // Format order note textarea
    const orderNoteInput = document.getElementById("order_note");
    this.setupInputFormatting(orderNoteInput);

    // Format search input
    this.setupInputFormatting(this.searchInput);
  }

  validateOrderQuantity(quantity, packUnit, itemStatus) {
    const qty = parseFloat(quantity);
    const pack = parseInt(packUnit);

    // Basic validation
    if (isNaN(qty) || qty < 0.5) {
      return { valid: false, message: "Minimum order quantity is 0.5" };
    }

    // Check if quantity is not a multiple of 0.5
    if (qty % 0.5 !== 0) {
      return { valid: false, message: "Quantity must be in multiples of 0.5" };
    }

    // If trying to order half pack (e.g., 1.5, 2.5, etc.)
    if (qty % 1 !== 0) {
      // Case 1: Pack unit not divisible by 2 - don't allow half packs
      if (pack % 2 !== 0) {
        return {
          valid: false,
          message: `Half packs not allowed for items with pack unit of ${pack}`,
        };
      }

      // Case 2: Pack unit = 8 and status is ON SALE
      if (pack === 8 && itemStatus?.toUpperCase() === "ON SALE") {
        return {
          valid: true,
          warning:
            "Warning: Half pack order for sale item with pack unit 8. Please consult warehouse staff.",
        };
      }

      // Case 3: Pack unit divisible by 2 but not 8
      if (pack % 2 === 0 && pack !== 8) {
        return {
          valid: true,
          warning: `Warning: Half pack order for pack unit ${pack}. Please consult warehouse staff.`,
        };
      }
    }

    return { valid: true };
  }

  async addItemToOrder() {
    if (!this.selectedItem) return;

    const orderQty = parseFloat(document.getElementById("orderQty").value);
    const validation = this.validateOrderQuantity(
      orderQty,
      this.selectedItem.pack_unit,
      this.selectedItem.item_status
    );

    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    if (validation.warning) {
      if (!confirm(`${validation.warning}\nDo you want to continue?`)) {
        return;
      }
    }

    // Check stock availability
    const isOutOfStock =
      this.selectedItem.stock_qty <= 0 ||
      this.selectedItem.item_status?.toUpperCase() === "SOLD OUT";

    if (isOutOfStock) {
      const confirmAdd = confirm(
        "Warning: This item is out of stock. Please check warehouse for remaining packs.\n" +
          "Do you want to continue adding this item?"
      );
      if (!confirmAdd) return;
    }

    // Find existing item in order list
    const existingItemIndex = this.tempOrderList.findIndex(
      (item) => item.code_colour === this.selectedItem.code_colour
    );

    // Record old quantity for change tracking
    const oldQty =
      existingItemIndex !== -1
        ? this.tempOrderList[existingItemIndex].order_qty
        : 0;

    if (existingItemIndex !== -1) {
      // Update existing item quantity
      this.tempOrderList[existingItemIndex].order_qty += orderQty;
      if (isOutOfStock) {
        this.tempOrderList[existingItemIndex].status = "SOLD OUT";
        this.tempOrderList[existingItemIndex].total_pieces = 0;
      }
    } else {
      // Add new item
      this.tempOrderList.push({
        code_colour: this.selectedItem.code_colour,
        oicolour: this.selectedItem.oicolour,
        invoice_no: this.selectedItem.invoice_no,
        sprice: this.selectedItem.sprice,
        swsp2: this.selectedItem.swsp2,
        pack_unit: this.selectedItem.pack_unit,
        order_qty: orderQty,
        total_pieces: isOutOfStock
          ? 0
          : orderQty * parseInt(this.selectedItem.pack_unit),
        status: isOutOfStock ? "SOLD OUT" : "ACTIVE",
      });
    }

    // Update stock changes
    this.updateStockChanges(
      this.selectedItem.code_colour,
      orderQty,
      isOutOfStock
    );

    // Record the change
    this.orderChanges.push({
      time: new Date().toISOString(),
      code_colour: this.selectedItem.code_colour,
      oicolour: this.selectedItem.oicolour,
      status: this.selectedItem.item_status,
      change_type: existingItemIndex !== -1 ? "quantity_added" : "item_added",
      old_value: oldQty,
      new_value:
        existingItemIndex !== -1
          ? this.tempOrderList[existingItemIndex].order_qty
          : orderQty,
    });

    this.updateTables();

    // Clear selection
    document.getElementById("selectedItemInfo").style.display = "none";
    this.selectedItem = null;
  }

  async removeItem(code) {
    const itemIndex = this.tempOrderList.findIndex(
      (item) => item.code_colour === code
    );
    if (itemIndex === -1) return;

    const removedItem = this.tempOrderList[itemIndex];

    // Record the change
    this.orderChanges.push({
      time: new Date().toISOString(),
      code_colour: code,
      oicolour: code,
      status: removedItem.status,
      change_type: removedItem.isOriginal
        ? "original_item_removed"
        : "item_removed",
      old_value: removedItem.order_qty,
      new_value: 0,
    });

    // Remove from order list
    this.tempOrderList.splice(itemIndex, 1);

    // Update tables
    this.updateTables();
  }

  removeAllItems() {
    if (
      !confirm("Are you sure you want to remove all items from this order?")
    ) {
      return;
    }

    // Record all removals
    this.tempOrderList.forEach((item) => {
      this.orderChanges.push({
        time: new Date().toISOString(),
        code_colour: item.code_colour,
        scolour: item.scolour,
        status: item.status,
        change_type: item.isOriginal ? "original_item_removed" : "item_removed",
        old_value: item.order_qty,
        new_value: 0,
      });
    });

    // Clear the order list
    this.tempOrderList = [];

    // Update tables
    this.updateTables();
  }

  async submitOrder() {
    try {
      // Update order details
      const orderUpdate = {
        agent_state: document.getElementById("agent_state").value.toLowerCase(),
        dispatched_box: this.formatInput(
          document.getElementById("dispatched_box").value
        ),
        dispatched_date: document.getElementById("dispatched_date").value,
        order_note: this.formatInput(
          document.getElementById("order_note").value
        ),
        updated_at: new Date().toISOString(),
      };

      // Update orders table
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update(orderUpdate)
        .eq("id", this.orderId);

      if (orderError) throw orderError;

      // Get list of removed original items
      const removedOriginalItems = this.originalOrderItems
        .filter(
          (original) =>
            !this.tempOrderList.some(
              (temp) =>
                temp.code_colour === original.code_colour && temp.isOriginal
            )
        )
        .map((item) => item.code_colour);

      // Delete removed original items
      if (removedOriginalItems.length > 0) {
        const { error: deleteError } = await supabaseClient
          .from("order_items")
          .delete()
          .eq("order_id", this.orderId)
          .in("item_name", removedOriginalItems);

        if (deleteError) throw deleteError;
      }

      // Update remaining and new items
      for (const item of this.tempOrderList) {
        const { error: itemError } = await supabaseClient
          .from("order_items")
          .upsert({
            order_id: this.orderId,
            item_name: item.code_colour,
            oicolour: item.scolour,
            oiprice: this.swsp2,
            order_qty: item.order_qty,
            pack_unit: item.pack_unit,
            order_item_status: item.status,
          });

        if (itemError) throw itemError;
      }

      // Update inventory stock only at submission
      for (const change of this.tempStockChanges) {
        const { error: stockError } = await supabaseClient
          .from("inventory")
          .update({
            stock_qty: change.remaining_stock,
            item_status: change.status_change || change.current_status,
          })
          .eq("code_colour", change.code_colour);

        if (stockError) throw stockError;
      }

      // Close modal and refresh order list
      document.getElementById("editWholesaleOrderModal").style.display = "none";
      if (window.adminOrder) {
        await window.adminOrder.loadOrders();
      }

      alert("Order updated successfully!");
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
  }

  updateStockChanges(code, qty, isOutOfStock) {
    // Only update stock changes when adding items (qty > 0)
    if (qty <= 0) return;

    const existingChange = this.tempStockChanges.find(
      (change) => change.code_colour === code
    );

    if (existingChange) {
      existingChange.remaining_stock = isOutOfStock
        ? 0
        : Math.max(0, existingChange.remaining_stock - qty);
    } else {
      const initialStock = this.selectedItem.stock_qty;
      this.tempStockChanges.push({
        code_colour: code,
        initial_stock: initialStock,
        remaining_stock: isOutOfStock ? 0 : Math.max(0, initialStock - qty),
        current_status: this.selectedItem.item_status,
        status_change: isOutOfStock ? "SOLD OUT" : null,
      });
    }
  }

  updateStockChangesTable() {
    const stockChangesBody = document.querySelector("#stockChangesTable tbody");
    if (!stockChangesBody) return;

    stockChangesBody.innerHTML = this.tempStockChanges.length
      ? this.tempStockChanges
          .map(
            (change) => `
        <tr>
          <td>${change.code_colour}</td>
          <td>${change.initial_stock}</td>
          <td>${change.remaining_stock}</td>
          <td>${change.current_status}</td>
          <td>${change.status_change || "No change"}</td>
        </tr>
      `
          )
          .join("")
      : '<tr><td colspan="5" class="empty-message">No stock changes</td></tr>';
  }

  updateTables() {
    const emptyMessage =
      '<tr><td colspan="6" class="empty-message">No items in order</td></tr>';

    // Update Order List Table
    const orderListBody = document.querySelector("#orderListTable tbody");
    if (orderListBody) {
      orderListBody.innerHTML = this.tempOrderList.length
        ? this.tempOrderList
            .map(
              (item) => `
          <tr>
            <td>${item.code_colour}</td>
            <td>${item.scolour}</td>
            <td>${item.pack_unit}</td>
            <td>${item.order_qty}</td>
            <td>${item.total_pieces}</td>
            <td>${item.oisales}</td>
            <td>${item.oiprice}</td>
            <td>${item.status}</td>
            <td>
              <button onclick="editWholesaleOrder.removeItem('${item.code_colour}')" 
                      class="editwholesaleorder-btn-secondary">
                Remove
              </button>
            </td>
          </tr>
        `
            )
            .join("")
        : emptyMessage;
    }

    // Update Order Changes Table
    const orderChangesBody = document.querySelector("#orderChangesTable tbody");
    if (orderChangesBody) {
      orderChangesBody.innerHTML = this.orderChanges.length
        ? this.orderChanges
            .map(
              (change, index) => `
          <tr>
            <td>${new Date(change.time).toLocaleString()}</td>
            <td>${change.code_colour}</td>
            <td>${change.scolour}</td>
            <td>${change.status || "ACTIVE"}</td>
            <td>${change.change_type}</td>
            <td>${change.old_value}</td>
            <td>${change.new_value}</td>
            <td>
              ${
                index === this.orderChanges.length - 1
                  ? `<button onclick="editWholesaleOrder.undoChange(${index})"
                         class="editwholesaleorder-btn-secondary">
                    Undo
                  </button>`
                  : ""
              }
            </td>
          </tr>
        `
            )
            .join("")
        : '<tr><td colspan="8" class="empty-message">No changes recorded</td></tr>';
    }
  }

  setupOrderQuantityInput() {
    const orderQtyInput = document.getElementById("orderQty");
    if (!orderQtyInput) return;

    orderQtyInput.addEventListener("input", (e) => {
      let value = e.target.value;

      // Remove any non-numeric characters except decimal point
      value = value.replace(/[^0-9.]/g, "");

      // Ensure only one decimal point
      const decimalCount = (value.match(/\./g) || []).length;
      if (decimalCount > 1) {
        value = value.replace(/\.+$/, "");
      }

      // Round to nearest 0.5
      if (value !== "") {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          value = Math.round(numValue * 2) / 2;
        }
      }

      // Ensure minimum value of 0.5
      if (value !== "" && parseFloat(value) < 0.5) {
        value = "0.5";
      }

      e.target.value = value;
    });

    // Add blur event to format final value
    orderQtyInput.addEventListener("blur", (e) => {
      let value = e.target.value;
      if (value === "" || isNaN(parseFloat(value))) {
        e.target.value = "0.5";
      }
    });
  }

  async undoChange(index) {
    const change = this.orderChanges[index];
    if (!change) return;

    if (change.change_type.includes("removed")) {
      // Get the original item data
      const originalItem = this.originalOrderItems.find(
        (item) => item.code_colour === change.code_colour
      );

      if (originalItem) {
        // Re-add the item to the order list
        this.tempOrderList.push({
          ...originalItem,
          order_qty: change.old_value,
        });
      }
    }

    // Remove this change and all subsequent changes
    this.orderChanges = this.orderChanges.slice(0, index);

    // Update tables
    this.updateTables();
  }
}

// Initialize
let editWholesaleOrder;
document.addEventListener("DOMContentLoaded", () => {
  editWholesaleOrder = new EditWholesaleOrder();
  window.editWholesaleOrder = editWholesaleOrder;
});
