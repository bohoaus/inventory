class EditOdmItem {
  constructor() {
    this.initialize();
  }

  initialize() {
    // Add any initialization logic here
  }

  generateEditForm(item) {
    const form = document.createElement("form");
    form.id = "editItemForm";
    form.className = "edit-form three-column";
    form.onsubmit = (e) => {
      e.preventDefault();
      return false;
    };

    const categories = [
      "CAPE",
      "DRESS",
      "KAFTAN",
      "KIMONO",
      "MAXI",
      "PANT",
      "SHIRT",
      "SKIRT",
      "TOP",
      "TUNIC",
      "COAT",
      "JACKET",
      "Knit Top",
      "Knit Dress",
      "Knitwear",
    ];

    const statuses = [
      "SHIPPING",
      "ARRIVED",
      "ON HOLD",
      "PROCESSING",
      "DISPATCHED",
      "CANCELLED",
      "Issue & Return",
    ];

    form.innerHTML = `
      <div class="form-column">
        <!-- First Column -->
        <div class="form-group required">
          <label for="code_colour">Code/Colour</label>
          <input type="text" 
                 name="code_colour" 
                 value="${item.code_colour || ""}"
                 required 
                 readonly>
        </div>

        <div class="form-group">
          <label for="item_group">Group</label>
          <select name="item_group" required>
            <option value="">Select Group</option>
            <option value="ODM" ${
              item.item_group === "ODM" ? "selected" : ""
            }>ODM</option>
            <option value="BOHO" ${
              item.item_group === "BOHO" ? "selected" : ""
            }>BOHO</option>
            <option value="PRIMROSE" ${
              item.item_group === "PRIMROSE" ? "selected" : ""
            }>PRIMROSE</option>
          </select>
        </div>

        <div class="form-group">
          <label for="odm_ppo">ODM PPO</label>
          <input type="text" 
                 name="odm_ppo" 
                 value="${item.odm_ppo || ""}"
                 onkeyup="this.value = this.value.toUpperCase()">
        </div>

        <div class="form-group">
          <label for="odm_customer">ODM Customer</label>
          <input type="text" 
                 name="odm_customer" 
                 value="${item.odm_customer || ""}"
                 onkeyup="this.value = this.value.toUpperCase()">
        </div>
      </div>

      <div class="form-column">
        <!-- Second Column -->
        <div class="form-group">
          <label for="item_category">Category</label>
          <select name="item_category">
            <option value="">Select Category</option>
            ${categories
              .map(
                (cat) => `
              <option value="${cat}" ${
                  item.item_category === cat ? "selected" : ""
                }>
                ${cat}
              </option>
            `
              )
              .join("")}
          </select>
        </div>
        
          <div class="form-group">
            <label for="item_name">Item Name</label>
                    <input type="text" 
                           name="item_name" 
                           value="${item.item_name || ""}"
                           onkeyup="this.value = this.value.toUpperCase()">
          </div>

        <div class="form-group">
          <label for="item_status">Status</label>
          <select name="item_status">
            <option value="">Select Status</option>
            ${statuses
              .map(
                (status) => `
              <option value="${status}" ${
                  item.item_status === status ? "selected" : ""
                }>
                ${status}
              </option>
            `
              )
              .join("")}
          </select>
        </div>

        <div class="form-group">
          <label for="item_location">Location</label>
          <input type="text" 
                 name="item_location" 
                 value="${item.item_location || ""}"
                 onkeyup="this.value = this.value.toUpperCase()">
        </div>
      </div>

      <div class="form-column">
        <!-- Third Column -->
        <div class="form-group">
          <label for="receive_qty">Receive Quantity (Pieces)</label>
          <input type="number" 
                 name="receive_qty" 
                 value="${item.receive_qty || 1}"
                 min="1"
                 step="1"
                 onchange="window.editOdmItem.validateQuantities(this.closest('form'))">
        </div>

        <div class="form-group">
          <label for="stock_qty">Stock Quantity (Pieces)</label>
          <input type="number" 
                 name="stock_qty" 
                 value="${item.stock_qty || 0}"
                 min="0"
                 step="1"
                 onchange="window.editOdmItem.validateQuantities(this.closest('form'))">
        </div>
        
        <div class="form-group">
          <label for="item_note">Note</label>
          <textarea name="item_note" 
                    rows="3"
                    onkeyup="this.value = this.value.toUpperCase()">${
                      item.item_note || ""
                    }</textarea>
        </div>
      </div>

      <!-- Full width sections at the bottom -->
      <div class="form-full-width">
        <div class="form-actions">
          <button type="button" 
                  class="save-item-btn" 
                  onclick="window.editOdmItem.validateAndSubmit(this.closest('form'))"
                  disabled>
            Save Changes
          </button>
        </div>
      </div>
    `;

    // Setup form handlers after the form is populated
    this.setupInputTrimming(form);
    this.setupFormKeyboardHandler(form);

    // Initial validation after form is populated
    setTimeout(() => this.validateForm(form), 0);

    return form;
  }

  validateForm(form) {
    if (!form) return;

    const codeInput = form.querySelector('input[name="code_colour"]');
    const submitButton = form.querySelector(".save-item-btn");

    // Only validate code_colour since it's the only required field
    const isValid =
      codeInput.value.trim() !== "" &&
      !submitButton.hasAttribute("data-warning");

    submitButton.disabled = !isValid;

    if (!codeInput.value.trim()) {
      codeInput.classList.add("invalid");
    } else {
      codeInput.classList.remove("invalid");
    }
  }

  validateQuantities(form) {
    if (!form) return;

    const receiveQty = form.querySelector('input[name="receive_qty"]');
    const stockQty = form.querySelector('input[name="stock_qty"]');

    // Handle receive quantity
    let receiveValue = parseInt(receiveQty.value) || 0;
    receiveValue = Math.max(1, receiveValue); // Minimum 1
    receiveQty.value = receiveValue;

    // Handle stock quantity
    let stockValue = parseInt(stockQty.value) || 0;
    stockValue = Math.max(0, stockValue); // Minimum 0

    // Ensure stock doesn't exceed receive
    if (stockValue > receiveValue) {
      stockValue = receiveValue;
      adminInventory.showNotification(
        "Stock quantity cannot exceed receive quantity",
        "warning"
      );
    }

    stockQty.value = stockValue;

    // Add visual feedback
    if (stockValue > receiveValue) {
      stockQty.classList.add("invalid");
    } else {
      stockQty.classList.remove("invalid");
    }

    // Update form validation
    this.validateForm(form);
  }

  validateAndSubmit(form) {
    const codeInput = form.querySelector('input[name="code_colour"]');
    const codeValue = codeInput.value.trim();

    if (!codeValue) {
      adminInventory.showNotification("Please enter Code/Colour", "error");
      codeInput.focus();
      return;
    }

    // Remove group validation since it's always ODM
    this.submitForm(form);
  }

  setupInputTrimming(form) {
    if (!form) return;

    const inputs = form.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => {
      if (input.name === "code_colour") {
        input.addEventListener("paste", async (e) => {
          e.preventDefault();
          let pastedText = (e.clipboardData || window.clipboardData)
            .getData("text")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase();

          input.value = pastedText;
        });

        input.addEventListener("input", (e) => {
          if (e.inputType !== "insertFromPaste") {
            let value = e.target.value.replace(/\s+/g, " ").toUpperCase();

            if (value !== e.target.value) {
              e.target.value = value;
            }
          }
        });
      }
    });
  }

  setupFormKeyboardHandler(form) {
    if (!form) return;

    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.validateAndSubmit(form);
      }
    });
  }

  async submitForm(form) {
    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const receiveQty = parseInt(data.receive_qty);
      const stockQty = parseInt(data.stock_qty);

      // Validate quantities
      if (receiveQty < 1) {
        adminInventory.showNotification(
          "Receive quantity must be at least 1",
          "error"
        );
        return;
      }

      if (stockQty > receiveQty) {
        adminInventory.showNotification(
          "Stock quantity cannot exceed receive quantity",
          "error"
        );
        return;
      }

      // Get the item ID from the code_colour field
      const { data: existingItem } = await supabaseClient
        .from("inventory")
        .select("id")
        .eq("code_colour", data.code_colour)
        .single();

      if (!existingItem?.id) {
        throw new Error("Item not found");
      }

      // Prepare update data with new fields
      const updateData = {
        item_group: data.item_group,
        odm_ppo: data.odm_ppo,
        odm_customer: data.odm_customer,
        item_category: data.item_category,
        item_name: data.item_name,
        item_status: data.item_status,
        receive_qty: receiveQty,
        stock_qty: stockQty,
        item_note: data.item_note,
        item_location: data.item_location,
        updated_at: new Date().toISOString(),
        sprice: data.sprice,
        sfabric: data.sfabric,
        scolour: data.scolour,
        sfactory: data.sfactory,
        scountry: data.scountry,
        swsp: data.swsp,
        swsp2: data.swsp2,
      };

      const { error: updateError } = await supabaseClient
        .from("inventory")
        .update(updateData)
        .eq("id", existingItem.id);

      if (updateError) throw updateError;

      adminInventory.showNotification("Item updated successfully", "success");
      adminInventory.closeModal();
      adminInventory.loadInventory();
    } catch (error) {
      console.error("Error updating item:", error);
      adminInventory.showNotification(
        error.message || "Error updating item",
        "error"
      );
    }
  }
}

// Initialize the global instance
window.editOdmItem = new EditOdmItem();

// Keep the DOMContentLoaded event for additional setup if needed
document.addEventListener("DOMContentLoaded", () => {
  if (!window.editOdmItem) {
    window.editOdmItem = new EditOdmItem();
  }
});
