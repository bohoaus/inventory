// Initialize Supabase client
const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let selectedItem = null;
let orderItems = [];

// Function to load agent states from database
async function loadAgentStates() {
  try {
    const { data: agentStates, error } = await supabaseClient
      .from("agent_state_options")
      .select("agent_state")
      .order("agent_state");

    if (error) throw error;

    // Get both select elements
    const agentStateSelect = document.getElementById("agentState");
    const searchAgentStateSelect = document.getElementById("searchAgentState");

    // Clear existing options except the first one
    agentStateSelect.innerHTML = '<option value="">Select Agent State</option>';
    searchAgentStateSelect.innerHTML =
      '<option value="">All Agent States</option>';

    // Add new options from database
    if (agentStates) {
      agentStates.forEach(({ agent_state }) => {
        if (agent_state) {
          // Add to new order select
          const option1 = document.createElement("option");
          option1.value = agent_state;
          option1.textContent = agent_state;
          agentStateSelect.appendChild(option1);

          // Add to search select
          const option2 = document.createElement("option");
          option2.value = agent_state;
          option2.textContent = agent_state;
          searchAgentStateSelect.appendChild(option2);
        }
      });
    }
  } catch (error) {
    console.error("Error loading agent states:", error);
    alert("Error loading agent states. Please try again.");
  }
}

// Initialize the page
document.addEventListener("DOMContentLoaded", async function () {
  await loadAgentStates();
  setDefaultOrderDate();
  setupEventListeners();

  // Load initial orders
  await searchOrders();
});

// Set today's date as default order date
function setDefaultOrderDate() {
  const today = new Date();
  // Format the date in DD/MM/YYYY
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  // For database (YYYY-MM-DD format)
  const formattedDateForDB = `${year}-${month}-${day}`;

  // Set default date for new order only
  const orderDateInput = document.getElementById("orderDate");
  if (orderDateInput) {
    orderDateInput.value = formattedDateForDB;
    orderDateInput.defaultValue = formattedDateForDB;
  }

  // Don't set default date for search
  // const searchDateInput = document.getElementById("searchOrderDate");
  // if (searchDateInput) {
  //   searchDateInput.value = formattedDateForDB;
  //   searchDateInput.defaultValue = formattedDateForDB;
  // }
}

// Setup event listeners
function setupEventListeners() {
  const itemSearch = document.getElementById("itemSearch");
  const orderQuantity = document.getElementById("orderQuantity");
  const addItemBtn = document.getElementById("addItemBtn");
  const orderForm = document.getElementById("orderForm");

  // Search suggestions
  itemSearch.addEventListener("input", debounce(handleSearch, 300));

  // Order quantity calculation
  orderQuantity.addEventListener("input", calculateTotalPieces);

  // Add item to order
  addItemBtn.addEventListener("click", addItemToOrder);

  // Form submission
  orderForm.addEventListener("submit", handleOrderSubmit);

  // Add this with other event listeners
  document
    .getElementById("searchCustomer")
    .addEventListener("input", function (e) {
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.toUpperCase();
      this.setSelectionRange(start, end);
    });
}

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle item search
async function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const suggestionsDiv = document.getElementById("searchSuggestions");

  if (searchTerm.length < 2) {
    suggestionsDiv.innerHTML = "";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("inventory")
      .select('"code & colour", "item name", unit, inventory, location, status')
      .or(
        `"code & colour".ilike.%${searchTerm}%,"item name".ilike.%${searchTerm}%`
      )
      .limit(10);

    if (error) throw error;

    suggestionsDiv.innerHTML = "";
    data.forEach((item) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = `${item["code & colour"]} - ${item["item name"]}`;
      div.addEventListener("click", () => selectItem(item));
      suggestionsDiv.appendChild(div);
    });
  } catch (error) {
    console.error("Error searching items:", error);
  }
}

// Select item from suggestions
function selectItem(item) {
  selectedItem = item;
  document.getElementById(
    "itemSearch"
  ).value = `${item["code & colour"]} - ${item["item name"]}`;
  document.getElementById("searchSuggestions").innerHTML = "";
  document.getElementById(
    "selectedItem"
  ).textContent = `Selected: ${item["code & colour"]}`;
  document.getElementById("unitPerPack").textContent = item.unit || "-";
  document.getElementById("itemStatus").textContent = item.status || "-";
  document.getElementById("inventoryQty").textContent = item.inventory || "0";

  const quantityInput = document.getElementById("orderQuantity");
  quantityInput.value = "";
  quantityInput.focus();

  calculateTotalPieces();
}

// Calculate total pieces based on quantity and unit per pack
function calculateTotalPieces() {
  const totalPiecesElement = document.getElementById("totalPieces");
  if (!selectedItem || !totalPiecesElement) return;

  const quantity =
    parseInt(document.getElementById("orderQuantity").value) || 0;
  const totalPieces = quantity * (selectedItem.unit || 0);
  totalPiecesElement.textContent = totalPieces;
}

// Modify the addItemToOrder function to handle sold-out status
async function addItemToOrder() {
  if (!selectedItem || !document.getElementById("orderQuantity").value) {
    alert("Please select an item and enter quantity");
    return;
  }

  const quantity = parseFloat(document.getElementById("orderQuantity").value);
  if (!quantity || quantity < 0.5) {
    alert("Please enter a valid quantity");
    return;
  }

  // Check if quantity has .5 value
  const hasHalfUnit = quantity % 1 !== 0;

  if (hasHalfUnit) {
    // Get item status and unit per pack
    const itemStatus = document.getElementById("itemStatus").textContent;
    const unitPerPack = parseFloat(
      document.getElementById("unitPerPack").textContent
    );

    // Show warning for On Sale items
    if (itemStatus === "On Sale") {
      if (
        !confirm(
          "This item is On Sale. Are you sure you want to add it with half pack?"
        )
      ) {
        return;
      }
    }

    // Show warning for items with unit per pack not equal to 8
    if (unitPerPack !== 8) {
      if (
        !confirm(
          `This item has ${unitPerPack} units per pack (not 8). Are you sure you want to add it with half pack?`
        )
      ) {
        return;
      }
    }
  }

  const totalPieces = quantity * (selectedItem.unit || 0);

  // Check if order would result in zero or negative inventory
  const newInventoryQuantity = selectedItem.inventory - quantity;

  if (newInventoryQuantity < 0) {
    alert("Order quantity exceeds available inventory!");
    return;
  }

  // If inventory will become zero, update the status
  if (newInventoryQuantity === 0) {
    try {
      // First get the current item status
      const { data: currentItem, error: fetchError } = await supabaseClient
        .from("inventory")
        .select("status")
        .eq('"code & colour"', selectedItem["code & colour"])
        .single();

      if (fetchError) throw fetchError;

      // Update with the current status saved as soldout_status
      const { error: updateError } = await supabaseClient
        .from("inventory")
        .update({
          status: "Out of Stock",
          soldout_status: currentItem.status, // Save the current status before changing to Out of Stock
          soldout_date: new Date().toISOString(),
        })
        .eq('"code & colour"', selectedItem["code & colour"]);

      if (updateError) throw updateError;

      // Update the selectedItem object to reflect the new status
      selectedItem.status = "Out of Stock";
      document.getElementById("itemStatus").textContent = "Out of Stock";
    } catch (error) {
      console.error("Error updating sold-out status:", error);
      alert("Error updating item status: " + error.message);
      return;
    }
  }

  const orderItem = {
    code_colour: selectedItem["code & colour"],
    item_name: selectedItem["item name"],
    quantity: quantity,
    unit_per_pack: selectedItem.unit,
    total_pieces: totalPieces,
    location: selectedItem.location,
    inventory_before: selectedItem.inventory,
  };

  orderItems.push(orderItem);
  renderOrderItems();
  resetItemEntry();
}

// Make sure the function is available globally
window.addItemToOrder = addItemToOrder;

// Render order items table
function renderOrderItems() {
  const tbody = document.querySelector("#orderItemsTable tbody");
  const removeAllBtn = document.getElementById("removeAllBtn");

  tbody.innerHTML = "";

  // Show/hide Remove All button based on whether there are items
  if (orderItems.length > 0) {
    removeAllBtn.style.display = "block";
  } else {
    removeAllBtn.style.display = "none";
  }

  orderItems.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.code_colour}</td>
      <td>${item.item_name}</td>
      <td>${item.quantity}</td>
      <td>${item.total_pieces}</td>
      <td>${item.location}</td>
      <td>${
        item.created_at ? formatDateTime(item.created_at) : "Not added yet"
      }</td>
      <td>
        <button onclick="removeOrderItem(${index})" class="btn-delete">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Remove item from order
async function removeOrderItem(index) {
  try {
    const item = orderItems[index];
    const existingOrderId = document
      .getElementById("orderForm")
      .getAttribute("data-order-id");

    if (existingOrderId && item.created_at) {
      // Get current inventory quantity first
      const { data: inventoryData, error: inventoryError } =
        await supabaseClient
          .from("inventory")
          .select("inventory")
          .eq('"code & colour"', item.code_colour)
          .single();

      if (inventoryError) throw inventoryError;

      // Delete the order item first
      const { error: deleteError } = await supabaseClient
        .from("order_items")
        .delete()
        .eq("order_id", existingOrderId)
        .eq("code_colour", item.code_colour);

      if (deleteError) throw deleteError;

      // Record the removed item
      const { error: historyError } = await supabaseClient
        .from("order_item_history")
        .insert([
          {
            order_id: existingOrderId,
            code_colour: item.code_colour,
            item_name: item.item_name,
            order_quantity: item.order_quantity,
            unit_per_pack: item.unit_per_pack,
            total_pieces: item.total_pieces,
            location: item.location,
            inventory_before: item.inventory_before,
            action: "removed",
            action_date: new Date().toISOString(),
          },
        ]);

      if (historyError) {
        console.error("Error recording item removal:", historyError);
        // Continue even if history recording fails
      }

      // Update inventory with current value + order quantity
      const currentInventory = inventoryData.inventory || 0;
      const { error: updateError } = await supabaseClient
        .from("inventory")
        .update({
          inventory: currentInventory + item.order_quantity,
        })
        .eq('"code & colour"', item.code_colour);

      if (updateError) throw updateError;
    }

    // Remove item from the orderItems array
    orderItems.splice(index, 1);
    renderOrderItems();

    alert("Item removed successfully!");
  } catch (error) {
    console.error("Error removing item:", error);
    alert("Error removing item: " + error.message);
  }
}

// Reset item entry form
function resetItemEntry() {
  selectedItem = null;
  document.getElementById("itemSearch").value = "";
  document.getElementById("orderQuantity").value = "";
  document.getElementById("selectedItem").textContent = "No item selected";
  document.getElementById("unitPerPack").textContent = "-";
  document.getElementById("itemStatus").textContent = "-";
  document.getElementById("inventoryQty").textContent = "0";
}

// Handle form submission
async function handleOrderSubmit(event) {
  event.preventDefault();

  if (orderItems.length === 0) {
    alert("Please add at least one item to the order");
    return;
  }

  try {
    const orderDate = document.getElementById("orderDate").value;
    const customerName = normalizeCustomerName(
      document.getElementById("customerName").value
    );
    const agentState = document.getElementById("agentState").value;
    const orderForm = document.getElementById("orderForm");
    const existingOrderId = orderForm.getAttribute("data-order-id");

    // Update the customer name field with normalized value
    document.getElementById("customerName").value = customerName;

    // Skip checks if editing an existing order
    if (!existingOrderId) {
      // First check for same date orders
      const existingOrder = await checkExistingOrder(orderDate, customerName);

      if (existingOrder) {
        const formattedDate = formatDateDDMMYYYY(existingOrder.order_date);
        const modal = document.createElement("div");
        modal.className = "modal";
        modal.style.display = "block";

        modal.innerHTML = `
          <div class="modal-content" style="max-width: 400px; max-height: 350px; text-align: center; margin: auto;">
            <h3>Duplicate Order Warning</h3>
            <div style="margin: 1rem 0;">
              <p style="margin-bottom: 0.5rem;">
                Customer "${customerName}" already has an order on ${formattedDate}.
              </p>
              <p style="color: #666; font-size: 0.9rem;">
                Please use a different customer name or edit the existing order.
              </p>
            </div>
            <div class="modal-actions">
              <button style="margin: auto;" onclick="this.closest('.modal').remove()" class="btn-secondary">
                Close
              </button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
        return;
      }

      // Then check for active orders with normalized name
      const activeOrders = await checkActiveOrdersByCustomer(customerName);

      if (activeOrders.length > 0) {
        const modal = document.createElement("div");
        modal.className = "modal";
        modal.style.display = "block";

        const ordersList = activeOrders
          .map(
            (order) => `
            <li style="margin-bottom: 0.5rem;">
              Order date: ${formatDateDDMMYYYY(order.order_date)} - Status: ${
              order.status
            }
            </li>
          `
          )
          .join("");

        modal.innerHTML = `
          <div class="modal-content" style="max-width: 450px; max-height: 400px; text-align: center; margin: auto;">
            <h3>Active Orders Warning</h3>
            <div style="margin: 1rem 0;">
              <p style="margin-bottom: 1rem;">
                Customer "${customerName}" has the following active orders:
              </p>
              <ul style="list-style: none; padding: 0; text-align: left; margin: 1rem 2rem;">
                ${ordersList}
              </ul>
              <p style="color: #666; font-size: 0.9rem; margin-top: 1rem;">
                Please complete or cancel existing orders before creating a new one.
              </p>
            </div>
            <div class="modal-actions">
              <button style="margin: auto;" onclick="this.closest('.modal').remove()" class="btn-secondary">
                Close
              </button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
        return;
      }
    }

    // Create or update order header with normalized name
    const orderHeaderData = {
      order_date: orderDate,
      customer_name: customerName,
      agent_state: agentState,
      total_items: orderItems.length,
      status: "processing",
      note: document.getElementById("orderNote").value,
    };

    let orderHeader;
    if (existingOrderId) {
      // Update existing order
      const { data, error: headerError } = await supabaseClient
        .from("order_header")
        .update(orderHeaderData)
        .eq("order_id", existingOrderId)
        .select("*")
        .single();

      if (headerError) throw headerError;
      orderHeader = data;

      // Verify the update was successful
      if (!orderHeader) {
        throw new Error("Failed to update order");
      }
    } else {
      // Create new order
      const { data, error: headerError } = await supabaseClient
        .from("order_header")
        .insert(orderHeaderData)
        .select("*")
        .single();

      if (headerError) throw headerError;
      orderHeader = data;

      // Only update weekly_state_orders for new orders
      // Get current week's start date
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      // Format date as YYYY-MM-DD
      const formattedWeekStart = `${weekStart.getFullYear()}-${String(
        weekStart.getMonth() + 1
      ).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;

      // Get existing week record
      let { data: weekData, error: weekError } = await supabaseClient
        .from("weekly_state_orders")
        .select("*")
        .eq("week_start", formattedWeekStart)
        .maybeSingle();

      if (weekError) throw weekError;

      if (weekData) {
        // Update overall_total
        const { error: updateWeekError } = await supabaseClient
          .from("weekly_state_orders")
          .update({
            overall_total: (weekData.overall_total || 0) + 1,
          })
          .eq("week_start", formattedWeekStart);

        if (updateWeekError) throw updateWeekError;
      }
    }

    // Handle order items
    for (const item of orderItems) {
      if (!item.created_at) {
        // Get current inventory quantity
        const { data: inventoryData, error: inventoryError } =
          await supabaseClient
            .from("inventory")
            .select("inventory")
            .eq('"code & colour"', item.code_colour)
            .single();

        if (inventoryError) throw inventoryError;

        const currentInventory = inventoryData.inventory || 0;

        // This is a new item - insert it and update inventory
        const { error: itemError } = await supabaseClient
          .from("order_items")
          .insert([
            {
              order_id: orderHeader.order_id,
              code_colour: item.code_colour,
              item_name: item.item_name,
              order_quantity: item.quantity,
              unit_per_pack: item.unit_per_pack,
              total_pieces: item.total_pieces,
              location: item.location,
              inventory_before: currentInventory, // Store current inventory
            },
          ]);

        if (itemError) throw itemError;

        // Update inventory quantity using current value
        const { error: updateError } = await supabaseClient
          .from("inventory")
          .update({
            inventory: currentInventory - item.quantity,
          })
          .eq('"code & colour"', item.code_colour);

        if (updateError) throw updateError;
      }
    }

    // Show success message
    alert(
      existingOrderId
        ? "Order updated successfully!"
        : "Order completed successfully!"
    );

    // Clear the edit mode and reset form
    orderForm.removeAttribute("data-order-id");
    resetOrder();
    await searchOrders(); // Refresh the orders list
  } catch (error) {
    console.error("Error submitting order:", error);
    alert("Error submitting order: " + error.message);
  }
}

// Reset entire order form
function resetOrder() {
  orderItems = [];
  renderOrderItems();
  resetItemEntry();
  document.getElementById("customerName").value = "";
  document.getElementById("agentState").value = "";
  document.getElementById("orderNote").value = "";
  setDefaultOrderDate();

  // Clear edit mode
  const orderForm = document.getElementById("orderForm");
  if (orderForm.hasAttribute("data-order-id")) {
    orderForm.removeAttribute("data-order-id");
  }
}

// Logout function
function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Export functions for global access
window.removeOrderItem = removeOrderItem;
window.resetOrder = resetOrder;
window.logout = logout;

// Add auto uppercase for customer name
document.getElementById("customerName").addEventListener("input", function (e) {
  const start = this.selectionStart;
  const end = this.selectionEnd;
  const value = this.value;
  this.value = value.toUpperCase();
  this.setSelectionRange(start, end);
});

// Add a blur event listener to trim whitespace when the input loses focus
document.getElementById("customerName").addEventListener("blur", function (e) {
  this.value = normalizeCustomerName(this.value);
});

// Search orders
async function searchOrders() {
  try {
    const searchDate = document.getElementById("searchOrderDate").value;
    const searchCustomer = document
      .getElementById("searchCustomer")
      .value.toUpperCase();
    const searchAgentState = document.getElementById("searchAgentState").value;

    let query = supabaseClient
      .from("order_header")
      .select("*")
      .order("order_date", { ascending: false });

    if (searchDate) {
      query = query.eq("order_date", searchDate);
    }
    if (searchCustomer) {
      query = query.ilike("customer_name", `%${searchCustomer}%`);
    }
    if (searchAgentState) {
      query = query.eq("agent_state", searchAgentState);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    const tbody = document.querySelector("#ordersTable tbody");
    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 1rem;">
            No orders found
          </td>
        </tr>
      `;
      return;
    }

    orders.forEach((order) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDateDDMMYYYY(order.order_date)}</td>
        <td>${order.customer_name}</td>
        <td>${order.agent_state}</td>
        <td>${order.total_items}</td>
        <td>
          ${
            order.is_cancelled
              ? `<span class="cancelled-status">Cancelled</span>`
              : order.status === "dispatched"
              ? `<span class="dispatched-status">Dispatched</span>`
              : order.status === "hold"
              ? `<span class="hold-status">On Hold</span>`
              : `<span class="active-status">Processing</span>`
          }
        </td>
        <td>
          <button onclick="viewOrderDetails(${
            order.order_id
          })" class="btn-secondary">View</button>
          ${
            !order.is_cancelled && order.status !== "dispatched"
              ? `
            <button onclick="editOrder(${order.order_id})" class="btn-secondary">Edit</button>
            <button onclick="deleteOrder(${order.order_id})" class="btn-delete">Delete</button>
          `
              : ""
          }
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error searching orders:", error);
    alert("Error searching orders: " + error.message);
  }
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    // Fetch order details including items
    const { data: order, error: orderError } = await supabaseClient
      .from("order_header")
      .select(
        `
        *,
        order_items (
          code_colour,
          item_name,
          order_quantity,
          unit_per_pack,
          total_pieces,
          location,
          created_at
        )
      `
      )
      .eq("order_id", orderId)
      .single();

    if (orderError) throw orderError;

    // Create modal
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "block";

    // Format the order details
    const items = order.order_items
      .map(
        (item) => `
      <tr>
        <td>${item.code_colour || ""}</td>
        <td>${item.item_name || ""}</td>
        <td>${item.unit_per_pack || ""}</td>
        <td>${item.order_quantity || ""}</td>
        <td>${item.total_pieces || ""}</td>
        <td>${item.location || ""}</td>
      </tr>
    `
      )
      .join("");

    modal.innerHTML = `
      <div class="modal-content">
        <h3>Order Details</h3>
        <div class="order-info">
          <p><strong>Order Date:</strong> ${formatDateDDMMYYYY(
            order.order_date
          )}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Agent State:</strong> ${order.agent_state}</p>
          <p><strong>Status:</strong> 
            ${
              order.is_cancelled
                ? `<span class="cancelled-status">Cancelled on ${formatDate(
                    order.cancel_date
                  )}</span>`
                : order.status === "dispatched"
                ? `<span class="dispatched-status">Dispatched on ${formatDate(
                    order.dispatch_time
                  )}</span>`
                : order.status === "hold"
                ? `<span class="hold-status">On Hold</span>`
                : `<span class="active-status">Processing</span>`
            }
          </p>
          ${order.note ? `<p><strong>Note:</strong> ${order.note}</p>` : ""}
          <p><strong>Total Items:</strong> ${order.total_items}</p>
        </div>
        <div class="items-table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th>Code & Colour</th>
                <th>Item Name</th>
                <th>Unit/Pack</th>
                <th>Quantity (Packs)</th>
                <th>Total Pieces</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <div style="
            display: flex;
            flex-direction: column;
            gap: 15px;
            align-items: center;
            width: 100%;
          ">
            ${
              !order.is_cancelled && order.status !== "dispatched"
                ? `
              <div class="dispatch-controls" style="
                display: flex;
                gap: 10px;
                align-items: center;
                width: 100%;
                justify-content: space-between;
              ">
                <div style="display: flex; flex-direction: column; gap: 5px;">
                  <label for="dispatchState" style="font-weight: 500;">Dispatch to:</label>
                  <select id="dispatchState" class="dispatch-state-select" style="
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    width: 150px;
                    height: 40px;
                  ">
                    <option value="">Select State</option>
                    <option value="qld">QLD</option>
                    <option value="nsw">NSW</option>
                    <option value="vic">VIC</option>
                    <option value="sa">SA</option>
                    <option value="wa">WA</option>
                    <option value="nz">NZ</option>
                    <option value="nt">NT</option>
                    <option value="act">ACT</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <button 
                  onclick="markAsDispatched(${order.order_id})"
                  class="btn-primary"
                  style="
                    padding: 8px 16px;
                    width: 150px;
                    height: 40px;
                  "
                >
                  Mark as Dispatched
                </button>
                <button 
                  onclick="toggleOrderHold(${order.order_id}, '${
                    order.status
                  }')"
                  class="btn-secondary"
                  style="
                    padding: 8px 16px;
                    width: 150px;
                    height: 40px;
                    ${
                      order.status === "hold"
                        ? "background-color: #4CAF50; color: white;"
                        : "background-color: #ff9800; color: white;"
                    }
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                  "
                >
                  ${order.status === "hold" ? "Remove Hold" : "Put On Hold"}
                </button>
              </div>
            `
                : ""
            }
            <button 
              onclick="this.closest('.modal').remove()" 
              class="btn-secondary"
              style="
                padding: 8px 16px;
                width: 150px;
                height: 40px;
              "
            >
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("Error viewing order details:", error);
    alert("Error viewing order details: " + error.message);
  }
}

// Update the cancelOrder function
async function cancelOrder(orderId) {
  try {
    // Check if order has items
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .select("code_colour")
      .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    if (orderItems && orderItems.length > 0) {
      alert("Please remove all items from the order before cancelling.");
      return;
    }

    // First check if order is already cancelled
    const { data: orderData, error: orderCheckError } = await supabaseClient
      .from("order_header")
      .select("is_cancelled, status")
      .eq("order_id", orderId)
      .single();

    if (orderCheckError) throw orderCheckError;

    if (orderData.is_cancelled || orderData.status === "cancelled") {
      alert("This order is already cancelled.");
      return;
    }

    // Update order status
    const { error: updateError } = await supabaseClient
      .from("order_header")
      .update({
        status: "cancelled",
        is_cancelled: true,
        cancel_date: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    if (updateError) throw updateError;

    alert("Order cancelled successfully!");
    document.querySelector(".modal")?.remove();
    await searchOrders();
  } catch (error) {
    console.error("Error cancelling order:", error);
    alert("Error cancelling order: " + error.message);
  }
}

// Reset order search
function resetOrderSearch() {
  document.getElementById("searchOrderDate").value = "";
  document.getElementById("searchCustomer").value = "";
  document.getElementById("searchAgentState").value = "";
  document.querySelector("#ordersTable tbody").innerHTML = "";
}

// Export functions for global access
window.searchOrders = searchOrders;
window.resetOrderSearch = resetOrderSearch;
window.viewOrderDetails = viewOrderDetails;

// Add this utility function for date formatting
function formatDateDDMMYYYY(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Update the existing formatDate function
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ""; // Invalid date
    return formatDateDDMMYYYY(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

// Add to global exports
window.cancelOrder = cancelOrder;

// Add editOrder function
async function editOrder(orderId) {
  try {
    const { data: orderData, error: orderError } = await supabaseClient
      .from("order_header")
      .select(
        `
        *,
        order_items (*)
      `
      )
      .eq("order_id", orderId)
      .single();

    if (orderError) throw orderError;

    // Set form to edit mode
    document.getElementById("orderForm").setAttribute("data-order-id", orderId);

    // Format the date to YYYY-MM-DD
    let orderDate = orderData.order_date;
    if (orderDate.includes("T")) {
      orderDate = orderDate.split("T")[0];
    }

    // Populate form with order header data
    document.getElementById("orderDate").value = orderDate;
    document.getElementById("customerName").value = orderData.customer_name;
    document.getElementById("agentState").value = orderData.agent_state;

    // Load order items
    orderItems = orderData.order_items.map((item) => ({
      ...item,
      created_at: item.created_at, // Keep track of existing items
    }));

    renderOrderItems();

    // Scroll to top of form
    document
      .querySelector(".input-form")
      .scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Error loading order for edit:", error);
    alert("Error loading order for edit: " + error.message);
  }
}

// Add updateOrderStatus function
async function updateOrderStatus(orderId, newStatus) {
  try {
    if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) {
      return;
    }

    if (newStatus === "cancelled") {
      // Handle order cancellation
      await cancelOrder(orderId);
      return;
    }

    const { error: updateError } = await supabaseClient
      .from("order_header")
      .update({
        status: newStatus,
      })
      .eq("order_id", orderId);

    if (updateError) throw updateError;

    alert(`Order marked as ${newStatus} successfully!`);
    document.querySelector(".modal").remove();
    await viewOrderDetails(orderId);
    await searchOrders();
  } catch (error) {
    console.error("Error updating order status:", error);
    alert("Error updating order status: " + error.message);
  }
}

// Add formatDateTime function
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return "";
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return ""; // Invalid date
    return date.toLocaleString(); // Shows both date and time
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "";
  }
}

// Add this function to remove all items
async function removeAllItems() {
  if (!confirm("Are you sure you want to remove all items from this order?")) {
    return;
  }

  try {
    const existingOrderId = document
      .getElementById("orderForm")
      .getAttribute("data-order-id");

    // Process each item one by one
    for (const item of [...orderItems]) {
      // Create a copy of the array to avoid modification during iteration
      if (existingOrderId && item.created_at) {
        // Get current inventory quantity
        const { data: inventoryData, error: inventoryError } =
          await supabaseClient
            .from("inventory")
            .select("inventory")
            .eq('"code & colour"', item.code_colour)
            .single();

        if (inventoryError) {
          console.error("Error fetching inventory:", inventoryError);
          continue;
        }

        // Delete the order item
        const { error: deleteError } = await supabaseClient
          .from("order_items")
          .delete()
          .eq("order_id", existingOrderId)
          .eq("code_colour", item.code_colour);

        if (deleteError) {
          console.error("Error deleting order item:", deleteError);
          continue;
        }

        // Record the removed item
        const { error: historyError } = await supabaseClient
          .from("order_item_history")
          .insert([
            {
              order_id: existingOrderId,
              code_colour: item.code_colour,
              item_name: item.item_name,
              order_quantity: item.order_quantity,
              unit_per_pack: item.unit_per_pack,
              total_pieces: item.total_pieces,
              location: item.location,
              inventory_before: item.inventory_before,
              action: "removed",
              action_date: new Date().toISOString(),
            },
          ]);

        if (historyError) {
          console.error("Error recording item removal:", historyError);
          // Continue even if history recording fails
        }

        // Update inventory with current value + order quantity
        const currentInventory = inventoryData.inventory || 0;
        const { error: updateError } = await supabaseClient
          .from("inventory")
          .update({
            inventory: currentInventory + item.order_quantity,
          })
          .eq('"code & colour"', item.code_colour);

        if (updateError) {
          console.error("Error updating inventory:", updateError);
          continue;
        }
      }
    }

    // Clear the orderItems array and update the display
    orderItems = [];
    renderOrderItems();
    alert("All items have been removed successfully!");
  } catch (error) {
    console.error("Error removing all items:", error);
    alert("Error removing all items: " + error.message);
  }
}

// Add to window exports
window.removeAllItems = removeAllItems;

// Add checkExistingOrder function
async function checkExistingOrder(orderDate, customerName) {
  try {
    const { data, error } = await supabaseClient
      .from("order_header")
      .select("order_id, order_date")
      .eq("order_date", orderDate)
      .eq("customer_name", customerName) // Using exact match with normalized name
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error checking existing order:", error);
    throw error;
  }
}

// Update markAsDispatched function with proper local date handling
async function markAsDispatched(orderId) {
  try {
    const stateSelect = document.getElementById("dispatchState");
    const selectedState = stateSelect.value;

    if (!selectedState) {
      alert("Please select a state before dispatching the order");
      return;
    }

    if (!confirm(`Please confirm dispatch to ${selectedState.toUpperCase()}`)) {
      return;
    }

    // Get current date in local time
    const today = new Date();

    // Get the previous Sunday (for week start) in local time
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Go back to Sunday
    weekStart.setHours(0, 0, 0, 0); // Set to start of day

    // Get the Saturday (for week end) in local time
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days to get to Saturday
    weekEnd.setHours(23, 59, 59, 999); // Set to end of day

    // Format dates as YYYY-MM-DD using local time
    const formattedWeekStart = `${weekStart.getFullYear()}-${String(
      weekStart.getMonth() + 1
    ).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const formattedWeekEnd = `${weekEnd.getFullYear()}-${String(
      weekEnd.getMonth() + 1
    ).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;

    // Update order with dispatch info
    const { error: updateError } = await supabaseClient
      .from("order_header")
      .update({
        status: "dispatched",
        dispatch_time: today.toISOString(),
        dispatch_state: selectedState.toUpperCase(), // Store the dispatch state
      })
      .eq("order_id", orderId);

    if (updateError) throw updateError;

    // Get existing week record
    let { data: weekData, error: weekError } = await supabaseClient
      .from("weekly_state_orders")
      .select("*")
      .eq("week_start", formattedWeekStart)
      .maybeSingle();

    if (weekError) throw weekError;

    if (weekData) {
      // Record exists, update only the selected state's amount
      const stateColumn = `${selectedState}_amount`;
      const { error: updateWeekError } = await supabaseClient
        .from("weekly_state_orders")
        .update({
          [stateColumn]: (weekData[stateColumn] || 0) + 1,
        })
        .eq("week_start", formattedWeekStart);

      if (updateWeekError) throw updateWeekError;
    } else {
      // No record exists, create new one with 1 for selected state
      const newWeekData = {
        week_start: formattedWeekStart,
        week_end: formattedWeekEnd,
        qld_amount: selectedState === "qld" ? 1 : 0,
        nsw_amount: selectedState === "nsw" ? 1 : 0,
        sa_amount: selectedState === "sa" ? 1 : 0,
        wa_amount: selectedState === "wa" ? 1 : 0,
        vic_amount: selectedState === "vic" ? 1 : 0,
        nz_amount: selectedState === "nz" ? 1 : 0,
        nt_amount: selectedState === "nt" ? 1 : 0,
        act_amount: selectedState === "act" ? 1 : 0,
        others_amount: selectedState === "others" ? 1 : 0,
      };

      const { error: insertError } = await supabaseClient
        .from("weekly_state_orders")
        .insert(newWeekData);

      if (insertError) throw insertError;
    }

    alert("Order marked as dispatched successfully!");
    document.querySelector(".modal").remove();
    await searchOrders();
  } catch (error) {
    console.error("Error dispatching order:", error);
    alert(
      "Error dispatching order: " + (error.message || "Unknown error occurred")
    );
  }
}

// Add this new function to check for active orders by customer name
async function checkActiveOrdersByCustomer(customerName) {
  try {
    const { data, error } = await supabaseClient
      .from("order_header")
      .select("order_id, order_date, status")
      .eq("customer_name", customerName) // Using exact match with normalized name
      .in("status", ["processing", "hold"])
      .order("order_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error checking active orders:", error);
    throw error;
  }
}

// Modify the deleteOrder function
async function deleteOrder(orderId) {
  try {
    if (
      !confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      return;
    }

    // First check if order exists and its status
    const { data: orderData, error: orderError } = await supabaseClient
      .from("order_header")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (orderError) {
      console.error("Error checking order:", orderError);
      throw new Error("Could not find the order");
    }

    if (!orderData) {
      throw new Error("Order not found");
    }

    // Check if order has any items
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Error checking order items:", itemsError);
      throw new Error("Could not check order items");
    }

    if (orderItems && orderItems.length > 0) {
      alert("Please remove all items from the order before deleting.");
      return;
    }

    // Delete any order history records first (if they exist)
    const { error: historyDeleteError } = await supabaseClient
      .from("order_item_history")
      .delete()
      .eq("order_id", orderId);

    if (historyDeleteError) {
      console.error("Error deleting order history:", historyDeleteError);
      // Continue even if history deletion fails
    }

    // Delete the order header
    const { error: deleteError } = await supabaseClient
      .from("order_header")
      .delete()
      .eq("order_id", orderId);

    if (deleteError) {
      console.error("Error deleting order:", deleteError);
      throw new Error("Failed to delete the order");
    }

    alert("Order deleted successfully!");
    await searchOrders(); // Refresh the orders list
  } catch (error) {
    console.error("Error in delete operation:", error);
    alert(
      "Error deleting order: " + (error.message || "Unknown error occurred")
    );
  }
}

// Make sure it's exported to window
window.deleteOrder = deleteOrder;

// Add this utility function at the top with other utility functions
function normalizeCustomerName(name) {
  return name.trim().toUpperCase();
}

// Add this function to handle order hold status
async function toggleOrderHold(orderId, currentStatus) {
  try {
    const newStatus = currentStatus === "hold" ? "processing" : "hold";

    const { error } = await supabaseClient
      .from("order_header")
      .update({ status: newStatus })
      .eq("order_id", orderId);

    if (error) throw error;

    alert(
      `Order ${
        newStatus === "hold" ? "put on hold" : "removed from hold"
      } successfully!`
    );
    document.querySelector(".modal").remove();
    await searchOrders(); // Refresh the orders list
  } catch (error) {
    console.error("Error toggling order hold status:", error);
    alert(
      "Error updating order status: " +
        (error.message || "Unknown error occurred")
    );
  }
}

// Add to window exports
window.toggleOrderHold = toggleOrderHold;

// Agent State Modal Functions
function showAgentStateModal() {
  document.getElementById("agentStateModal").style.display = "block";
  loadAgentStateList();
}

function closeAgentStateModal() {
  document.getElementById("agentStateModal").style.display = "none";
}

async function loadAgentStateList() {
  try {
    const { data: agentStates, error } = await supabaseClient
      .from("agent_state_options")
      .select("agent_state")
      .order("agent_state");

    if (error) throw error;

    const agentStateList = document.getElementById("agentStateList");
    agentStateList.innerHTML = "";

    agentStates.forEach(({ agent_state }) => {
      if (agent_state) {
        const div = document.createElement("div");
        div.className = "status-item";
        div.innerHTML = `
          <span>${agent_state}</span>
          <button onclick="deleteAgentState('${agent_state}')" class="btn-delete">Delete</button>
        `;
        agentStateList.appendChild(div);
      }
    });
  } catch (error) {
    console.error("Error loading agent states:", error);
    alert("Error loading agent states: " + error.message);
  }
}

async function addNewAgentState() {
  const newAgentState = document
    .getElementById("newAgentState")
    .value.trim()
    .toUpperCase();
  if (!newAgentState) {
    alert("Please enter an agent state");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("agent_state_options")
      .insert([{ agent_state: newAgentState }]);

    if (error) throw error;

    alert("New agent state added successfully!");
    document.getElementById("newAgentState").value = "";
    await loadAgentStateList();
    await loadAgentStates(); // Refresh the select options
  } catch (error) {
    console.error("Error:", error);
    alert("Error adding new agent state: " + error.message);
  }
}

async function deleteAgentState(agentState) {
  if (!confirm(`Are you sure you want to delete "${agentState}"?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("agent_state_options")
      .delete()
      .eq("agent_state", agentState);

    if (error) throw error;

    alert("Agent state deleted successfully!");
    await loadAgentStateList();
    await loadAgentStates(); // Refresh the select options
  } catch (error) {
    console.error("Error:", error);
    alert("Error deleting agent state: " + error.message);
  }
}

// Export functions to window
window.showAgentStateModal = showAgentStateModal;
window.closeAgentStateModal = closeAgentStateModal;
window.addNewAgentState = addNewAgentState;
window.deleteAgentState = deleteAgentState;
