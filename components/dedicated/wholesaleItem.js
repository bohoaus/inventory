class WholesaleItem {
  constructor() {
    this.validGroups = ["BOHO", "PRIMROSE"];
    this.packSizes = new Map(); // Store pack sizes
    this.totalAmount = 0; // Track total amount
  }

  async addItem(formData) {
    try {
      // Convert pack sizes Map to a proper JSON object
      const packSizeData = {};
      this.packSizes.forEach((amount, size) => {
        packSizeData[size] = amount;
      });

      const itemData = {
        code_colour: formData.get("code_colour"),
        item_name: formData.get("item_name"),
        item_group: formData.get("item_group").toUpperCase(),
        item_location: formData.get("item_location"),
        stock_qty: parseInt(formData.get("stock_qty")) || 0,
        receive_qty: parseInt(formData.get("receive_qty")) || 0,
        item_status: formData.get("item_status") || "active",
        created_at: new Date().toISOString(),
        pack_size: packSizeData,
        item_cargo: formData.get("item_cargo") || null,
        mfg_date: formData.get("mfg_date") || null,
        item_category: formData.get("item_category") || null,
        release_date: formData.get("release_date") || null,
        item_note: formData.get("item_note") || null,
      };

      // Case-insensitive group validation
      if (!this.validGroups.includes(itemData.item_group.toUpperCase())) {
        throw new Error("Invalid item group. Must be either BOHO or PRIMROSE.");
      }

      // Log the data being sent
      console.log("Sending data to Supabase:", itemData);

      // Round receive_qty to nearest .5
      if (itemData.receive_qty) {
        itemData.receive_qty = this.roundToHalf(
          parseFloat(itemData.receive_qty)
        );
      }

      const { data, error } = await supabaseClient
        .from("inventory")
        .insert([itemData])
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error("Error adding wholesale item: " + error.message);
      }

      return data;
    } catch (error) {
      console.error("Error in addItem:", error);
      throw error;
    }
  }

  async editItem(itemId, formData) {
    const updates = {
      item_name: formData.get("item_name"),
      item_group: formData.get("item_group").toUpperCase(),
      item_location: formData.get("item_location"),
      stock_qty: parseInt(formData.get("stock_qty")) || 0,
      min_qty: parseInt(formData.get("min_qty")) || 0,
      wholesale_price: parseFloat(formData.get("wholesale_price")) || 0,
      moq: parseInt(formData.get("moq")) || 0,
      pack_size: parseInt(formData.get("pack_size")) || 1,
      updated_at: new Date().toISOString(),
    };

    // Case-insensitive group validation
    if (!this.validGroups.includes(updates.item_group.toUpperCase())) {
      throw new Error("Invalid item group. Must be either BOHO or PRIMROSE.");
    }

    const { data, error } = await supabaseClient
      .from("inventory")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      throw new Error("Error updating wholesale item: " + error.message);
    }

    return data;
  }

  async updateStock(itemId, quantity, type = "add") {
    const { data: item, error: fetchError } = await supabaseClient
      .from("inventory")
      .select("stock_qty")
      .eq("id", itemId)
      .single();

    if (fetchError) {
      throw new Error("Error fetching item: " + fetchError.message);
    }

    let newQuantity =
      type === "add" ? item.stock_qty + quantity : item.stock_qty - quantity;

    if (newQuantity < 0) {
      throw new Error("Insufficient stock quantity");
    }

    const { error: updateError } = await supabaseClient
      .from("inventory")
      .update({
        stock_qty: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (updateError) {
      throw new Error("Error updating stock: " + updateError.message);
    }
  }

  async getWholesaleItems(group = null) {
    let query = supabaseClient.from("inventory").select("*");

    if (group) {
      // Use ilike for case-insensitive comparison
      query = query.ilike("item_group", group);
    } else {
      // Use case-insensitive comparison for valid groups
      query = query.or(
        this.validGroups.map((g) => `item_group.ilike.${g}`).join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Error fetching wholesale items: " + error.message);
    }

    return data;
  }

  generateItemForm(item = null) {
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
      "KNITWEAR",
    ];

    const statuses = [
      "SHIPPING",
      "NEW RELEASE",
      "FULL PRICE",
      "ON SALE",
      "NOT RELEASED",
      "OUT OF STOCK",
      "CANCELLED RESTOCK",
      "OVERRESTOCK",
    ];

    const form = document.createElement("form");
    form.id = item ? "editItemForm" : "addItemForm";
    form.className = "item-form two-column";
    form.onsubmit = (e) => {
      e.preventDefault();
      return false;
    };

    form.innerHTML = `
        <div class="modal-header">
            <button type="button" 
                    class="add-item-btn" 
                    onclick="window.wholesaleItem.validateAndSubmit(this.closest('form'))"
                    disabled>
                ${item ? "Update Item" : "Add Item"}
            </button>
        </div>

        <div class="form-column">
            <!-- Left Column -->
            <div class="form-group required">
                <label for="code_colour">Code/Colour*</label>
                <input type="text" 
                       name="code_colour" 
                       required 
                       onkeyup="this.value = this.value.toUpperCase(); wholesaleItem.validateForm(this.closest('form'))"
                       onblur="wholesaleItem.checkCodeExists(this.value)"
                       ${item ? "disabled" : ""}>
                <span class="code-warning" style="display: none; color: #dc3545;">
                    Warning: This code already exists
                </span>
            </div>

            <div class="form-group required">
                <label for="item_group">Group*</label>
                <select name="item_group" 
                        required 
                        onchange="wholesaleItem.validateForm(this.closest('form'))">
                    <option value="">Select Group</option>
                    <option value="BOHO" ${
                      item?.item_group?.toUpperCase() === "BOHO"
                        ? "selected"
                        : ""
                    }>BOHO</option>
                    <option value="PRIMROSE" ${
                      item?.item_group?.toUpperCase() === "PRIMROSE"
                        ? "selected"
                        : ""
                    }>PRIMROSE</option>
                </select>
            </div>

            <div class="form-group">
                <label for="item_name">Name</label>
                <input type="text" 
                       name="item_name" placeholder="New Dress" 
                       value="${item?.item_name || ""}" 
                       onkeyup="this.value = this.value.toUpperCase()">
            </div>

            <div class="form-group">
                <label for="item_location">Location</label>
                <input type="text" 
                       name="item_location" placeholder="Floor" 
                       value="${item?.item_location || ""}"
                       onkeyup="this.value = this.value.toUpperCase()">
            </div>

            <div class="form-group pack-size-group required">
                <label>Pack Size</label>
                <div class="pack-size-inputs">
                    <input type="text" name="size" placeholder="2S+2M+2L+2XL" onkeyup="this.value = this.value.toUpperCase()">
                    <input type="number" name="amount" placeholder="Amount" step="1" min="0">
                    <button type="button" onclick="wholesaleItem.addPackSize()">Add</button>
                </div>
                <div class="pack-size-display">
                    <table class="pack-size-table">
                        <thead>
                            <tr>
                                <th>Size</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    <div class="total-amount">Total: <span>0</span></div>
                </div>
            </div>
        </div>

        <div class="form-column">
            <!-- Right Column -->
            <div class="form-group required">
                <label for="receive_qty">Received Quantity</label>
                <input type="number" 
                       name="receive_qty" 
                       step="0.5" 
                       min="0.5"
                       onchange="wholesaleItem.updateOnHandQty(this.value)">
                <span class="pack-size-warning" style="display: none; color: #dc3545;">
                    Please set pack size first
                </span>
            </div>

            <div class="form-group">
                <label for="stock_qty">On-Hand Quantity</label>
                <input type="number" 
                       name="stock_qty" 
                       step="0.5" 
                       min="0.5"
                       value="${item?.stock_qty || ""}"
                       onchange="wholesaleItem.updateReceiveQty(this.value)">
            </div>

            <div class="form-group required">
                <label for="item_category">Category</label>
                <select name="item_category">
                    <option value="">Select Category</option>
                    ${categories
                      .map(
                        (cat) => `
                        <option value="${cat}" ${
                          item?.item_category === cat ? "selected" : ""
                        }>
                            ${cat}
                        </option>
                    `
                      )
                      .join("")}
                </select>
            </div>

            <div class="form-group required">
                <label for="item_status">Status</label>
                <select name="item_status">
                    <option value="">Select Status</option>
                    ${statuses
                      .map(
                        (status) => `
                        <option value="${status}" ${
                          item?.item_status === status ? "selected" : ""
                        }>
                            ${status}
                        </option>
                    `
                      )
                      .join("")}
                </select>
            </div>

            <div class="form-group required">
                <label for="item_cargo">Cargo</label>
                <select name="item_cargo">
                    <option value="">Select Cargo</option>
                    <option value="AIR" ${
                      item?.item_cargo === "AIR" ? "selected" : ""
                    }>AIR</option>
                    <option value="SEA" ${
                      item?.item_cargo === "SEA" ? "selected" : ""
                    }>SEA</option>
                </select>
            </div>

            <div class="form-group required">
                <label for="mfg_date">MFG Date</label>
                <input type="date" name="mfg_date" value="${
                  item?.mfg_date || ""
                }">
            </div>

            <div class="form-group">
                <label for="item_note">Item Note</label>
                <textarea name="item_note" rows="3">${
                  item?.item_note === "OK" || ""
                }</textarea>
            </div>
        </div>
    </form>
    `;

    // Setup input trimming after form is created
    this.setupInputTrimming(form);

    return form;
  }

  async checkCodeExists(code) {
    if (!code) return;

    // Clean the code
    const cleanCode = code.trim().replace(/\s+/g, " ").toUpperCase();

    try {
      const { data: allMatches } = await supabaseClient
        .from("inventory")
        .select("*")
        .ilike("code_colour", cleanCode);

      // Find elements
      const warningElement = document.querySelector(".code-warning");
      const submitButton = document.querySelector(
        ".modal-header .add-item-btn"
      );

      // If elements don't exist, return early
      if (!warningElement || !submitButton) return;

      // Filter wholesale matches (BOHO or PRIMROSE)
      const wholesaleMatches = allMatches?.filter((item) => {
        const group = (item.item_group || "").toUpperCase().trim();
        const itemCode = item.code_colour
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase();
        return (
          (group === "BOHO" || group === "PRIMROSE") && itemCode === cleanCode
        );
      });

      // Filter ODM matches
      const odmMatches = allMatches?.filter((item) => {
        const group = (item.item_group || "").toUpperCase().trim();
        const itemCode = item.code_colour
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase();
        return group === "ODM" && itemCode === cleanCode;
      });

      if (wholesaleMatches && wholesaleMatches.length > 0) {
        const match = wholesaleMatches[0];
        warningElement.innerHTML = `
                <div class="warning-details">
                    <p>Warning: This code already exists</p>
                    <table class="warning-table">
                        <tr><th>Code:</th><td>${match.code_colour}</td></tr>
                        <tr><th>Name:</th><td>${
                          match.item_name || "-"
                        }</td></tr>
                        <tr><th>Group:</th><td>${
                          match.item_group || "-"
                        }</td></tr>
                        <tr><th>Category:</th><td>${
                          match.item_category || "-"
                        }</td></tr>
                    </table>
                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px;">
                        <p style="color: #856404; margin: 0;">
                            <strong>Important Notice:</strong> This might be a repeat item.
                            <br>
                            1. Please check with office staff to confirm.
                            <br>
                            2. If it is a repeat item, please go to the item list and edit the existing item's repeat record.
                            <br>
                            3. If it's a different item, please use a different code to avoid confusion.
                        </p>
                        <div style="margin-top: 10px;">
                            <button onclick="adminInventory.loadInventory(); adminInventory.closeModal();" 
                                    style="background: #0275d8; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                Go to Item List
                            </button>
                        </div>
                    </div>
                </div>
            `;
        warningElement.style.display = "block";
        submitButton.disabled = true;
        submitButton.style.cursor = "not-allowed";
        submitButton.style.backgroundColor = "#ccc";
      } else if (odmMatches && odmMatches.length > 0) {
        const match = odmMatches[0];
        warningElement.innerHTML = `
                <div class="warning-details">
                    <p>Warning: This code exists in ODM items</p>
                    <table class="warning-table">
                        <tr><th>Code:</th><td>${match.code_colour}</td></tr>
                        <tr><th>Customer:</th><td>${
                          match.odm_customer || "-"
                        }</td></tr>
                        <tr><th>PPO:</th><td>${match.odm_ppo || "-"}</td></tr>
                        <tr><th>Category:</th><td>${
                          match.item_category || "-"
                        }</td></tr>
                    </table>
                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px;">
                        <p style="color: #856404; margin: 0;">
                            <strong>Suggestion:</strong> To avoid confusion with ODM items, please add an extension to the code.
                            <br>
                            Example: ${cleanCode}-W, W-${cleanCode}, etc.
                        </p>
                    </div>
                </div>
            `;
        warningElement.style.display = "block";
        submitButton.disabled = true;
        submitButton.style.cursor = "not-allowed";
        submitButton.style.backgroundColor = "#ccc";
      } else {
        warningElement.style.display = "none";
        submitButton.disabled = false;
        submitButton.style.cursor = "pointer";
        submitButton.style.backgroundColor = "#28a745";
      }
    } catch (error) {
      const warningElement = document.querySelector(".code-warning");
      const submitButton = document.querySelector(
        ".modal-header .add-item-btn"
      );

      if (warningElement && submitButton) {
        warningElement.textContent = "Error checking code availability";
        warningElement.style.display = "block";
        submitButton.disabled = true;
        submitButton.style.cursor = "not-allowed";
        submitButton.style.backgroundColor = "#ccc";
      }
    }
  }

  // Add this method to handle pack size additions
  addPackSize() {
    const sizeInput = document.querySelector('input[name="size"]');
    const amountInput = document.querySelector('input[name="amount"]');
    const size = sizeInput.value.trim().toUpperCase();
    const amount = parseInt(amountInput.value);

    if (!size || !amount) {
      this.showError("Please enter both size and amount");
      return;
    }

    // Add to pack sizes map
    this.packSizes.set(size, amount);
    this.totalAmount += amount;

    // Update the display
    this.updatePackSizeDisplay();

    // Recalculate quantities if they exist
    const receiveQtyInput = document.querySelector('input[name="receive_qty"]');
    const stockQtyInput = document.querySelector('input[name="stock_qty"]');

    if (receiveQtyInput.value) {
      this.updateOnHandQty(receiveQtyInput.value);
    } else if (stockQtyInput.value) {
      this.updateReceiveQty(stockQtyInput.value);
    }

    // Clear inputs
    sizeInput.value = "";
    amountInput.value = "";
  }

  // Add this method to update the pack size display
  updatePackSizeDisplay() {
    const tbody = document.querySelector(".pack-size-table tbody");
    const totalSpan = document.querySelector(".total-amount span");

    // Clear existing rows
    tbody.innerHTML = "";

    // Add rows for each pack size
    this.packSizes.forEach((amount, size) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${size}</td>
                <td>${amount}</td>
                <td>
                    <button type="button" onclick="wholesaleItem.removePackSize('${size}')">
                        Remove
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });

    // Update total
    totalSpan.textContent = this.totalAmount;
  }

  // Add this method to remove pack sizes
  removePackSize(size) {
    const amount = this.packSizes.get(size);
    this.totalAmount -= amount;
    this.packSizes.delete(size);
    this.updatePackSizeDisplay();

    // Recalculate received and stock quantities
    const receiveQtyInput = document.querySelector('input[name="receive_qty"]');
    if (this.totalAmount === 0) {
      receiveQtyInput.value = "";
      document.querySelector('input[name="stock_qty"]').value = "";
      const warningElement = document.querySelector(".pack-size-warning");
      warningElement.textContent = "Please set pack size first";
      warningElement.style.display = "block";
    } else if (receiveQtyInput.value) {
      this.updateOnHandQty(receiveQtyInput.value);
    }
  }

  // Add this method to update on-hand quantity
  updateOnHandQty(value) {
    const stockQtyInput = document.querySelector('input[name="stock_qty"]');
    const receiveQtyInput = document.querySelector('input[name="receive_qty"]');
    const warningElement = document.querySelector(".pack-size-warning");
    const submitButton = document.querySelector(".add-item-btn");

    if (this.totalAmount === 0) {
      warningElement.textContent = "Please set pack size first";
      warningElement.style.display = "block";
      submitButton.disabled = true;
      submitButton.setAttribute("data-warning", "true");
      return;
    }

    warningElement.style.display = "none";

    // Ensure minimum value of 0.5
    let inputQty = Math.max(0.5, parseFloat(value) || 0);

    // Calculate packs (divide by pack size total and floor the result)
    const packs = Math.floor(inputQty / this.totalAmount);

    // Calculate final received quantity (packs * total amount)
    const finalQty = (packs * this.totalAmount).toFixed(1);

    // Update both inputs with calculated values
    receiveQtyInput.value = packs; // Set receive qty to match packs calculation
    stockQtyInput.value = packs; // Set stock qty to number of packs

    // Show calculation with original input and floored result
    warningElement.innerHTML = `
        <div style="color: #0066cc; margin-top: 5px;">
            ${inputQty} / ${this.totalAmount} = ${packs} packs (${finalQty} pcs)
            ${
              inputQty !== finalQty
                ? `<br><span style="color: #dc3545;">Quantity adjusted to ${finalQty} to match pack size</span>`
                : ""
            }
        </div>
    `;
    warningElement.style.display = "block";

    // Re-enable submit button if everything is valid
    submitButton.removeAttribute("data-warning");
    this.validateForm(receiveQtyInput.closest("form"));
  }

  // Add helper method to show errors
  showError(message) {
    const warningElement = document.querySelector(".pack-size-warning");
    warningElement.textContent = message;
    warningElement.style.display = "block";
    setTimeout(() => {
      warningElement.style.display = "none";
    }, 3000);
  }

  // Add new method to handle form submission
  async submitForm(form) {
    try {
      // Clean all text inputs
      form.querySelectorAll('input[type="text"], textarea').forEach((input) => {
        input.value = input.value.trim().replace(/\s+/g, " ").toUpperCase();
      });

      const formData = new FormData(form);

      // Convert pack sizes Map to a proper JSON object
      const packSizeData = {};
      this.packSizes.forEach((amount, size) => {
        packSizeData[size] = amount;
      });

      // Prepare item data with clean text and pack_unit
      const itemData = {
        // Required fields with clean text
        code_colour: formData
          .get("code_colour")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase(),
        item_group: formData
          .get("item_group")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase(),
        pack_size: packSizeData,
        // Add pack_unit based on total pack size amount
        pack_unit: this.totalAmount,
        created_at: new Date().toISOString(),

        // Optional fields with clean text
        ...(formData.get("item_name") && {
          item_name: formData
            .get("item_name")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
        }),
        ...(formData.get("item_location") && {
          item_location: formData
            .get("item_location")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
        }),
        ...(formData.get("stock_qty") && {
          stock_qty: parseFloat(formData.get("stock_qty")),
        }),
        ...(formData.get("receive_qty") && {
          receive_qty: parseFloat(formData.get("receive_qty")),
        }),
        ...(formData.get("item_status") && {
          item_status: formData
            .get("item_status")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
        }),
        ...(formData.get("item_category") && {
          item_category: formData
            .get("item_category")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
        }),
        ...(formData.get("item_cargo") && {
          item_cargo: formData
            .get("item_cargo")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
        }),
        ...(formData.get("mfg_date") && {
          mfg_date: formData.get("mfg_date"),
        }),
        ...(formData.get("release_date") && {
          release_date: formData.get("release_date"),
        }),
        ...(formData.get("item_note") && {
          item_note: formData
            .get("item_note")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
        }),
      };

      // Insert into database
      const { data, error } = await supabaseClient
        .from("inventory")
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      // Show success notification
      adminInventory.showNotification("Item added successfully", "success");

      // Use standardized modal closing
      adminInventory.closeModal();

      // Refresh inventory table
      adminInventory.loadInventory();

      // Reset form data
      this.packSizes.clear();
      this.totalAmount = 0;
    } catch (error) {
      console.error("Error in submitForm:", error);
      adminInventory.showNotification(error.message, "error");
    }
  }

  // Add method to handle keyboard events
  setupFormKeyboardHandler(form) {
    if (!form) return;

    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.validateAndSubmit(form);
      }
    });
  }

  // Add this method to handle input trimming
  setupInputTrimming(form) {
    if (!form) return;

    const inputs = form.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => {
      // Special handling for code_colour input
      if (input.name === "code_colour") {
        input.addEventListener("paste", async (e) => {
          e.preventDefault();

          // Get and clean pasted content - allow single spaces
          let pastedText = (e.clipboardData || window.clipboardData)
            .getData("text")
            .trim() // Remove start/end spaces
            .replace(/\s+/g, " ") // Replace multiple spaces with single space
            .toUpperCase(); // Convert to uppercase

          // Update input value
          input.value = pastedText;

          // Trigger code check immediately after paste
          await this.checkCodeExists(pastedText);
        });

        // Allow single spaces in code_colour field
        input.addEventListener("input", (e) => {
          if (e.inputType !== "insertFromPaste") {
            let value = e.target.value
              .replace(/\s+/g, " ") // Replace multiple spaces with single space
              .toUpperCase(); // Convert to uppercase

            if (value !== e.target.value) {
              e.target.value = value;
            }
          }
        });
      }
    });
  }

  // Add new method to update receive quantity based on stock quantity
  updateReceiveQty(stockQty) {
    const stockQtyInput = document.querySelector('input[name="stock_qty"]');
    const receiveQtyInput = document.querySelector('input[name="receive_qty"]');
    const warningElement = document.querySelector(".pack-size-warning");
    const submitButton = document.querySelector(".add-item-btn");

    if (this.totalAmount === 0) {
      warningElement.textContent = "Please set pack size first";
      warningElement.style.display = "block";
      return;
    }

    // Get receive qty value
    const receiveQty = parseFloat(receiveQtyInput.value) || 0;

    // Parse and validate stock quantity
    let stockValue = parseFloat(stockQty) || 0;

    if (stockValue > receiveQty) {
      warningElement.innerHTML = `
            <div style="color: #dc3545; margin-top: 5px;">
                On-hand quantity cannot exceed received quantity (${receiveQty})
            </div>
        `;
      warningElement.style.display = "block";
      stockQtyInput.value = receiveQty.toFixed(1);

      // Disable submit button and add warning attribute
      submitButton.disabled = true;
      submitButton.setAttribute("data-warning", "true");
    } else {
      warningElement.style.display = "none";
      stockQtyInput.value = stockValue.toFixed(1);

      // Remove warning attribute and re-validate form
      submitButton.removeAttribute("data-warning");
      this.validateForm(stockQtyInput.closest("form"));
    }
  }

  // Add new validation methods
  validateForm(form) {
    if (!form) return;

    const codeInput = form.querySelector('input[name="code_colour"]');
    const groupSelect = form.querySelector('select[name="item_group"]');
    const submitButton = form.querySelector(".add-item-btn");

    if (!codeInput || !groupSelect || !submitButton) return;

    // Remove any existing warning attribute
    submitButton.removeAttribute("data-warning");

    // Trim the code value to check for empty or whitespace-only input
    const isValid = codeInput.value.trim() !== "" && groupSelect.value !== "";

    submitButton.disabled = !isValid;
    submitButton.style.cursor = isValid ? "pointer" : "not-allowed";
    submitButton.style.backgroundColor = isValid ? "#28a745" : "#ccc";

    // Add visual feedback for empty required fields
    if (!codeInput.value.trim()) {
      codeInput.classList.add("invalid");
    } else {
      codeInput.classList.remove("invalid");
    }

    if (!groupSelect.value) {
      groupSelect.classList.add("invalid");
    } else {
      groupSelect.classList.remove("invalid");
    }
  }

  validateAndSubmit(form) {
    const codeInput = form.querySelector('input[name="code_colour"]');
    const groupSelect = form.querySelector('select[name="item_group"]');
    const receiveQtyInput = form.querySelector('input[name="receive_qty"]');
    const categorySelect = form.querySelector('select[name="item_category"]');
    const statusSelect = form.querySelector('select[name="item_status"]');
    const cargoSelect = form.querySelector('select[name="item_cargo"]');
    const mfgDateInput = form.querySelector('input[name="mfg_date"]');
    const hasSizes = this.packSizes.size > 0;

    // Trim the code value to check for empty or whitespace-only input
    const codeValue = codeInput.value.trim();

    if (!codeValue) {
      adminInventory.showNotification("Please enter Code/Colour", "error");
      codeInput.focus();
      return;
    }

    if (!groupSelect.value) {
      adminInventory.showNotification("Please select a Group", "error");
      groupSelect.focus();
      return;
    }

    if (!receiveQtyInput.value) {
      adminInventory.showNotification(
        "Please enter Received Quantity",
        "error"
      );
      receiveQtyInput.focus();
      return;
    }

    if (!hasSizes) {
      adminInventory.showNotification(
        "Please add at least one pack size",
        "error"
      );
      return;
    }

    if (!categorySelect.value) {
      adminInventory.showNotification("Please select a Category", "error");
      categorySelect.focus();
      return;
    }

    if (!statusSelect.value) {
      adminInventory.showNotification("Please select a Status", "error");
      statusSelect.focus();
      return;
    }

    if (!cargoSelect.value) {
      adminInventory.showNotification("Please select a Cargo", "error");
      cargoSelect.focus();
      return;
    }

    if (!mfgDateInput.value) {
      adminInventory.showNotification(
        "Please enter Manufacturing Date",
        "error"
      );
      mfgDateInput.focus();
      return;
    }

    // If validation passes, submit the form
    this.submitForm(form);
  }

  // Add or update the rounding helper method
  roundToHalf(num) {
    if (!num) return 0;
    return Math.round(num * 2) / 2;
  }

  // Add method to reset form state
  resetForm() {
    this.packSizes.clear();
    this.totalAmount = 0;
    const form = document.querySelector("#addItemForm");
    if (form) {
      form.reset();
      const submitButton = form.querySelector(".add-item-btn");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.removeAttribute("data-warning");
        submitButton.style.cursor = "not-allowed";
        submitButton.style.backgroundColor = "#ccc";
      }
      const warningElement = form.querySelector(".code-warning");
      if (warningElement) {
        warningElement.style.display = "none";
      }
    }
  }
}

// Initialize the global instance
window.wholesaleItem = new WholesaleItem();
