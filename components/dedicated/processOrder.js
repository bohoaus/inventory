//It's ok on 28/02/2025

class ProcessOrder {
  constructor() {
    this.orderId = null;
    this.orderType = null;
    this.orderDate = null;
    this.agentState = null;
    this.totalItems = 0;
    this.orderData = null;
    this.invoiceNumber = null;    
    this.modal = null;
    this.isHeld = false;
    this.setupModal();
  }

  setupModal() {
    // Check if modal already exists
    this.modal = document.getElementById("processOrderModal");
    if (this.modal) return;

    // Create modal HTML
//30              <h3>Order Information</h3>
    const modalHTML = `
      <div id="processOrderModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Process Order</h2>
            <span class="close">&times;</span>
          </div>
          <div class="modal-body">
            <div class="order-info">
              <div class="order-info-grid">
                <div class="info-item">
                  <label>Customer:</label>
                  <span maxlength="30" style="width:350px; color:blue" id="customerName"></span>
                </div>
                <div class="info-item">
                  <label>Order Date:</label>
                  <span style="width:70px; color:blue" id="orderDate"></span>
                </div>
                <div class="info-item">
                  <label>D-State:</label>
                  <span style="width:50px; color:blue" id="agentState"></span>
                </div>
                <div class="info-item">
                  <label>Items:</label>
                  <span style="width:40px; color:blue" id="totalItems"></span>
                </div>
                <div class="info-item">
                  <label>Order Type:</label>
                  <span style="width:70px; color:blue" id="orderType"></span>
                </div>
                <div class="info-item">
                  <label>Status:</label>
                  <span style="width:70px; color:blue" id="orderStatus"></span>
                </div>
                <div class="info-item">
                  <label>Invoice#:</label>
                  <span style="width:70px; color:blue" id="invoiceNumber"></span>
                </div>
              </div>
            </div>
            <div class="process-options">
              <button id="holdOrderBtn" class="hold-btn">
                <span class="material-icons">pause_circle</span>
                <span class="button-text">Hold Order</span>
              </button>
              <button id="dispatchOrderBtn" class="dispatch-btn">
                <span class="material-icons">local_shipping</span>
                Dispatch Order
              </button>
              <button id="cancelOrderBtn" class="cancel-btn">
                <span class="material-icons">cancel</span>
                Cancel Order
              </button>
            </div>
            <form id="dispatchForm" style="display: block;">
              <div class="form-group">
                <label for="invoiceNumb">Invoice Number</label>
                <input type="text" id="invoiceNumb" style="width: 80px" maxlength="15" required>
              </div>
              
            <div class="form-group required">
                <label for="dispatchDate8">Dispatch Date</label>
                <input type="date" id="dispatchDate8" style="width: 110px; color:blue" maxlength="25" required>
            </div>
              
              <div class="form-group">
                <label for="dispatchState">Dispatch State</label>
                <select id="dispatchState" style="width: 150px; color:blue" required>
                  <option value="">Select State</option>
                  <option value="AUS-ACT">AUS-ACT</option>
                  <option value="AUS-NSW">AUS-NSW</option>
                  <option value="AUS-NT">AUS-NT</option>
                  <option value="AUS-QLD">AUS-QLD</option>
                  <option value="AUS-SA">AUS-SA</option>
                  <option value="AUS-TAS">AUS-TAS</option>
                  <option value="AUS-VIC">AUS-VIC</option>
                  <option value="AUS-WA">AUS-WA</option>
                  <option value="Others">Others</option>
                  <option value="NZ">NZ</option>
                </select>
              </div>
              <div class="form-group">
                <label for="dispatchBox">Dispatch Box</label>
                <input type="text" id="dispatchBox" value="1" style="width: 50px; color:blue; maxlength:3" required>
              </div>
              <div class="form-group">
                <label for="dispatchCarrier">Dispatch Carrier</label>
                <select id="dispatchCarrier" style="width: 200px; color:blue" required onchange="processOrder.toggleTrackingNumber()">
                  <option value="">Select Carrier</option>
                  <option value="DIRECT EXPRESS">DIRECT EXPRESS</option>
                  <option value="AUSTRALIA POST EXPRESS">AUSTRALIA POST EXPRESS</option>
                  <option value="AUSTRALIA POST">AUSTRALIA POST</option>
                  <option value="DHL">DHL Express</option>
                  <option value="PICK UP">PICK UP</option>
                  <option value="OTHERS">OTHERS</option>
                </select>
              </div>
              <div class="form-group" id="trackingNumberGroup">
                <label for="trackingNumber">Tracking Number</label>
                <input type="text" id="trackingNumber" style="width: 150px; color:blue; maxlength:40" required>
              </div>
              <div class="form-group">
                <label for="orderNotes">Order Notes</label>
                <textarea id="orderNotes" rows="3" value="OK" style="width: 200px; color:blue; maxlength:50"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="cancel-dispatch">Cancel</button>
                <button type="submit" class="confirm-dispatch">Confirm Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this.modal = document.getElementById("processOrderModal");
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector(".close");
    closeBtn.onclick = () => this.closeModal();

    // Click outside modal
    window.onclick = (event) => {
      if (event.target === this.modal) {
        this.closeModal();
      }
    };

    // Process option buttons
    const holdBtn = document.getElementById("holdOrderBtn");
    const dispatchBtn = document.getElementById("dispatchOrderBtn");
    const cancelBtn = document.getElementById("cancelOrderBtn");
    const dispatchForm = document.getElementById("dispatchForm");
    const cancelDispatchBtn = dispatchForm.querySelector(".cancel-dispatch");

    holdBtn.onclick = () => {
      if (this.isHeld) {
        this.unholdOrder();
      } else {
        this.holdOrder();
      }
    };

    dispatchBtn.onclick = () => {
      document.querySelector(".process-options").style.display = "none";
      dispatchForm.style.display = "block";
    };
    cancelBtn.onclick = () => this.cancelOrder();
    cancelDispatchBtn.onclick = () => {
      dispatchForm.style.display = "none";
      document.querySelector(".process-options").style.display = "flex";
    };

    // Dispatch form submission
    dispatchForm.onsubmit = (e) => {
      e.preventDefault();
      this.dispatchOrder();
    };
  }

  async initialize(orderId) {
    try {
      this.orderId = orderId;

      // Fetch order data
      const { data: orderData, error: orderError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      this.orderData = orderData;
      this.orderType = orderData.order_type;

      // Update order info in modal
      document.getElementById("customerName").textContent =
        orderData.customer_name || "-";
      document.getElementById("invoiceNumber").textContent =
        orderData.invoice_no || "-";
      document.getElementById("orderDate").textContent =
        orderData.orderdate?.toUpperCase() || "-";
      document.getElementById("agentState").textContent =
        orderData.agent_state?.toUpperCase() || "-";
      document.getElementById("totalItems").textContent =
        orderData.total_items || "";
      document.getElementById("orderType").textContent =
        orderData.order_type?.toUpperCase() || "-";
      document.getElementById("orderStatus").textContent =
        orderData.status?.toUpperCase() || "-";

      // Check if order is on hold
      this.isHeld = orderData.status?.toLowerCase().includes("on hold");

      // Check if order is dispatched
      const isDispatched = orderData.status?.toLowerCase() === "dispatched";
      if (isDispatched) {
        // Disable all process buttons
        document.getElementById("holdOrderBtn").disabled = true;
        document.getElementById("dispatchOrderBtn").disabled = true;
        document.getElementById("cancelOrderBtn").disabled = true;
      }

      // Update button states
      this.updateButtonStates();

      // Show modal
      this.modal.style.display = "block";
    } catch (error) {
      console.error("Error initializing process order:", error);
      alert("Failed to load order data. Please try again.");
    }
  }

  updateButtonStates() {
    const holdBtn = document.getElementById("holdOrderBtn");
    const dispatchBtn = document.getElementById("dispatchOrderBtn");
    const cancelBtn = document.getElementById("cancelOrderBtn");

    if (this.isHeld) {
      // Update hold button to show unhold
      holdBtn.querySelector(".button-text").textContent = "Unhold Order";
      holdBtn.querySelector(".material-icons").textContent = "play_circle";

      // Disable other buttons
      dispatchBtn.disabled = true;
      cancelBtn.disabled = true;
      dispatchBtn.style.opacity = "0.5";
      cancelBtn.style.opacity = "0.5";

      // Find and disable the edit button in the actions column
      const orderRow = document.querySelector(
        `tr[data-order-id="${this.orderId}"]`
      );
      if (orderRow) {
        const editBtn = orderRow.querySelector(".edit-btn");
        if (editBtn) {
          editBtn.disabled = true;
          editBtn.style.opacity = "0.5";
          editBtn.style.cursor = "not-allowed";
          editBtn.title = "Cannot edit order while on hold";
          // Remove the onclick event
          editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
          };
        }
      }
    } else {
      // Reset to normal state
      holdBtn.querySelector(".button-text").textContent = "Hold Order";
      holdBtn.querySelector(".material-icons").textContent = "pause_circle";

      // Enable other buttons
      dispatchBtn.disabled = false;
      cancelBtn.disabled = false;
      dispatchBtn.style.opacity = "1";
      cancelBtn.style.opacity = "1";

      // Re-enable the edit button in the actions column
      const orderRow = document.querySelector(
        `tr[data-order-id="${this.orderId}"]`
      );
      if (orderRow) {
        const editBtn = orderRow.querySelector(".edit-btn");
        if (editBtn) {
          editBtn.disabled = false;
          editBtn.style.opacity = "1";
          editBtn.style.cursor = "pointer";
          editBtn.title = "Edit Order";
          // Restore the onclick event
          editBtn.onclick = () =>
            adminOrder.editOrder(this.orderId, this.orderType);
        }
      }
    }
  }

  async holdOrder() {
    try {
      const holdStatus =
        this.orderType?.toLowerCase() === "wholesale"
          ? "WHOLESALE ON HOLD"
          : "ODM ON HOLD";

      // Disable edit button immediately
      const orderRow = document.querySelector(
        `tr[data-order-id="${this.orderId}"]`
      );
      if (orderRow) {
        const editBtn = orderRow.querySelector(".edit-btn");
        if (editBtn) {
          editBtn.disabled = true;
          editBtn.style.opacity = "0.5";
          editBtn.style.cursor = "not-allowed";
          editBtn.title = "Cannot edit order while on hold";
          editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
          };
        }
      }

      // Only update inventory items status for ODM orders
      if (this.orderType?.toLowerCase() === "odm") {
        // Get all order items
        const { data: orderItems, error: itemsError } = await supabaseClient
          .from("order_items")
          .select("item_name")
          .eq("order_id", this.orderId);

        if (itemsError) throw itemsError;

        // Update each item's status in inventory
        for (const item of orderItems) {
          const { error: updateError } = await supabaseClient
            .from("inventory")
            .update({ item_status: "ON HOLD" })
            .eq("code_colour", item.item_name);

          if (updateError) throw updateError;
        }
      }

      // Update order status
      const { error } = await supabaseClient
        .from("orders")
        .update({
          status: holdStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.orderId);

      if (error) throw error;

      this.isHeld = true;
      this.updateButtonStates();

      alert("Order has been put on hold.");
      this.closeModal();
      if (
        window.adminOrder &&
        typeof window.adminOrder.loadOrders === "function"
      ) {
        window.adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error holding order:", error);
      alert("Failed to put order on hold. Please try again.");
    }
  }

  async unholdOrder() {
    try {
      // Only update inventory items status for ODM orders
      if (this.orderType?.toLowerCase() === "odm") {
        // Get all order items
        const { data: orderItems, error: itemsError } = await supabaseClient
          .from("order_items")
          .select("item_name")
          .eq("order_id", this.orderId);

        if (itemsError) throw itemsError;

        // Update each item's status in inventory back to active
        for (const item of orderItems) {
          const { error: updateError } = await supabaseClient
            .from("inventory")
            .update({ item_status: "PROCESSING" })
            .eq("code_colour", item.item_name);

          if (updateError) throw updateError;
        }
      }

      // Set appropriate status based on order type
      const newStatus =
        this.orderType?.toLowerCase() === "wholesale"
          ? "AWAITING PAYMENT"
          : "PROCESSING";

      // Update order status
      const { error } = await supabaseClient
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.orderId);

      if (error) throw error;

      this.isHeld = false;
      this.updateButtonStates();

      alert(
        `Order has been unheld and returned to ${newStatus.toLowerCase()}.`
      );
      this.closeModal();
      if (
        window.adminOrder &&
        typeof window.adminOrder.loadOrders === "function"
      ) {
        window.adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error unholding order:", error);
      alert("Failed to unhold order. Please try again.");
    }
  }

  async cancelOrder() {
    try {
      // Get all non-removed order items
      const { data: orderItems, error: itemsError } = await supabaseClient
        .from("order_items")
        .select("item_name, order_item_status")
        .eq("order_id", this.orderId)
        .neq("order_item_status", "REMOVED");

      if (itemsError) throw itemsError;

      // Check if there are any active items
      if (orderItems && orderItems.length > 0) {
        alert("Please remove all items from the order before cancelling.");
        return;
      }

      // Update order status
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update({
          status: "CANCELLED",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.orderId);

      if (orderError) throw orderError;

      alert("Order has been cancelled successfully.");
      this.closeModal();

      // Refresh order list to update UI
      if (
        window.adminOrder &&
        typeof window.adminOrder.loadOrders === "function"
      ) {
        window.adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order. Please try again.");
    }
  }

  async dispatchOrder() {
    try {
      // Get form values
      const invoiceNo = document.getElementById("invoiceNumb").value.trim().toUpperCase();
      const dispatchDate8 = document.getElementById("dispatchDate8").value;
      const dispatchState = document.getElementById("dispatchState").value;
      const dispatchBox = document.getElementById("dispatchBox").value.trim().toUpperCase();
      const dispatchCarrier = document.getElementById("dispatchCarrier").value;
      const trackingNo = document.getElementById("trackingNumber").value.trim().toUpperCase();
      const orderNote = document.getElementById("orderNotes").value.trim().toUpperCase();

      // Validate required fields
      if (!invoiceNo || !dispatchState || !dispatchBox || !dispatchCarrier) {
        alert("Please fill in all required fields");
        return;
      }

      // Validate tracking number if carrier is not PICK UP or OTHERS
      if (
        dispatchCarrier !== "PICK UP" &&
        dispatchCarrier !== "OTHERS" &&
        !trackingNo
      ) {
        alert("Tracking number is required for this carrier");
        return;
      }

      // Update order status and dispatch details
//          dispatched_at: new Date().toISOString(),
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update({
          status: "DISPATCHED",
          dispatched_at: dispatchDate8,
          updated_at: new Date().toISOString(),
          invoice_no: invoiceNo,
          dispatched_state: dispatchState,
          dispatched_box: dispatchBox,
          dispatched_carrier: dispatchCarrier,
          tracking_no: trackingNo || null,
          order_note: orderNote || null,
        })
        .eq("id", this.orderId);

      if (orderError) throw orderError;

      // Only update inventory status for ODM orders
      if (this.orderType.toUpperCase() === "ODM") {
        // Get all order items
        const { data: orderItems, error: itemsError } = await supabaseClient
          .from("order_items")
          .select("item_name")
          .eq("order_id", this.orderId)
          .neq("order_item_status", "REMOVED");

        if (itemsError) throw itemsError;

        // Update inventory status for all items
        for (const item of orderItems) {
          const { error: inventoryError } = await supabaseClient
            .from("inventory")
            .update({ item_status: "DISPATCHED" })
            .eq("code_colour", item.item_name);

          if (inventoryError) throw inventoryError;
        }
      }

      alert("Order has been dispatched successfully.");
      this.closeModal();
      if (
        window.adminOrder &&
        typeof window.adminOrder.loadOrders === "function"
      ) {
        window.adminOrder.loadOrders();
      }
    } catch (error) {
      console.error("Error dispatching order:", error);
      alert("Failed to dispatch order. Please try again.");
    }
  }

  toggleTrackingNumber() {
    const carrier = document.getElementById("dispatchCarrier").value;
    const trackingGroup = document.getElementById("trackingNumberGroup");
    const trackingInput = document.getElementById("trackingNumber");

    if (carrier === "PICK UP" || carrier === "OTHERS") {
      trackingGroup.style.display = "none";
      trackingInput.required = false;
      trackingInput.value = "";
    } else {
      trackingGroup.style.display = "block";
      trackingInput.required = true;
    }
  }

  closeModal() {
    this.modal.style.display = "none";
    document.getElementById("dispatchForm").style.display = "none";
    document.querySelector(".process-options").style.display = "flex";
    document.getElementById("dispatchForm").reset();

    // Ensure edit button stays disabled if order is on hold
    if (this.isHeld) {
      const orderRow = document.querySelector(
        `tr[data-order-id="${this.orderId}"]`
      );
      if (orderRow) {
        const editBtn = orderRow.querySelector(".edit-btn");
        if (editBtn) {
          editBtn.disabled = true;
          editBtn.style.opacity = "0.5";
          editBtn.style.cursor = "not-allowed";
          editBtn.title = "Cannot edit order while on hold";
          editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
          };
        }
      }
    }
  }
}

// Initialize and export instance
document.addEventListener("DOMContentLoaded", () => {
  // Create the instance
  const processOrder = new ProcessOrder();

  // Make it globally available
  window.processOrder = processOrder;

  // Dispatch an event to notify that processOrder is ready
  window.dispatchEvent(new CustomEvent("processOrderReady"));

  console.log("ProcessOrder module initialized");
});


//it's ok on 28/02/2025 - jim
