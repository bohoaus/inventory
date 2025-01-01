// Initialize Supabase client
const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let selectedItem = null;
let orderItems = [];

// Check authentication on page load
window.addEventListener("load", async function () {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  setupEventListeners();
  setDefaultOrderDate();
  await searchOrders(); // Load orders on page load
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

// Add item to order table
function addItemToOrder() {
  if (!selectedItem || !document.getElementById("orderQuantity").value) {
    alert("Please select an item and enter quantity");
    return;
  }

  const quantity = parseInt(document.getElementById("orderQuantity").value);
  const totalPieces = quantity * (selectedItem.unit || 0);

  if (quantity > selectedItem.inventory) {
    alert("Order quantity exceeds available inventory!");
    return;
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
    const customerName = document.getElementById("customerName").value;
    const agentState = document.getElementById("agentState").value;
    const orderForm = document.getElementById("orderForm");
    const existingOrderId = orderForm.getAttribute("data-order-id");

    // Skip duplicate check if editing an existing order
    if (!existingOrderId) {
      // Check for existing order with same date and customer
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
    }

    // Create or update order header
    const orderHeaderData = {
      order_date: orderDate,
      customer_name: customerName,
      agent_state: agentState,
      total_items: orderItems.length,
      status: "processing",
    };

    let orderHeader;
    if (existingOrderId) {
      // Update existing order
      const { data, error: headerError } = await supabaseClient
        .from("order_header")
        .update(orderHeaderData)
        .eq("order_id", existingOrderId)
        .select()
        .single();

      if (headerError) throw headerError;
      orderHeader = data;
    } else {
      // Create new order
      const { data, error: headerError } = await supabaseClient
        .from("order_header")
        .insert([orderHeaderData])
        .select()
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
  this.value = this.value.toUpperCase();
  this.setSelectionRange(start, end);
});

// Search orders
async function searchOrders() {
  try {
    const searchDate = document.getElementById("searchOrderDate")?.value || "";
    const searchCustomer =
      document.getElementById("searchCustomer")?.value?.toUpperCase() || "";
    const searchAgent =
      document.getElementById("searchAgentState")?.value || "";

    let query = supabaseClient
      .from("order_header")
      .select("*, order_items(count)");

    if (searchDate) {
      query = query.eq("order_date", searchDate);
    }
    if (searchCustomer) {
      query = query.ilike("customer_name", `%${searchCustomer}%`);
    }
    if (searchAgent) {
      query = query.eq("agent_state", searchAgent);
    }

    const { data, error } = await query.order("order_date", {
      ascending: false,
    });

    if (error) throw error;

    const tbody = document.querySelector("#ordersTable tbody");
    tbody.innerHTML = "";

    if (data && data.length > 0) {
      data.forEach((order) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatDateDDMMYYYY(order.order_date)}</td>
          <td>${order.customer_name}</td>
          <td>${order.agent_state}</td>
          <td>${order.total_items}</td>
          <td>
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
          </td>
          <td>
            <div class="action-buttons">
              <button onclick="viewOrderDetails(${
                order.order_id
              })" class="btn-secondary">
                View Details
              </button>
              ${
                !order.is_cancelled && order.status !== "dispatched"
                  ? `<button onclick="editOrder(${order.order_id})" class="btn-secondary" style="padding-top: 5px;">
                      Edit
                    </button>`
                  : ""
              }
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 1rem;">
            No orders found
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Error searching orders:", error);
    alert("Error searching orders: " + error.message);
  }
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    // Get order header and current items
    const { data: orderData, error: orderError } = await supabaseClient
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

    // If order is cancelled, get the history items
    let historyItems = [];
    if (orderData.is_cancelled) {
      const { data: historyData, error: historyError } = await supabaseClient
        .from("order_item_history")
        .select("*")
        .eq("order_id", orderId)
        .order("action_date", { ascending: false });

      if (historyError) throw historyError;
      historyItems = historyData || [];
    }

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "block";

    const tableStyle = `
      <style>
        .modal-table-container {
          margin: 1rem 0;
          overflow-x: auto;
        }
        .modal-table-container table {
          width: 100%;
          border-collapse: collapse;
          white-space: nowrap;
        }
        .modal-table-container th {
          background-color: #f8f9fa;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
        }
        .modal-table-container td {
          padding: 0.75rem;
          border-top: 1px solid #dee2e6;
        }
        .modal-table-container th:last-child,
        .modal-table-container td:last-child {
          position: sticky;
          right: 0;
          background-color: #fff;
          box-shadow: -2px 0 4px rgba(0,0,0,0.1);
        }
        .modal-table-container tr:hover td {
          background-color: #f8f9fa;
        }
        .modal-table-container tr:hover td:last-child {
          background-color: #f8f9fa;
        }
      </style>
    `;

    // Add state selection dropdown for dispatch
    const dispatchControls =
      !orderData.is_cancelled && orderData.status !== "dispatched"
        ? `
        <div class="dispatch-controls">
          <select id="dispatchState" class="state-select">
            <option value="">Select State</option>
            <option value="qld">QLD</option>
            <option value="nsw">NSW</option>
            <option value="sa">SA</option>
            <option value="wa">WA</option>
            <option value="vic">VIC</option>
            <option value="nz">NZ</option>
            <option value="nt">NT</option>
            <option value="act">ACT</option>
            <option value="others">OTHERS</option>
          </select>
          <button onclick="markAsDispatched(${orderData.order_id})" class="btn-secondary">
            Mark as Dispatched
          </button>
        </div>
      `
        : "";

    const content = `
      ${tableStyle}
      <div class="modal-content">
        <h3>Order Details</h3>
        <div class="order-header-info">
          <p><strong>Order Date:</strong> ${formatDateDDMMYYYY(
            orderData.order_date
          )}</p>
          <p><strong>Customer:</strong> ${orderData.customer_name}</p>
          <p><strong>Agent State:</strong> ${orderData.agent_state}</p>
          <p><strong>Total Items:</strong> ${orderData.total_items}</p>
          ${
            orderData.is_cancelled
              ? `<p class="cancelled-order"><strong>CANCELLED</strong> on ${formatDate(
                  orderData.cancel_date
                )}</p>`
              : orderData.status === "dispatched"
              ? `<p class="dispatched-status"><strong>DISPATCHED - ${
                  orderData.dispatch_state
                }</strong> on ${formatDate(orderData.dispatch_time)}</p>`
              : orderData.status === "hold"
              ? `<p class="hold-status"><strong>ON HOLD</strong></p>`
              : `<p class="active-status"><strong>PROCESSING</strong></p>`
          }
        </div>

        <div class="modal-table-container">
          <h4>${
            orderData.is_cancelled
              ? "Removed Items History"
              : "Current Order Items"
          }</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Code & Colour</th>
                <th style="width: 20%">Item Name</th>
                <th style="width: 12%">Quantity (Packs)</th>
                <th style="width: 10%">Unit/Pack</th>
                <th style="width: 12%">Total Pieces</th>
                <th style="width: 13%">Location</th>
                <th style="width: 18%">${
                  orderData.is_cancelled ? "Removed At" : "Added Item At"
                }</th>
              </tr>
            </thead>
            <tbody>
              ${
                orderData.is_cancelled
                  ? historyItems.length > 0
                    ? historyItems
                        .map(
                          (item) => `
                          <tr>
                            <td>${item.code_colour || ""}</td>
                            <td>${item.item_name || ""}</td>
                            <td>${item.order_quantity || ""}</td>
                            <td>${item.unit_per_pack || ""}</td>
                            <td>${item.total_pieces || ""}</td>
                            <td>${item.location || ""}</td>
                            <td>${formatDateTime(item.action_date)}</td>
                          </tr>
                        `
                        )
                        .join("")
                    : `<tr><td colspan="7" style="text-align: center;">No history found</td></tr>`
                  : orderData.order_items.length > 0
                  ? orderData.order_items
                      .map(
                        (item) => `
                        <tr>
                          <td>${item.code_colour || ""}</td>
                          <td>${item.item_name || ""}</td>
                          <td>${item.order_quantity || ""}</td>
                          <td>${item.unit_per_pack || ""}</td>
                          <td>${item.total_pieces || ""}</td>
                          <td>${item.location || ""}</td>
                          <td>${formatDateTime(item.created_at)}</td>
                        </tr>
                      `
                      )
                      .join("")
                  : `<tr><td colspan="7" style="text-align: center;">No items found</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <div class="modal-actions">
          ${dispatchControls}
          ${
            !orderData.is_cancelled && orderData.status !== "dispatched"
              ? `
            <button onclick="updateOrderStatus(${orderData.order_id}, 'hold')" class="btn-secondary">
              Put on Hold
            </button>
            <button onclick="cancelOrder(${orderData.order_id})" class="btn-delete">
              Cancel Order
            </button>
          `
              : ""
          }
          <button onclick="this.closest('.modal').remove()" class="btn-secondary">Close</button>
        </div>
      </div>
    `;

    modal.innerHTML = content;
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
      .ilike("customer_name", customerName)
      .not("status", "eq", "cancelled") // Exclude cancelled orders
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
