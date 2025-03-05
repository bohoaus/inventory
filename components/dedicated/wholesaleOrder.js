//this one is ok-2025.03.05

class WholesaleOrder {
  constructor() {
    this.orderType = "wholesale";
    this.tempOrderList = [];
    this.tempStockChanges = [];
    this.searchInput = null;
    this.suggestionsList = null;
    this.orderListTable = null;
    this.stockChangesTable = null;
  }

  initialize() {
    const form = document.getElementById("wholesaleOrderForm");
    if (!form) {
      console.error("Wholesale order form not found");
      return;
    }

    form.innerHTML = this.generateFormHTML();

    // Initialize elements after HTML is added
    this.searchInput = document.getElementById("itemSearch");
    this.suggestionsList = document.getElementById("suggestions");
    this.orderListTable = document.getElementById("orderListTable");
    this.stockChangesTable = document.getElementById("stockChangesTable");

    // Make wholesaleOrder globally available
    window.wholesaleOrder = this;

    if (!this.searchInput || !this.orderListTable || !this.stockChangesTable) {
      console.error("Required elements not found");
      return;
    }

    this.setupEventListeners();
  }

  generateFormHTML() {
    return `
            <div class="wholesale-form">
                <div class="customer-info">
                    <div class="form-group">
                        <label for="customer_name">Customer Name</label>
                        <input type="text" id="customer_name" required style="width: 350px" maxlength="30">
                        <div id="customerWarning" class="warning-message"></div>
                    </div>
                    <div class="form-group" style="width: 100px">
                        <label for="orderdate" required>Order Date</label>
                        <input type="Date" id="orderdate" style="width: 100px">
                    </div>
                     <div class="form-group" style="width: 120px">
                        <label for="agent_state">Agent State</label>
                        <select id="agent_state" required style="width: 120px">
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
                    <div class="form-group" style="width: 100px">
                        <label for="opo">PPO#</label>
                        <input style="width: 90px" type="text" id="opo" placeholder="PO#" value="PO#" maxlength="15">
                    </div>
                    <div class="form-group" style="width: 100px">
                        <label for="osite">Location</label>
                        <input style="width: 90px" type="text" id="osite" placeholder="Floor" value="Floor" maxlength="10">
                    </div>
                    <div class="form-group">
                        <label for="dispatched_box">Boxes</label>
                        <input style="width: 30px" type="text" id="dispatched_box" value="1" maxlength="3">
                    </div>
                    <div class="form-group">
                        <label for="invoice_no">Invoice#</label>
                        <input style="width: 80px" type="text" id="invoice_no" value="12171300" maxlength="10">
                    </div>
                </div>

                <div class="customer-info">
                  <div class="item-search">
                    <div class="form-group">
                        <label for="itemSearch">Search Item</label>
                        <input style="width: 300px" maxlength="20" type="text" 
                               id="itemSearch"
                               placeholder="Enter item code or name">
                        <div id="suggestions" class="suggestions-dropdown"></div>
                    </div>
                  </div>
                  
                    <div class="form-group">
                      <label for="ocountry">Country</label>
                      <select name="ocountry" style="width: 120px">
                        <option value="AUS+61" selected>AUS+61</option>
                        <option value="NZL+64">NZL+64</option>
                        <option value="Samoa+685">Samoa+685</option>
                      </select>
                    </div>                 

                  <div class="form-group">
                    <label for="order_note">Order Note</label>
                    <input style="width: 400px" maxlength="50" type="text" id="order_note" placeholder="Add note for this order" value="OK">
                  </div>
                </div>

                <div class="selected-item-details" id="selectedItemDetails" style="display: none;">
                    <h3>Selected Item Details</h3>
                    <div class="item-info-grid">
                        <div class="info-card">
                            <label>Item Code</label>
                            <span id="itemCode" class="info-value"></span>
                        </div>
                        <div class="info-card">
                            <label>Colour</label>
                            <span id="itemColour" class="info-value"></span>
                        </div>
                        <div class="info-card">
                            <label>Item Name</label>
                            <span id="itemName" class="info-value"></span>
                        </div>
                        <div class="info-card">
                            <label>Status</label>
                            <span id="itemStatus" class="info-value"></span>
                        </div>
                        <div class="info-card">
                            <label>Unit/P</label>
                            <span id="packUnit" class="info-value"></span>
                        </div>
                        <div class="info-card">
                            <label>OnHand</label>
                            <span id="onHand" class="info-value"></span>
                        </div>
                    </div>
                    <div class="qty-input">
                        <label for="orderQty">Order Quantity</label>
                        <input type="number" id="orderQty" min="0" step="0.5" style="height: 25px; font-size: 15px; padding-left: 5px;" maxlength="3">
                        <button type="button" id="addToOrder">Add to Order</button>
                    </div>
                    <div id="qtyWarning" class="warning-message"></div>
                </div>

                <div class="order-tables">
                    <div class="stock-changes">
                        <h3>Stock Changes</h3>
                        <table id="stockChangesTable">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Colour</th>
                                    <th>Category</th>
                                    <th>RemainingStock</th>
                                    <th>CurrentStatus</th>
                                    <th>StatusChange</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>

                    <div class="order-list">
                        <h3>Order List</h3>
                        <table id="orderListTable">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Colour</th>
                                    <th>Category</th>
                                    <th>Unit/P</th>
                                    <th>Packs</th>
                                    <th>T-Pieces</th>
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
        `;
  }

  async searchItems(searchTerm) {
    try {
      const { data, error } = await supabaseClient
        .from("inventory")
        .select("*")
        .or(`code_colour.ilike.%${searchTerm}%,item_name.ilike.%${searchTerm}%`)
        .in("item_group", ["BOHO", "PRIMROSE"])
        .order("code_colour", { ascending: true })
        .limit(18);

      if (error) {
        console.error("Error searching items:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error searching items:", error);
      return [];
    }
  }

  showItemSuggestions(items) {
    this.suggestionsList.innerHTML = "";
    this.suggestionsList.style.display = "block";

    if (items.length === 0) {
      const div = document.createElement("div");
      div.className = "suggestion-item no-results";
      div.textContent = "No items found";
      this.suggestionsList.appendChild(div);
    } else {
      items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.innerHTML = `
                <div class="item-code">${item.code_colour}</div>
            `;
        div.addEventListener("click", () => this.selectItem(item));
        this.suggestionsList.appendChild(div);
      });
    }
  }

  selectItem(item) {
    // Calculate available stock by checking order list
    let orderedQty = 0;
    const existingOrder = this.tempOrderList.find(
      (order) => order.code_colour === item.code_colour
    );
    if (existingOrder) {
      orderedQty = existingOrder.orderQty;
    }

    const availableStock = item.stock_qty - orderedQty;

    document.getElementById("selectedItemDetails").style.display = "block";
    document.getElementById("itemCode").textContent = item.code_colour || "";
    document.getElementById("itemColour").textContent = item.scolour || "";
    document.getElementById("itemName").textContent = item.item_name || "";
    document.getElementById("itemStatus").textContent = item.item_status || "";
    document.getElementById("packUnit").textContent = item.pack_unit || "";
    document.getElementById("onHand").textContent = availableStock;

    this.suggestionsList.style.display = "none";
    this.searchInput.value = item.code_colour || "";
    this.selectedItem = {
      ...item,
      stock_qty: availableStock, // Update available stock
    };
  }

  validateOrderQty(qty) {
    const packUnit = this.selectedItem.pack_unit;
    const status = this.selectedItem.item_status.toLowerCase();
    const isHalfPack = qty % 1 !== 0;
    const availableStock = this.selectedItem.stock_qty;

    if (qty <= 0) {
      return { valid: false, message: "Quantity must be greater than 0" };
    }

    // Allow out of stock items to be added regardless of stock quantity
    if (status === "out of stock") {
      if (isHalfPack && packUnit % 2 !== 0) {
        return {
          valid: false,
          message: "This item cannot be sold in half packs",
        };
      }
      return {
        valid: true,
        needsConfirmation: true,
        message:
          "This item is out of stock. Please confirm with warehouse for availability.",
      };
    }

    // For non-out-of-stock items, check stock quantity
    if (qty > availableStock) {
      return {
        valid: false,
        message: `Not enough stock. Available: ${availableStock}`,
      };
    }

    // Half pack validations
    if (isHalfPack && packUnit % 2 !== 0) {
      return {
        valid: false,
        message: "This item cannot be sold in half packs",
      };
    }

    if (isHalfPack && packUnit % 2 === 0 && packUnit !== 8) {
      return {
        valid: true,
        needsConfirmation: true,
        message: `Please confirm with office staff for ${packUnit} / PACK style half pack sales`,
      };
    }

    if (packUnit === 8 && status === "on sale" && isHalfPack) {
      return {
        valid: true,
        needsConfirmation: true,
        message:
          "Please confirm with office staff for half pack sales of ON SALE items",
      };
    }

    return { valid: true };
  }

  addToOrderList() {
    const qty = parseFloat(document.getElementById("orderQty").value);
    const validation = this.validateOrderQty(qty);

    if (!validation.valid) {
      this.showWarning(validation.message);
      return;
    }

    if (
      validation.needsConfirmation &&
      !confirm(validation.message + "\nClick OK to confirm and add to order.")
    ) {
      return;
    }

    const isOutOfStock =
      this.selectedItem.item_status.toLowerCase() === "out of stock";
    const newStock = isOutOfStock ? 0 : this.selectedItem.stock_qty - qty;

    // Add or update order list
    const existingOrderIndex = this.tempOrderList.findIndex(
      (order) => order.code_colour === this.selectedItem.code_colour
    );

    if (existingOrderIndex !== -1) {
      // Update existing order
      this.tempOrderList[existingOrderIndex].orderQty += qty;
      this.tempOrderList[existingOrderIndex].stock_qty = newStock;
      this.tempOrderList[existingOrderIndex].totalPieces = isOutOfStock
        ? 0
        : this.selectedItem.pack_unit *
          this.tempOrderList[existingOrderIndex].orderQty;
    } else {
      // Add new order entry
      this.tempOrderList.push({
        ...this.selectedItem,
        orderQty: qty,
        stock_qty: newStock,
        totalPieces: isOutOfStock ? 0 : this.selectedItem.pack_unit * qty,
      });
    }

    this.updateTables();
    this.clearItemSelection();
  }

  updateTables() {
    try {
      // Check if tables exist and have tbody
      const stockChangesBody = this.stockChangesTable?.querySelector("tbody");
      const orderListBody = this.orderListTable?.querySelector("tbody");

      if (!stockChangesBody || !orderListBody) {
        console.error("Table bodies not found");
        return;
      }

      // Update order list table
      orderListBody.innerHTML = this.tempOrderList
        .map((item, index) => {
          const isOutOfStock =
            item.item_status.toLowerCase() === "out of stock";
          return `
                    <tr>
                        <td>${item.code_colour}</td>
                        <td>${item.scolour}</td>
                        <td>${item.item_name}</td>
                        <td>${item.pack_unit}</td>
                        <td>${item.orderQty}</td>
                        <td>${
                          isOutOfStock ? 0 : item.pack_unit * item.orderQty
                        }</td>
                        <td>
                            <button onclick="window.wholesaleOrder.removeItem(${index})" class="remove-btn">Remove</button>
                        </td>
                    </tr>
                `;
        })
        .join("");

      // Update stock changes table
      stockChangesBody.innerHTML = this.tempOrderList
        .map((item) => {
          const isOutOfStock =
            item.item_status.toLowerCase() === "out of stock";
          const newStock = item.stock_qty;
          return `
                    <tr>
                        <td>${item.code_colour}</td>
                        <td>${item.scolour}</td>
                        <td>${item.item_category}</td>
                        <td>${newStock}</td>
                        <td>${item.item_status}</td>
                        <td>${
                          isOutOfStock
                            ? ""
                            : newStock <= 0
                            ? "Out of Stock"
                            : "-"
                        }</td>
                    </tr>
                `;
        })
        .join("");
    } catch (error) {
      console.error("Error updating tables:", error);
    }
  }

  setupEventListeners() {
    // Customer name input handler
    const customerNameInput = document.getElementById("customer_name");
    const submitButton = document.getElementById("submitOrder");

    if (customerNameInput) {
      const handleCustomerNameChange = async (e) => {
        let value = e.target.value.toUpperCase().replace(/\s+/g, " "); // Replace multiple spaces with single space

        e.target.value = value;

        if (value) {
          await this.checkExistingOrders(value.trim());
        } else {
          document.getElementById("customerWarning").style.display = "none";
        }

        this.updateSubmitButtonState();
      };

      // Add debounce to prevent too many database queries
      let timeout;
      customerNameInput.addEventListener("input", (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => handleCustomerNameChange(e), 300);
      });
    }

    // Search input handler
    if (this.searchInput) {
      let searchTimeout;
      this.searchInput.addEventListener("input", async (e) => {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.toUpperCase();

        if (searchTerm.length >= 2) {
          searchTimeout = setTimeout(async () => {
            const items = await this.searchItems(searchTerm);
            this.showItemSuggestions(items);
          }, 300);
        } else {
          this.suggestionsList.style.display = "none";
        }
      });
    }

    // Close suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !this.searchInput.contains(e.target) &&
        !this.suggestionsList.contains(e.target)
      ) {
        this.suggestionsList.style.display = "none";
      }
    });

    // Add to order button handler
    document.getElementById("addToOrder").addEventListener("click", () => {
      this.addToOrderList();
      this.updateSubmitButtonState();
    });

    // Remove all items button handler
    document.getElementById("removeAllItems").addEventListener("click", () => {
      if (confirm("Are you sure you want to remove all items?")) {
        this.tempOrderList = [];
        this.tempStockChanges = [];
        this.updateTables();
        this.updateSubmitButtonState();
      }
    });

    // Submit order handler
    document
      .getElementById("submitOrder")
      .addEventListener("click", async (e) => {
        e.preventDefault();
        await this.submitOrder();
      });

    // Add agent state change listener
    const agentStateSelect = document.getElementById("agent_state");
    agentStateSelect.addEventListener("change", () => {
      this.updateSubmitButtonState();
    });
  }

  removeItem(index) {
    // Only remove from order list
    this.tempOrderList.splice(index, 1);
    this.updateTables();
    this.updateSubmitButtonState();
  }

  clearItemSelection() {
    this.searchInput.value = "";
    document.getElementById("selectedItemDetails").style.display = "none";
    document.getElementById("orderQty").value = "";
    document.getElementById("qtyWarning").textContent = "";
    this.selectedItem = null;
  }

  showWarning(message) {
    const warning = document.getElementById("qtyWarning");
    warning.textContent = message;
    warning.style.display = "block";
  }

  async submitOrder() {
    try {
      const orderDate = document
        .getElementById("orderdate").value || null;
      const customerName = document
        .getElementById("customer_name")
        .value.trim().toUpperCase();
      const orderPPO = document
        .getElementById("opo").value || null;
      const orderCountry = document
        .getElementById("ocountry").value || null;
      const orderBox = document
        .getElementById("dispatched_box").value || null;
      const orderInvoice = document
        .getElementById("invoice_no").value || null;
      const orderLocation = document
        .getElementById("osite").value || null;
      const agentState = document
        .getElementById("agent_state")
        .value.toUpperCase();
      const orderNote = document
        .getElementById("order_note")
        .value.trim().toUpperCase();
      const totalItems = this.tempOrderList.length;

      // Create new order with uppercase values
      const { data: orderData, error: orderError } = await supabaseClient
        .from("orders")
        .insert([
          {
            orderdate: orderDate,
            opo: orderPPO,
            ocountry: orderCountry,
            osite: orderLocation,
            dispatched_box: orderBox,
            invoice_no: orderInvoice,
            customer_name: customerName,
            agent_state: agentState,
            total_items: totalItems,
            order_note: orderNote,
            order_type: "WHOLESALE",
            status: "PICKING",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items with appropriate status - jim's 
      const orderItems = this.tempOrderList.map((item) => {
        const isOutOfStock =
          item.item_status.toLowerCase() === "out of stock" ||
          item.pack_unit * item.orderQty === 0;

        return {
          order_id: orderData.id,
          item_name: item.code_colour.toUpperCase(),
          order_qty: item.orderQty,
          total_pieces: isOutOfStock ? 0 : item.pack_unit * item.orderQty,
          order_item_status: isOutOfStock ? "SOLD OUT" : "ACTIVE",
          oicolour: item.scolour,
          oiprice: item.swsp2,
          oisales: item.sprice,
          oifabric: item.sfabric,
          oicategory: item.item_name,
        };
      });

      const { error: itemsError } = await supabaseClient
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update inventory
      for (const item of this.tempOrderList) {
        const updates = {
          stock_qty: item.stock_qty,
        };

        // Check if status needs to be updated
        if (
          item.stock_qty <= 0 &&
          item.item_status.toLowerCase() !== "out of stock"
        ) {
          updates.soldout_status = item.item_status;
          updates.item_status = "OUT OF STOCK";
          updates.soldout_date = new Date().toISOString();
        }

        const { error: updateError } = await supabaseClient
          .from("inventory")
          .update(updates)
          .eq("code_colour", item.code_colour);

        if (updateError) throw updateError;
      }

      // Success handling
      alert("Order submitted successfully!");

      // Close modal
      const modal = document.getElementById("wholesaleOrderModal");
      if (modal) {
        modal.style.display = "none";
      }

      // Clear form
      this.clearForm();

      // Refresh order list if adminOrder exists
      if (typeof adminOrder !== "undefined") {
        adminOrder.loadOrders();
      }

      // Refresh the current page
      window.location.reload();
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Error submitting order. Please try again.");
    }
  }

  clearForm() {
    document.getElementById("customer_name").value = "";
    document.getElementById("agent_state").value = "";
    document.getElementById("order_note").value = "";
    this.tempOrderList = [];
    this.tempStockChanges = [];
    this.updateTables();
    this.clearItemSelection();
    this.updateSubmitButtonState();
  }

  async checkExistingOrders(customerName) {
    try {
      // Get all wholesale orders for this customer
      const { data, error } = await supabaseClient
        .from("orders")
        .select(`*`)
        .ilike("order_type", "wholesale")
        .ilike("customer_name", customerName);

      if (error) throw error;

      const warning = document.getElementById("customerWarning");

      if (data && data.length > 0) {
        const pendingStatuses = [
          "PICKING",
          "AWAITING PAYMENT",
          "WHOLESALE HOLD",
        ];
        const pendingOrders = data.filter((order) => {
          return pendingStatuses.includes(order.status.toUpperCase());
        });

        if (pendingOrders.length > 0) {
          // Group orders by status and prepare detailed info
          const orderDetails = pendingOrders.map((order) => {
            // Convert UTC to Sydney time and format as date only
            const sydneyDate = new Date(order.created_at).toLocaleString(
              "en-AU",
              {
                timeZone: "Australia/Sydney",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }
            );

            return {
              date: sydneyDate,
              status: order.status.toLowerCase(),
              items: order.total_items,
            };
          });

          // Create detailed warning message
          const warningMessages = orderDetails.map(
            (detail) =>
              `Order from ${detail.date} (${detail.status}, ${detail.items} items)`
          );

          const warningMessage = `Warning: Customer "${customerName}" has pending orders:\n${warningMessages.join(
            "\n"
          )}`;

          warning.innerHTML = warningMessage.replace(/\n/g, "<br>");
          warning.style.display = "block";
          warning.style.backgroundColor = "#fff3f4";
          warning.style.color = "#dc3545";
        } else {
          warning.style.display = "none";
        }
      } else {
        warning.style.display = "none";
      }
    } catch (error) {
      console.error("Error checking orders:", error);
      const warning = document.getElementById("customerWarning");
      warning.textContent = "Error checking customer orders";
      warning.style.display = "block";
    }
  }

  updateSubmitButtonState() {
    const customerName = document.getElementById("customer_name").value.trim();
    const agentState = document.getElementById("agent_state").value;
    const submitButton = document.getElementById("submitOrder");

    // Button is disabled if any required field is empty or no items in order
    submitButton.disabled =
      !customerName || !agentState || this.tempOrderList.length === 0;
  }
}

// Initialize
let wholesaleOrder;
document.addEventListener("DOMContentLoaded", () => {
  wholesaleOrder = new WholesaleOrder();
});

//jimm-this one is ok-2025.03.05
//jimm-this one is ok-2025.02.25
