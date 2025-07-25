//ok on 16/03/2025

class OdmItem {
  constructor() {
    this.itemGroup = "ODM";
    this.initialize();
  }

  initialize() {
    // Add any initialization logic here
  }

  async addItem(formData) {
    const itemData = {
      code_colour: formData.get("code_colour"),
      item_name: formData.get("item_name"),
      odm_customer: formData.get("odm_customer"),
      odm_ppo: formData.get("odm_ppo"),
      item_group: this.itemGroup,
      receive_qty: formData.get("receive_qty") || 0,
      stock_qty: formData.get("stock_qty") ||  0,
      item_category: formData.get("item_category") || "",
      item_status: formData.get("item_status") || "",
      item_cargo: formData.get("item_cargo") || "",
      mfg_date: formData.get("mfg_date") || null,
      est_date: formData.get("est_date") || null,
      arrive_date: formData.get("arrive_date") || null,
      item_note: formData.get("item_note") || "",
      created_at: new Date().toISOString(),
      sfabric: formData.get("sfabric"),
      scolour: formData.get("scolour"),
      sfactory: formData.get("sfactory"),
      scountry: formData.get("scountry"),
      pack_unit: formData.get("pack_unit"),
      pack_size: formData.get("pack_size"),
      freight_bags: formData.get("freight_bags"),
    };

    const { data, error } = await supabaseClient
      .from("inventory")
      .insert([itemData])
      .select()
      .single();

    if (error) {
      throw new Error("Error adding ODM item: " + error.message);
    }

    return data;
  }

  async editItem(itemId, formData) {
    const updates = {
      code_colour: formData.get("code_colour"),
      item_name: formData.get("item_name"),
      odm_customer: formData.get("odm_customer"),
      odm_ppo: formData.get("odm_ppo"),
      item_group: this.itemGroup,
      receive_qty: formData.get("receive_qty") || 0,
      stock_qty: 0,
      item_category: formData.get("item_category") || "",
      item_status: formData.get("item_status") || "",
      item_cargo: formData.get("item_cargo") || "",
      mfg_date: formData.get("mfg_date") || null,
      est_date: formData.get("est_date") || null,
      arrive_date: formData.get("arrive_date") || null,
      item_note: formData.get("item_note") || "",
      updated_at: new Date().toISOString(),
      sfabric: formData.get("sfabric"),
      scolour: formData.get("scolour"),
      sfactory: formData.get("sfactory"),
      scountry: formData.get("scountry"),
      pack_unit: formData.get("pack_unit"),
      pack_size: formData.get("pack_size"),
      freight_bags: formData.get("freight_bags"),
    };

    const { data, error } = await supabaseClient
      .from("inventory")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      throw new Error("Error updating ODM item: " + error.message);
    }

    return data;
  }

  async updateItemStatus(itemId, status) {
    const validStatuses = [
      "SHIPPING-A",
      "SHIPPING-S",
      "SHIPPING",
      "ARRIVED",
      "NOT RELEASED",
      "RELEASED",
      "IN STOCK",
      "DISPATCHED",
      "PRE-ORDER",
      "REPEAT",
      "OUT OF STOCK",
      "PROCESSING",
      "ON HOLD",
      "CANCELLED",
      "QUALITY ISSUE",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status for ODM item");
    }

    const { error } = await supabaseClient
      .from("inventory")
      .update({
        item_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (error) {
      throw new Error("Error updating item status: " + error.message);
    }
  }

  async getOdmItems(status = null) {
    let query = supabaseClient
      .from("inventory")
      .select("*")
      .eq("item_group", this.itemGroup.toUpperCase());

    if (status) {
      query = query.eq("item_status", status.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Error fetching ODM items: " + error.message);
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
      "TEE",
      "TOP",
      "TUNIC",
      "COAT",
      "JACKET",
      "KNIT TOP",
      "KNIT DRESS",
      "KNIT VEST",
      "KNITWEAR",
    ];

    const statuses = [
      "SHIPPING-A",
      "SHIPPING-S",
      "SHIPPING",
      "ARRIVED",
      "PROCESSING",
      "ON HOLD",
      "DISPATCHED",
      "CANCELLED",
      "QUALITY ISSUE",
    ];

    const sfabrics = [
      "Blend",
      "Bamboo Rayon",
      "Cotton",
      "Cotton+",
      "Denim",
      "Crinkle Rayon",
      "Linen",
      "Nelon",
      "Polyester",
      "Polyester+",
      "Rayon",
      "Rayon+",
      "Silk",
      "Tencel",
      "Viscose",
      "Viscose+",
      "Acrylic",
      "Acrylic+",
      "polyamide+",
      "Wool",
      "Wool+",
    ];

    const sodm_customers = [
      "Bella Boheme",
      "Billy J Btq",
      "CIRCLE OF FRIEND",
      "COCO AND BLUSH",
      "EVERGREEN CLOTHNG",
      "LIFE STORY DESIGN",
      "LOVE STYLE CO",
      "ORANGE SHEBERT",
      "SALTY CRUSH",
      "SHE STREET",
      "SHINE ON",
      "ST FROCK",
      "THINGZ",
      "TULIO",
      "TWO BIRDS BLUE",
      "VINE APPAREL",
    ];
    
    const sfactories = [
      "SS+8620",
      "YJ+8620",
      "K-DH+8620",
      "K-HRZX+8620",
      "K-LG+8620",
      "K-MX+8620",
      "K-RD+8620",
      "K-YED+8620",
      "K-YP+8620",
      "K-Z",
    ];
    
    const scountries = [
      "CHN+86",
      "BGD+880",
      "IDN+62",
      "IND+91",
      "JPN+81",
      "THA+66",
      "VNM+84",
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
                    onclick="odmItem.validateAndSubmit(this.closest('form'))"
                    disabled>
                ${item ? "Update Item" : "Add ODM Item"}
            </button>
        </div>

        <div class="form-column">
            <!-- Left Column -->
            <div class="form-group required">
                <label for="code_colour">Code</label>
                <input type="text" maxlength="30" name="code_colour" required 
                       onkeyup="this.value = this.value.toUpperCase(); odmItem.validateForm(this.closest('form'))" 
                       onblur="odmItem.checkCodeExists(this.value)" 
                       ${item ? "disabled" : ""}>
                <span class="code-warning" style="display: none; color: #dc3545;">
                    Warning: This code already exists
                </span>
            </div>

            <!-- jim changed -->
            <div class="form-group-odm required">           
                <label for="odm_customer" style="width: 120px">Customer</label>
                <select name="odm_customer" 
                  onchange="odmItem.validateForm(this.closest('form'))">
                    <option value="">Select Customer</option>
                    ${sodm_customers
                      .map(
                        (sodmc) => `
                        <option value="${sodmc}" ${
                          item?.odm_customer === sodmc ? "selected" : ""
                        }>
                            ${sodmc}
                        </option>
                    `
                      )
                      .join("")}
                </select>
            </div>

            <div class="form-group-odm">
                <label for="odm_ppo" style="width: 120px">ODM PPO</label>
                <input type="text" maxlength="15" 
                       name="odm_ppo" placeholder="PO" 
                       value="${item?.odm_ppo || "PO"}"
                       onkeyup="this.value = this.value.toUpperCase()">
            </div>

            <div class="form-group-odm required">
                <label for="receive_qty" style="width: 120px">Received Qty</label>
                <input type="number" maxlength="4" placeholder="00" 
                       name="receive_qty" step="1" min="1"  max="9000" 
                       value="${item?.receive_qty || ""}" 
                       onchange="odmItem.validateForm(this.closest('form'))">
            </div>

             <div class="form-group-odm required">
                <label for="stock_qty" style="width: 120px">Stock Qty</label>
                <input type="number" maxlength="4" 
                       name="stock_qty" value="" step="1" min="1"  max="9000"
                       value="${item?.stock_qty || ""}" 
                       onchange="odmItem.validateForm(this.closest('form'))">
            </div>

            <div class="form-group-odm">
                <label for="freight_bags" style="width: 120px">Bags</label>
                <input type="number" maxlength="5" name="freight_bags" 
                       placeholder="00.00" step="0.5" min="0.5"  max="100" 
                       value="${item?.freight_bags || ""}">
            </div>

            <div class="form-group-odm required">
                <label for="mfg_date" style="width: 120px">MFG Date</label>
                <input type="date" name="mfg_date"  maxlength="4" 
                       value="${item?.mfg_date || ""}">
            </div>

            <div class="form-group-odm">
                <label for="est_date" style="width: 120px">ScheduleDate</label>
                <input type="date" name="est_date" 
                       value="${item?.est_date || ""}">
            </div>

            <div class="form-group-odm">
                <label for="arrive_date" style="width: 120px">ArriveDate</label>
                <input type="date" name="arrive_date" 
                       value="${item?.arrive_date || ""}">
            </div>
        </div>

        <div class="form-column">
            <!-- Right Column -->
            <div class="form-group required">
                <label for="item_category">Category</label>
                <select name="item_category" 
                  onchange="odmItem.validateForm(this.closest('form'))">
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
            
            <div class="form-group-odm required">
                <label for="item_name" style="width: 120px">Item Name</label>
                <input type="text" maxlength="25" 
                       name="item_name" placeholder="new dress" 
                       value="${item?.item_name || "new dress"}"
                >
            </div>

            <div class="form-group-odm required">
                <label for="sfabric" style="width: 120px">Fabric</label>
                <select name="sfabric">
                    <option value="">Select Fabric</option>
                    ${sfabrics
                      .map(
                        (sfabrics) => `
                        <option value="${sfabrics}" ${
                          item?.sfabric === sfabrics ? "selected" : ""
                        }>
                            ${sfabrics}
                        </option>
                    `
                      )
                      .join("")}
                </select>
            </div>

            <div class="form-group-odm required">
                <label for="scolour" style="width: 120px">Colour</label>
                <input type="text" maxlength="15" 
                       name="scolour" placeholder="black" 
                       value="${item?.scolour || ""}"
                >
            </div>

            <div class="form-group-odm required">
                <label for="item_status" style="width: 120px">Status</label>
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

            <div class="form-group-odm required">
                <label for="item_cargo" style="width: 120px">Cargo</label>
                <select name="item_cargo">
                    <option value="">Select Cargo</option>
                    <option value="AIR" ${
                      item?.item_cargo === "AIR-t" ? "selected" : ""
                    }>AIR</option>
                    <option value="SEA" ${
                      item?.item_cargo === "SEA-t" ? "" : ""
                    }>SEA</option>
                </select>
            </div>

            <div class="form-group-odm required">
                <label for="scountry" style="width: 120px">Country</label>
                <select name="scountry">
                    <option value="">Select Country</option>
                    ${scountries
                      .map(
                        (scount) => `
                        <option value="${scount}" ${
                          item?.scountry === scount ? "selected" : ""
                        }>
                            ${scount}
                        </option>
                    `
                      )
                      .join("")}
                </select>
            </div>

            <div class="form-group-odm required">
                <label for="sfactory" style="width: 120px">Factory</label>
                <select name="sfactory">
                    <option value="">Select Factory</option>
                    ${sfactories
                      .map(
                        (sfact) => `
                        <option value="${sfact}" ${
                          item?.sfactory === sfact ? "selected" : ""
                        }>
                            ${sfact}
                        </option>
                    `
                      )
                      .join("")}
                </select>
            </div>

            <div class="form-group-odm">
                <label for="item_note" style="width: 120px">Item Note</label>
                <textarea maxlength="50" name="item_note" placeholder="OK" style="width: 250px; color: red" 
                          rows="5"
                          onkeyup="this.value = this.value.toUpperCase()">${
                            item?.item_note || "OK"
                          }</textarea>
            </div>
        </div>
    `;

    // Add event listeners for all required fields
    const requiredFields = [
      "code_colour",
      "odm_customer",
      "receive_qty",
      "item_category",
      "item_status",
      "item_cargo",
      "mfg_date",
    ];

    requiredFields.forEach((fieldName) => {
      const element = form.querySelector(`[name="${fieldName}"]`);
      if (element) {
        // Use input event for text/number inputs and change event for selects
        const eventType = element.tagName === "SELECT" ? "change" : "input";
        element.addEventListener(eventType, () => this.validateForm(form));
      }
    });

    return form;
  }

  validateForm(form) {
    if (!form) return;

    const codeInput = form.querySelector('input[name="code_colour"]');
    const customerInput = form.querySelector('select[name="odm_customer"]');
    const receiveQtyInput = form.querySelector('input[name="receive_qty"]');
    const itemCategoryInput = form.querySelector('select[name="item_category"]');
    const itemStatusInput = form.querySelector('select[name="item_status"]');
    const itemCargoInput = form.querySelector('select[name="item_cargo"]');
    const mfgDateInput = form.querySelector('input[name="mfg_date"]');
    const estDateInput = form.querySelector('input[name="est_date"]');
    const nameInput = form.querySelector('input[name="item_name"]');
    const colorInput = form.querySelector('input[name="scolour"]');
    const fabricInput = form.querySelector('select[name="sfabric"]');
    const countryInput = form.querySelector('select[name="scountry"]');
    const factoryInput = form.querySelector('select[name="sfactory"]');
    const bagsInput = form.querySelector('input[name="freight_bags"]');
    const submitButton = form.querySelector(".add-item-btn");

    if (!codeInput || !customerInput || !submitButton) return;

    // Trim values to check for empty or whitespace-only input
    //  customerInput.value.trim() !== "" &&
    const isValid =
      codeInput.value.trim() !== "" &&
      itemCategoryInput.value !== "" &&
      itemStatusInput.value !== "" &&
      itemCargoInput.value !== "" &&
      mfgDateInput.value !== "" &&
      estDateInput.value !== "" &&
      receiveQtyInput.value !== "" &&
      nameInput.value !== "" &&
      colorInput.value !== "" &&
      fabricInput.value !== "" &&
      countryInput.value !== "" &&
      factoryInput.value !== "" &&
      bagsInput.value.trim() !== "" &&
      !submitButton.hasAttribute("data-warning");

    submitButton.disabled = !isValid;

    // Add visual feedback for empty required fields
    if (!codeInput.value.trim()) {
      codeInput.classList.add("invalid");
    } else {
      codeInput.classList.remove("invalid");
    }

    if (!customerInput.value.trim()) {
      customerInput.classList.add("invalid");
    } else {
      customerInput.classList.remove("invalid");
    }
  }

  validateAndSubmit(form) {
    const codeInput = form.querySelector('input[name="code_colour"]');
    const customerInput = form.querySelector('select[name="odm_customer"]');
    const receiveQtyInput = form.querySelector('input[name="receive_qty"]');
    const itemCategoryInput = form.querySelector('select[name="item_category"]');
    const itemStatusInput = form.querySelector('select[name="item_status"]');
    const itemCargoInput = form.querySelector('select[name="item_cargo"]');
    const mfgDateInput = form.querySelector('input[name="mfg_date"]');
    const estDateInput = form.querySelector('input[name="est_date"]');
    const nameInput = form.querySelector('input[name="item_name"]');
    const colorInput = form.querySelector('input[name="scolour"]');
    const fabricInput = form.querySelector('select[name="sfabric"]');
    const countryInput = form.querySelector('select[name="scountry"]');
    const factoryInput = form.querySelector('select[name="sfactory"]');
    const bagsInput = form.querySelector('input[name="freight_bags"]');

    // Trim values to check for empty or whitespace-only input
    const codeValue = codeInput?.value.trim();
    const customerValue = customerInput?.value.trim();

    if (!codeValue) {
      adminInventory.showNotification("Please enter Code/Colour", "error");
      codeInput?.focus();
      return;
    }

    if (!customerValue) {
      adminInventory.showNotification("Please enter ODM Customer", "error");
      customerInput?.focus();
      return;
    }

    if (!itemCategoryInput.value) {
      adminInventory.showNotification("Please select Category", "error");
      itemCategoryInput?.focus();
      return;
    }

    if (!itemStatusInput.value) {
      adminInventory.showNotification("Please select Status", "error");
      itemStatusInput?.focus();
      return;
    }

    if (!itemCargoInput.value) {
      adminInventory.showNotification("Please select Cargo", "error");
      itemCargoInput?.focus();
      return;
    }

    if (!mfgDateInput.value) {
      adminInventory.showNotification("Please enter MFG Date", "error");
      mfgDateInput?.focus();
      return;
    }

    if (!estDateInput.value) {
      adminInventory.showNotification("Please Select Estimate Date", "error");
      estDateInput?.focus();
      return;
    }

    if (!nameInput.value) {
      adminInventory.showNotification("Please enter Item Name", "error");
      nameInput?.focus();
      return;
    }

    if (!colorInput.value) {
      adminInventory.showNotification("Please enter Item Colour", "error");
      colorInput?.focus();
      return;
    }

    if (!fabricInput.value) {
      adminInventory.showNotification("Please Select Fabric", "error");
      fabricInput?.focus();
      return;
    }

    if (!countryInput.value) {
      adminInventory.showNotification("Please Select Country", "error");
      countryInput?.focus();
      return;
    }

    if (!factoryInput.value) {
      adminInventory.showNotification("Please Select Factory", "error");
      factoryInput?.focus();
      return;
    }

    if (!receiveQtyInput.value) {
      adminInventory.showNotification(
        "Please enter Received Quantity",
        "error"
      );
      receiveQtyInput?.focus();
      return;
    }

    if (!bagsInput.value) {
      adminInventory.showNotification("Please Enter Item Bags", "error");
      bagsInput?.focus();
      return;
    }

    // If validation passes, submit the form
    this.submitForm(form);
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

      // Find elements within the current form context
      const form = document.querySelector("#addItemForm, #editItemForm");
      if (!form) return;

      const warningElement = form.querySelector(".code-warning");
      const submitButton = form.querySelector(".add-item-btn");

      if (!warningElement || !submitButton) return;

      if (allMatches && allMatches.length > 0) {
        // Group matches by item_group
        const matchesByGroup = allMatches.reduce((acc, item) => {
          const group = (item.item_group || "").toUpperCase().trim();
          if (!acc[group]) acc[group] = [];
          acc[group].push(item);
          return acc;
        }, {});

        // Create warning message based on matches
        let warningHTML = `
                <div class="warning-details">
                    <p>Warning: This code exists in the following groups:</p>
                    <table class="warning-table">
            `;

        // Add ODM matches if they exist
        if (matchesByGroup["ODM"]) {
          const odmMatch = matchesByGroup["ODM"][0];
          warningHTML += `
                    <tr>
                        <th colspan="2" style="background: #fff3cd;">ODM Items:</th>
                    </tr>
                    <tr><th>Code:</th><td>${odmMatch.code_colour}</td></tr>
                    <tr><th>Customer:</th><td>${
                      odmMatch.odm_customer || "-"
                    }</td></tr>
                    <tr><th>PPO:</th><td>${odmMatch.odm_ppo || "-"}</td></tr>
                `;
        }

        // Add Wholesale matches if they exist
        if (matchesByGroup["BOHO"] || matchesByGroup["PRIMROSE"]) {
          warningHTML += `
                    <tr>
                        <th colspan="2" style="background: #fff3cd;">Wholesale Items:</th>
                    </tr>
                `;

          ["BOHO", "PRIMROSE"].forEach((group) => {
            if (matchesByGroup[group]) {
              const match = matchesByGroup[group][0];
              warningHTML += `
                            <tr><th>${group}:</th><td>${
                match.code_colour
              }</td></tr>
                        <tr><th>Name:</th><td>${
                          match.item_name || "-"
                        }</td></tr>
                        `;
            }
          });
        }

        warningHTML += `
                    </table>
                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px;">
                        <p style="color: #856404; margin: 0;">
                            <strong>Suggestion:</strong> To avoid confusion, please add an extension to the code:
                            <br>
                            Examples: 
                            <br>
                            • ${cleanCode}-ODM
                            <br>
                            • ODM-${cleanCode}
                            <br>
                            • ${cleanCode}-[CUSTOMER_NAME]
                        </p>
                    </div>
                </div>
            `;

        warningElement.innerHTML = warningHTML;
        warningElement.style.display = "block";
        submitButton.disabled = true;
        submitButton.setAttribute("data-warning", "true");
      } else {
        warningElement.style.display = "none";
        submitButton.removeAttribute("data-warning");
        this.validateForm(form);
      }
    } catch (error) {
      console.error("Error checking code:", error);
      adminInventory.showNotification(
        "Error checking code availability",
        "error"
      );
    }
  }

  handlePaste(event) {
    event.preventDefault();

    // Get pasted content and clean it
    const pastedText = (event.clipboardData || window.clipboardData)
      .getData("text")
      .trim() // Remove start/end spaces
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .toUpperCase(); // Convert to uppercase

    // Get the input element
    const input = event.target;

    // Update input value
    input.value = pastedText;

    // Trigger code check
    this.checkCodeExists(pastedText);
  }

  async submitForm(form) {
    try {
      const formData = new FormData(form);

      if (form.id === "editItemForm") {
        const itemId = form.getAttribute("data-item-id");
        await this.editItem(itemId, formData);
        adminInventory.showNotification("Item updated successfully", "success");
      } else {
        await this.addItem(formData);
        adminInventory.showNotification("Item added successfully", "success");
      }

      // Close the modal
      const modal = form.closest(".modal");
      if (modal) {
        modal.remove();
      }

      // Refresh the inventory display
      if (window.adminInventory) {
        window.adminInventory.loadInventory();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      adminInventory.showNotification(error.message, "error");
    }
  }
}

// Initialize the global instance
window.odmItem = new OdmItem();

// Keep the DOMContentLoaded event for additional setup if needed
document.addEventListener("DOMContentLoaded", () => {
  // Any additional setup that needs DOM to be ready
  if (!window.odmItem) {
    window.odmItem = new OdmItem();
  }
});

//ok on 16/03/2025 - jim
