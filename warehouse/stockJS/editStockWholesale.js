class EditWholesaleItem {
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
      "KNIT TOP",
      "KNIT DRESS",
      "KNITWEAR",
    ];

    const statuses = [
      "SHIPPING",
      "ARRIVED",
      "ON HOLD",
      "NOT RELEASED",
      "FULL PRICE",
      "DISPATCHED",
      "ON SALE",
      "OUT OF STOCK",
      "ISSUE & RESTOCK",
      "OVERSTOCK",
    ];

    const prices = [
      "Full Price",
      "On Sale",
      "On Sale-Issue",
      "On Sale-Repeat",
      "Special",
    ];

    form.innerHTML = `
      <div class="form-column">
        <!-- First Column -->
          <div class="form-group-boho-edit required">
            <label for="code_colour" style="width: 150px">Code/Colour</label>
                    <input type="text" name="code_colour" 
                           value="${item.code_colour || ""}"
                 required 
                           readonly>
          </div>

          <div class="form-group-boho-edit">
            <label for="item_group" style="width: 150px">Group</label>
                    <select name="item_group" required>
            
                        <option value="BOHO" ${
                          item.item_group === "BOHO" ? "selected" : ""
                        }>BOHO</option>
                        <option value="PRIMROSE" ${
                          item.item_group === "PRIMROSE" ? "selected" : ""
                        }>PRIMROSE</option>
                        <option value="ODM" ${
                          item.item_group === "ODM" ? "selected" : ""
                        }>ODM</option>
                    </select>
          </div>

          <div class="form-group-boho-edit">
            <label for="item_name" style="width: 150px">Item Name</label>
                    <input type="text" name="item_name" 
                           value="${item.item_name || ""}"
                           onkeyup="this.value = this.value.toUpperCase()">
          </div>

          <div class="form-group-boho-edit">
                    <label for="arrive_date" style="width: 150px">ArriveDate</label>
                    <input type="date" name="arrive_date" 
                           value="${item.arrive_date || ""}">
          </div>
      </div>

      <div class="form-column">
        <!-- Second Column -->
                <div class="form-group-boho-edit">
                    <label for="item_category" style="width: 150px">Category</label>
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

                <div class="form-group-boho-edit">
                    <label for="item_status" style="width: 150px">Status</label>
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

                <div class="form-group-boho-edit">
                  <label for="item_location" style="width: 150px">Location</label>
                  <input type="text" name="item_location" 
                   value="${item.item_location || ""}"
                   onkeyup="this.value = this.value.toUpperCase()">
                </div>

                <div class="form-group-boho-edit">
                    <label for="soldout_date" style="width: 150px">SoldOut Date</label>
                    <input type="date" name="soldout_date" 
                           value="${item.soldout_date || ""}">
                </div>
      </div>

      <div class="form-column">
        <!-- Third Column -->
        <div class="form-group-boho-edit">
          <label for="stock_qty" style="width: 150px">Stock(Packs)</label>
          <input type="number" name="stock_qty" 
                 value="${item.stock_qty || 0}"
                 min="0" step="0.5"
                 onchange="window.editWholesaleItem.validateQuantities(this.closest('form'))">
          </div>

          <div class="form-group-boho-edit">
            <label for="receive_qty" style="width: 150px">Qty(Packs)</label>
            <input type="number" name="receive_qty" 
                 value="${item.receive_qty || 0}"
                 min="0" step="0.5" 
                 onchange="window.editWholesaleItem.validateQuantities(this.closest('form'))">
            </div>

            <div class="form-group-boho-edit">
                    <label for="release_date" style="width: 150px">ReleaseAt</label>
                    <input type="timestamp" name="release_date" placeholder="yyyy-mm-dd" 
                           value="${item.release_date || ""}">
            </div>

            <div class="form-group-boho-edit">
              <label for="sprice" style="width: 150px">Price</label>
                    <select name="sprice" required>          
                        <option value="Full Price" ${
                          item.sprice === "Full Price" ? "selected" : ""
                        }>Full Price</option>
                        <option value="On Sale" ${
                          item.sprice === "On Sale" ? "selected" : ""
                        }>On Sale</option>
                        <option value="Special" ${
                          item.sprice === "Special" ? "selected" : ""
                        }>Special</option>
                    </select>
            </div>
      </div>

      <!-- Full width sections -->
      <div class="form-full-width">
        <!-- Pack Size Editor (moved above repeat info) -->
        <div class="form-group-boho-edit">
            <label for="pack_size" style="width: 100px">Pack Size</label>
            <div class="editwholesaleorder-pack-size-editor" style="border: 2px solid red;">
                <table id="packSizeTable" style="width: 250px">
                    <thead>
                        <tr>
                            <th>Size</th>
                            <th>Qty</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generatePackSizeRows(item.pack_size)}
                    </tbody>
                </table>
                <button type="button" 
                        class="editwholesaleorder-add-size-btn" 
                        style="background-color: #28a745; color: white; padding: 8px 16px;"
                        onclick="window.editWholesaleItem.addPackSizeRow()">
                    Add Size
                </button>
            </div>
        </div>

        <!-- Repeat Info (after pack size) -->
        <div class="form-group repeat-info-group">
            <label>Repeat Info</label>
            <div class="repeat-info-inputs">
                <input type="text" name="new_repeat_number" 
                       value="${this.getOrdinalRepeat(
                         this.getNextRepeatNumber(item.repeat_item)
                       )}"
                       readonly>
                <input type="date" name="new_repeat_date">
                <button type="button" onclick="window.editWholesaleItem.addRepeatInfo(this)">Add</button>
            </div>
            <div class="repeat-info-table-container">
                <!-- Table will be populated dynamically -->
            </div>
        </div>

        <!-- Note field -->
        <div class="form-group-boho-edit">
            <label for="item_note">Note</label>
            <textarea name="item_note" rows="4"
                      onkeyup="this.value = this.value.toUpperCase()">${
                        item.item_note || ""
                      }</textarea>
        </div>

        <!-- Form actions -->
        <div class="form-actions">
            <button type="button" 
                    class="save-item-btn" 
                    onclick="window.editWholesaleItem.validateAndSubmit(this.closest('form'))"
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

    // After form creation, call setupRepeatInfoTable
    this.setupRepeatInfoTable(form, item.repeat_item);

    return form;
  }

  // Add validation methods
  validateForm(form) {
    if (!form) return;

    const codeInput = form.querySelector('input[name="code_colour"]');
    const groupSelect = form.querySelector('select[name="item_group"]');
    const stockQty = form.querySelector('input[name="stock_qty"]');
    const receiveQty = form.querySelector('input[name="receive_qty"]');
    const submitButton = form.querySelector(".save-item-btn");

    // Validate required fields and quantities
    const isValid =
      codeInput.value.trim() !== "" &&
      groupSelect.value !== "" &&
      parseFloat(stockQty.value) <= parseFloat(receiveQty.value) &&
      !submitButton.hasAttribute("data-warning");

    submitButton.disabled = !isValid;

    // Add visual feedback
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

    // If validation passes, submit the form
    this.submitForm(form);
  }

  // Add input trimming setup
  setupInputTrimming(form) {
    if (!form) return;

    const inputs = form.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => {
      // Special handling for code_colour input
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

  // Add keyboard handler setup
  setupFormKeyboardHandler(form) {
    if (!form) return;

    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.validateAndSubmit(form);
      }
    });
  }

  // Add validateQuantities method
  validateQuantities(form) {
    if (!form) return;

    const stockQty = form.querySelector('input[name="stock_qty"]');
    const receiveQty = form.querySelector('input[name="receive_qty"]');
    const submitButton = form.querySelector(".save-item-btn");

    // Convert to numbers and ensure they're at least 0
    let stockValue = Math.max(0, parseFloat(stockQty.value) || 0);
    let receiveValue = Math.max(0, parseFloat(receiveQty.value) || 0);

    // Round to nearest 0.5
    stockValue = Math.round(stockValue * 2) / 2;
    receiveValue = Math.round(receiveValue * 2) / 2;

    // Ensure stock doesn't exceed receive
    if (stockValue > receiveValue) {
      stockValue = receiveValue;
      adminInventory.showNotification(
        "Stock quantity cannot exceed receive quantity",
        "warning"
      );
    }

    // Update input values
    stockQty.value = stockValue;
    receiveQty.value = receiveValue;

    // Add visual feedback
    if (stockValue > receiveValue) {
      stockQty.classList.add("invalid");
    } else {
      stockQty.classList.remove("invalid");
    }

    // Update form validation
    this.validateForm(form);
  }

  // Add submitForm method
  async submitForm(form) {
    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Get pack size data and total units
      const { packSizeData, totalUnits } = this.getPackSizeData();

      // Get the item ID from the code_colour field
      const { data: existingItem } = await supabaseClient
        .from("inventory")
        .select("id")
        .eq("code_colour", data.code_colour)
        .single();

      if (!existingItem?.id) {
        throw new Error("Item not found");
      }

      // Collect repeat info data
      const repeatInfo = {};
      const repeatRows = form.querySelectorAll(".repeat-info-table tbody tr");
      repeatRows.forEach((row, index) => {
        const time = row.querySelector("td:nth-child(2)").textContent;
        repeatInfo[index] = time;
      });

      // Prepare update data (combine all data into a single updateData object)
      const updateData = {
        item_group: data.item_group,
        item_name: data.item_name,
        item_category: data.item_category,
        item_status: data.item_status,
        item_location: data.item_location,
        stock_qty: data.stock_qty,
        receive_qty: data.receive_qty,
        item_note: data.item_note,
        repeat_item: repeatInfo,
        pack_size: packSizeData,
        pack_unit: totalUnits,
        release_date: data.release_date || null,
        arrive_date: data.arrive_date || null,
        soldout_date: data.soldout_date || null,
        updated_at: new Date().toISOString(),
        sprice: data.sprice,
        sfabric: data.sfabric,
        scolour: data.scolour,
        sfactory: data.sfactory,
        scountry: data.scountry,
        swsp: data.swsp,
        swsp2: data.swsp2,
      };

      // Only include release_date if it's not empty
      if (data.release_date) {
        updateData.release_date = data.release_date;
      }

      // Update the item
      const { error: updateError } = await supabaseClient
        .from("inventory")
        .update(updateData)
        .eq("id", existingItem.id);

      if (updateError) throw updateError;

      // Show success message and close modal
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

  setupRepeatInfoTable(form, repeatInfoData) {
    const container = form.querySelector(".repeat-info-table-container");
    if (!container) return;

    // Parse repeat info data if it's a string
    let parsedData = repeatInfoData;
    if (typeof repeatInfoData === "string") {
      try {
        parsedData = JSON.parse(repeatInfoData);
      } catch (e) {
        parsedData = null;
      }
    }

    if (!parsedData || Object.keys(parsedData).length === 0) {
      container.innerHTML = '<p class="no-data">No repeat info added yet</p>';
      return;
    }

    let tableHtml = `
        <table class="repeat-info-table">
            <thead>
                <tr>
                    <th>Repeat</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.entries(parsedData).forEach(([index, date]) => {
      tableHtml += `
            <tr>
                <td>${this.getOrdinalRepeat(parseInt(index) + 1)}</td>
                <td>${date}</td>
                <td>
                    <button type="button" onclick="window.editWholesaleItem.removeRepeatInfo(this)">Remove</button>
                </td>
            </tr>
        `;
    });

    tableHtml += "</tbody></table>";
    container.innerHTML = tableHtml;

    // Update the next repeat number in the input
    const repeatInput = form.querySelector('input[name="new_repeat_number"]');
    if (repeatInput) {
      repeatInput.value = this.getOrdinalRepeat(
        this.getNextRepeatNumber(parsedData)
      );
    }
  }

  generateRepeatInfoRow(index, date) {
    return `
        <tr>
            <td>${this.getOrdinalRepeat(parseInt(index) + 1)}</td>
            <td>${date}</td>
            <td>
                <button type="button" onclick="window.editWholesaleItem.removeRepeatInfo(this)">Remove</button>
            </td>
        </tr>
    `;
  }

  getOrdinalRepeat(num) {
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return (
      num +
      (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) +
      " repeat date"
    );
  }

  showAddRepeatForm(button) {
    const container = button.closest(".repeat-info-table-container");
    button.remove();

    let tableHtml = `
        <table class="repeat-info-table">
            <thead>
                <tr>
                    <th>Repeat</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
        <div class="add-repeat-info">
            <input type="date" 
                   name="repeat_date" 
                   class="repeat-date-input">
            <button type="button" onclick="window.editWholesaleItem.addRepeatInfo(this)">Add</button>
        </div>
    `;

    container.innerHTML = tableHtml;
  }

  addRepeatInfo(button) {
    const form = button.closest("form");
    const dateInput = form.querySelector('input[name="new_repeat_date"]');
    const selectedDate = dateInput.value;

    if (!selectedDate) {
      adminInventory.showNotification("Please select a date", "warning");
      return;
    }

    const container = form.querySelector(".repeat-info-table-container");
    const existingTable = container.querySelector("table");
    const tbody =
      existingTable?.querySelector("tbody") || document.createElement("tbody");

    // Get all existing rows to determine the next number
    const currentRows = tbody.querySelectorAll("tr");
    let nextNumber;

    if (currentRows.length > 0) {
      // Get the last row's ordinal text
      const lastRowText =
        currentRows[currentRows.length - 1].querySelector(
          "td:first-child"
        ).textContent;
      // Extract the number from text (e.g., "3rd repeat date" -> 3)
      const lastNumber = parseInt(lastRowText);
      nextNumber = lastNumber + 1;
    } else {
      nextNumber = 1;
    }

    if (!existingTable) {
      container.innerHTML = `
            <table class="repeat-info-table">
                <thead>
                    <tr>
                        <th>Repeat</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${this.getOrdinalRepeat(nextNumber)}</td>
                        <td>${selectedDate}</td>
                        <td>
                            <button type="button" onclick="window.editWholesaleItem.removeRepeatInfo(this)">Remove</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    } else {
      const newRow = document.createElement("tr");
      newRow.innerHTML = `
            <td>${this.getOrdinalRepeat(nextNumber)}</td>
            <td>${selectedDate}</td>
            <td>
                <button type="button" onclick="window.editWholesaleItem.removeRepeatInfo(this)">Remove</button>
            </td>
        `;
      tbody.appendChild(newRow);
    }

    // Reset date input
    dateInput.value = "";

    // Update the next repeat number input
    const repeatInput = form.querySelector('input[name="new_repeat_number"]');
    repeatInput.value = this.getOrdinalRepeat(nextNumber + 1);
  }

  removeRepeatInfo(button) {
    const row = button.closest("tr");
    const tbody = row.closest("tbody");
    const removedNumber = parseInt(
      row.querySelector("td:first-child").textContent
    );
    row.remove();

    // Update remaining rows to maintain sequential numbering
    const remainingRows = tbody.querySelectorAll("tr");
    remainingRows.forEach((row) => {
      const currentNumber = parseInt(
        row.querySelector("td:first-child").textContent
      );
      if (currentNumber > removedNumber) {
        row.querySelector("td:first-child").textContent = this.getOrdinalRepeat(
          currentNumber - 1
        );
      }
    });

    // Update the next number in the input
    const form = button.closest("form");
    const repeatInput = form.querySelector('input[name="new_repeat_number"]');
    const nextNumber = remainingRows.length + 1;
    repeatInput.value = this.getOrdinalRepeat(nextNumber);

    // Update form validation
    this.validateForm(form);
  }

  getNextRepeatNumber(repeatInfo) {
    if (!repeatInfo || Object.keys(repeatInfo).length === 0) return 1;

    // Find the highest number in existing repeat info
    const numbers = Object.keys(repeatInfo).map((key) => parseInt(key));
    const maxNumber = Math.max(...numbers);
    return maxNumber + 2; // Add 2 because we want the next ordinal number (1-based indexing)
  }

  generatePackSizeRows(packSize) {
    if (!packSize) return "";

    try {
      const sizes =
        typeof packSize === "string" ? JSON.parse(packSize) : packSize;
      console.log("Parsed sizes:", sizes); // Add debug log

      return Object.entries(sizes)
        .map(
          ([size, qty]) => `
            <tr>
                <td>
                    <input type="text" 
                           class="editwholesaleorder-size-input" 
                           value="${size}"
                           style="width: 120px; padding: 6px 10px; border: 1px solid #ced4da;" />
                </td>
                <td>
                    <input type="number" 
                           class="editwholesaleorder-qty-input" 
                           value="${qty}" 
                           min="0"
                           style="width: 100px; padding: 6px 10px; border: 1px solid #ced4da;" />
                </td>
                <td>
                    <button type="button" 
                            class="editwholesaleorder-remove-size-btn"
                            style="background-color: #dc3545; color: white; padding: 6px 12px;"
                            onclick="window.editWholesaleItem.removePackSizeRow(this)">
                        Remove
                    </button>
                </td>
            </tr>
        `
        )
        .join("");
    } catch (error) {
      console.error("Error parsing pack size:", error);
      return "";
    }
  }

  addPackSizeRow() {
    const tbody = document.querySelector("#packSizeTable tbody");
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td>
            <input type="text" 
                   class="editwholesaleorder-size-input" 
                   placeholder="Enter size"
                   onkeyup="this.value = this.value.toUpperCase()" />
        </td>
        <td>
            <input type="number" 
                   class="editwholesaleorder-qty-input" 
                   min="0" 
                   value="0"
                   placeholder="Enter quantity" />
        </td>
        <td>
            <button type="button" 
                    class="editwholesaleorder-remove-size-btn" 
                    onclick="window.editWholesaleItem.removePackSizeRow(this)"
                    title="Remove size">
                Remove
            </button>
        </td>
    `;
    tbody.appendChild(newRow);
  }

  removePackSizeRow(button) {
    button.closest("tr").remove();
  }

  getPackSizeData() {
    const packSizeData = {};
    let totalUnits = 0;

    document.querySelectorAll("#packSizeTable tbody tr").forEach((row) => {
      const size = row
        .querySelector(".editwholesaleorder-size-input")
        .value.trim()
        .toUpperCase();
      const qty =
        parseInt(row.querySelector(".editwholesaleorder-qty-input").value) || 0;

      if (size && qty > 0) {
        packSizeData[size] = qty;
        totalUnits += qty;
      }
    });

    return { packSizeData, totalUnits };
  }
}

// Initialize the global instance
window.editWholesaleItem = new EditWholesaleItem();

// Keep the DOMContentLoaded event for additional setup if needed
document.addEventListener("DOMContentLoaded", () => {
  if (!window.editWholesaleItem) {
    window.editWholesaleItem = new EditWholesaleItem();
  }
});
