// Initial Setup and Configuration
const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Utility function to format dates
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ""; // Invalid date
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

// Session Management
async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return null;
  }
  return session;
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Quantity Calculations
function handleQuantityInput() {
  const qtyInput = document.getElementById("qty");
  const unitInput = document.getElementById("unit");
  const inventoryInput = document.getElementById("inventory");

  qtyInput.addEventListener("change", function () {
    const qtyValue = parseFloat(this.value);
    const unitValue = parseFloat(unitInput.value);

    if (qtyValue && (!unitValue || unitValue === 0)) {
      alert("Please enter Unit value first");
      this.value = ""; // Clear the quantity input
      unitInput.focus(); // Focus on the unit input
      return;
    }

    if (qtyValue && unitValue) {
      const calculatedQty = qtyValue / unitValue;

      // Round to nearest .0 or .5
      const roundedQty = (Math.round(calculatedQty * 2) / 2).toFixed(1);

      // Store the calculated value and update both fields
      qtyInput.setAttribute("data-calculated-value", roundedQty);
      qtyInput.value = roundedQty;
      inventoryInput.value = roundedQty;
    }
  });
}

// Status Management Functions
async function loadStatusOptions() {
  try {
    const { data, error } = await supabaseClient
      .from("status_options")
      .select("*")
      .order("status", { ascending: true });

    if (error) throw error;

    // Update dropdown
    const statusSelect = document.getElementById("status");
    statusSelect.innerHTML = '<option value="">Select Status</option>';
    data.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.status;
      option.textContent = item.status;
      statusSelect.appendChild(option);
    });

    // Update list in modal
    const statusList = document.getElementById("statusList");
    if (statusList) {
      statusList.innerHTML = "";
      data.forEach((item) => {
        const statusItem = document.createElement("div");
        statusItem.className = "status-item";
        statusItem.innerHTML = `
                    <span>${item.status}</span>
                    <button onclick="deleteStatus('${item.status}')" class="btn-delete">Delete</button>
                `;
        statusList.appendChild(statusItem);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error loading status options: " + error.message);
  }
}

// Status Management Modal Functions
async function addNewStatus() {
  const newStatus = document.getElementById("newStatus").value.trim();

  if (!newStatus) {
    alert("Please enter a status");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("status_options")
      .insert([{ status: newStatus }]);

    if (error) throw error;

    alert("New status added successfully!");
    document.getElementById("newStatus").value = "";
    await loadStatusOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error adding new status: " + error.message);
  }
}

async function deleteStatus(status) {
  if (!confirm(`Are you sure you want to delete "${status}"?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("status_options")
      .delete()
      .eq("status", status);

    if (error) throw error;

    alert("Status deleted successfully!");
    await loadStatusOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error deleting status: " + error.message);
  }
}

// Size/Pack Management Functions
async function loadSizePackOptions() {
  try {
    const { data, error } = await supabaseClient
      .from("sizepack_options")
      .select("*")
      .order("sizepack", { ascending: true });

    if (error) throw error;

    // Update dropdown
    const sizePackSelect = document.getElementById("sizePack");
    sizePackSelect.innerHTML = '<option value="">Select Size/Pack</option>';
    data.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.sizepack;
      option.textContent = item.sizepack;
      sizePackSelect.appendChild(option);
    });

    // Update list in modal
    const sizePackList = document.getElementById("sizePackList");
    if (sizePackList) {
      sizePackList.innerHTML = "";
      data.forEach((item) => {
        const sizePackItem = document.createElement("div");
        sizePackItem.className = "status-item";
        sizePackItem.innerHTML = `
                    <span>${item.sizepack}</span>
                    <button onclick="deleteSizePack('${item.sizepack}')" class="btn-delete">Delete</button>
                `;
        sizePackList.appendChild(sizePackItem);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error loading size/pack options: " + error.message);
  }
}

async function addNewSizePack() {
  const newSizePack = document.getElementById("newSizePack").value.trim();

  if (!newSizePack) {
    alert("Please enter a size/pack value");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("sizepack_options")
      .insert([{ sizepack: newSizePack }]);

    if (error) throw error;

    alert("New size/pack added successfully!");
    document.getElementById("newSizePack").value = "";
    await loadSizePackOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error adding new size/pack: " + error.message);
  }
}

async function deleteSizePack(sizePack) {
  if (!confirm(`Are you sure you want to delete "${sizePack}"?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("sizepack_options")
      .delete()
      .eq("sizepack", sizePack);

    if (error) throw error;

    alert("Size/Pack deleted successfully!");
    await loadSizePackOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error deleting size/pack: " + error.message);
  }
}

// Category Management Functions
async function loadCategoryOptions() {
  try {
    const { data, error } = await supabaseClient
      .from("category_options")
      .select("*")
      .order("category", { ascending: true });

    if (error) throw error;

    // Update dropdown
    const categorySelect = document.getElementById("category");
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    data.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.category;
      option.textContent = item.category;
      categorySelect.appendChild(option);
    });

    // Update list in modal
    const categoryList = document.getElementById("categoryList");
    if (categoryList) {
      categoryList.innerHTML = "";
      data.forEach((item) => {
        const categoryItem = document.createElement("div");
        categoryItem.className = "status-item";
        categoryItem.innerHTML = `
            <span>${item.category}</span>
            <button onclick="deleteCategory('${item.category}')" class="btn-delete">Delete</button>
          `;
        categoryList.appendChild(categoryItem);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error loading category options: " + error.message);
  }
}

// Cargo Management Functions
async function loadCargoOptions() {
  try {
    const { data, error } = await supabaseClient
      .from("cargo_options")
      .select("*")
      .order("cargo", { ascending: true });

    if (error) throw error;

    // Update dropdown
    const cargoSelect = document.getElementById("cargo");
    cargoSelect.innerHTML = '<option value="">Select Cargo</option>';
    data.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.cargo;
      option.textContent = item.cargo;
      cargoSelect.appendChild(option);
    });

    // Update list in modal
    const cargoList = document.getElementById("cargoList");
    if (cargoList) {
      cargoList.innerHTML = "";
      data.forEach((item) => {
        const cargoItem = document.createElement("div");
        cargoItem.className = "status-item";
        cargoItem.innerHTML = `
            <span>${item.cargo}</span>
            <button onclick="deleteCargo('${item.cargo}')" class="btn-delete">Delete</button>
          `;
        cargoList.appendChild(cargoItem);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error loading cargo options: " + error.message);
  }
}

// Add/Delete functions for Category and Cargo
async function addNewCategory() {
  const newCategory = document.getElementById("newCategory").value.trim();
  if (!newCategory) {
    alert("Please enter a category");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("category_options")
      .insert([{ category: newCategory }]);

    if (error) throw error;
    alert("New category added successfully!");
    document.getElementById("newCategory").value = "";
    await loadCategoryOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error adding new category: " + error.message);
  }
}

async function addNewCargo() {
  const newCargo = document.getElementById("newCargo").value.trim();
  if (!newCargo) {
    alert("Please enter a cargo");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("cargo_options")
      .insert([{ cargo: newCargo }]);

    if (error) throw error;
    alert("New cargo added successfully!");
    document.getElementById("newCargo").value = "";
    await loadCargoOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error adding new cargo: " + error.message);
  }
}

// Modal Control Functions
function showStatusModal() {
  document.getElementById("statusModal").style.display = "block";
  document.getElementById("newStatus").value = "";
  document.getElementById("newStatus").focus();
}

function showSizePackModal() {
  document.getElementById("sizePackModal").style.display = "block";
  document.getElementById("newSizePack").value = "";
  document.getElementById("newSizePack").focus();
}

function showCategoryModal() {
  document.getElementById("categoryModal").style.display = "block";
  document.getElementById("newCategory").value = "";
  document.getElementById("newCategory").focus();
}

function showCargoModal() {
  document.getElementById("cargoModal").style.display = "block";
  document.getElementById("newCargo").value = "";
  document.getElementById("newCargo").focus();
}

function closeStatusModal() {
  document.getElementById("statusModal").style.display = "none";
}

function closeSizePackModal() {
  document.getElementById("sizePackModal").style.display = "none";
}

function closeCategoryModal() {
  document.getElementById("categoryModal").style.display = "none";
}

function closeCargoModal() {
  document.getElementById("cargoModal").style.display = "none";
}
// Inventory Management Functions
let inventoryData = []; // Store all inventory data
let filteredData = []; // Store filtered data

// Update loadInventoryData function
async function loadInventoryData() {
  try {
    // Show loading state
    const tableBody = document.querySelector("#inventoryTable tbody");
    tableBody.innerHTML = `
      <tr>
        <td colspan="19" style="text-align: center; padding: 2rem;">
          Loading data...
        </td>
      </tr>
    `;

    const { data, error } = await supabaseClient.from("inventory").select("*");

    if (error) throw error;

    inventoryData = data || [];
    // Apply default sorting (released date, newest first)
    filteredData = sortData([...inventoryData], "released-desc");

    // Remove existing results count if any
    const existingCount = document.getElementById("resultsCount");
    if (existingCount) {
      existingCount.remove();
    }

    renderInventoryTable(filteredData);
    updateResultsCount(filteredData);
  } catch (error) {
    console.error("Error:", error);
    alert("Error loading inventory data: " + error.message);
  }
}

// Add new function to update results count
function updateResultsCount(
  data,
  categoryValue = "",
  statusValue = "",
  isRepeated = false
) {
  const searchContainer = document.querySelector(".search-container");
  const existingCount = document.getElementById("resultsCount");

  if (existingCount) {
    existingCount.remove();
  }

  if (searchContainer) {
    const countElement = document.createElement("div");
    countElement.id = "resultsCount";
    countElement.className = "results-count";

    let countText = `Showing ${data.length} records`;
    if (categoryValue) {
      countText += ` in ${categoryValue}`;
    }
    if (statusValue) {
      countText += ` with ${statusValue} status`;
    }
    if (isRepeated) {
      countText += " (Repeated Items Only)";
    }

    countElement.textContent = countText;
    searchContainer.appendChild(countElement);
  }
}

// Separate function to render the table
function renderInventoryTable(data) {
  const tbody = document.querySelector("#inventoryTable tbody");
  tbody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Add actions column first
    const actionsCell = document.createElement("td");
    actionsCell.innerHTML = `
      <button onclick="loadItemForEdit('${item["code & colour"]}')" class="btn-secondary">Edit</button>
      <button onclick="deleteItem('${item["code & colour"]}')" class="btn-delete">Delete</button>
    `;
    row.appendChild(actionsCell);

    // Add other cells
    const cells = [
      { value: item["code & colour"] || "", truncate: true },
      { value: item["item name"] || "", truncate: true },
      { value: item.location || "", truncate: true },
      { value: item.qty || "", truncate: false },
      { value: item.inventory || "", truncate: false },
      { value: formatDate(item.released), truncate: false },
      { value: item.aging || "", truncate: false },
      { value: item.status || "", truncate: true },
      { value: item.unit || "", truncate: false },
      { value: item["size/pack"] || "", truncate: true },
      { value: item.catagory || "", truncate: true },
      { value: item.repeated ? "✓" : "", truncate: false },
      { value: item.ppo || "", truncate: true },
      { value: formatDate(item["mfg-d"]), truncate: false },
      { value: item.cargo || "", truncate: true },
      { value: formatDate(item["schedule-d"]), truncate: false },
      { value: formatDate(item["arrive-d"]), truncate: false },
      { value: item.note || "", truncate: true },
    ];

    cells.forEach(({ value, truncate }) => {
      const td = document.createElement("td");
      td.textContent = value;
      if (truncate) td.classList.add("truncate");
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  try {
    const session = await getCurrentSession();
    if (!session) {
      alert("Please login again");
      window.location.href = "index.html";
      return;
    }

    // Get and validate code & colour
    const codeAndColour = document.getElementById("code").value.trim();
    if (!codeAndColour) {
      alert("Code & Colour is required");
      document.getElementById("code").focus();
      return;
    }

    const isEditMode =
      document.getElementById("code").getAttribute("data-edit-mode") === "true";
    const originalCode = document
      .getElementById("code")
      .getAttribute("data-original-code");

    // Check for existing record if it's a new entry or if the code has changed
    if (!isEditMode || (isEditMode && codeAndColour !== originalCode)) {
      const { data: existingItem, error: checkError } = await supabaseClient
        .from("inventory")
        .select("*")
        .eq('"code & colour"', codeAndColour)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingItem) {
        alert(`A record with code "${codeAndColour}" already exists.`);
        document.getElementById("code").focus();
        return;
      }
    }

    // Prepare form data
    const formData = {
      "code & colour": codeAndColour,
      "item name": document.getElementById("itemName").value.trim() || null,
      location: document.getElementById("location").value.trim() || null,
      qty: parseFloat(document.getElementById("qty").value) || null,
      inventory: parseFloat(document.getElementById("inventory").value) || null,
      released: document.getElementById("released").value || null,
      aging: document.getElementById("aging").value || null,
      status: document.getElementById("status").value || null,
      unit: parseFloat(document.getElementById("unit").value) || null,
      "size/pack": document.getElementById("sizePack").value || null,
      catagory: document.getElementById("category").value || null,
      repeated: document.getElementById("repeated").checked,
      ppo: document.getElementById("ppo").value.trim() || null,
      "mfg-d": document.getElementById("mfgD").value || null,
      cargo: document.getElementById("cargo").value || null,
      "schedule-d": document.getElementById("scheduleD").value || null,
      "arrive-d": document.getElementById("arriveD").value || null,
      note: document.getElementById("note").value.trim() || null,
    };

    // Save to database
    if (isEditMode) {
      const { error } = await supabaseClient
        .from("inventory")
        .update(formData)
        .eq('"code & colour"', originalCode);

      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from("inventory")
        .insert([formData]);

      if (error) throw error;
    }

    // Reset form
    document.getElementById("inventoryForm").reset();
    document.getElementById("code").removeAttribute("data-edit-mode");
    document.getElementById("code").removeAttribute("data-original-code");

    // Show success message
    alert(
      isEditMode ? "Item updated successfully!" : "Item added successfully!"
    );

    // Reload table data
    await loadInventoryData();
  } catch (error) {
    console.error("Error:", error);
    alert(`Error ${isEditMode ? "updating" : "adding"} item: ${error.message}`);
  }
}

async function loadItemForEdit(code) {
  try {
    const { data, error } = await supabaseClient
      .from("inventory")
      .select("*")
      .eq('"code & colour"', code)
      .single();

    if (error) throw error;

    if (data) {
      // Set form values
      document.getElementById("code").value = (
        data["code & colour"] || ""
      ).toUpperCase();
      document.getElementById("itemName").value = (
        data["item name"] || ""
      ).toUpperCase();
      document.getElementById("location").value = data.location || "";
      document.getElementById("qty").value = data.qty || "";
      document.getElementById("inventory").value = data.inventory || "";

      // Format dates for input fields
      const formatDateForInput = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toISOString().split("T")[0];
      };

      // Set date fields
      document.getElementById("released").value = formatDateForInput(
        data.released
      );
      document.getElementById("mfgD").value = formatDateForInput(data["mfg-d"]);
      document.getElementById("scheduleD").value = formatDateForInput(
        data["schedule-d"]
      );
      document.getElementById("arriveD").value = formatDateForInput(
        data["arrive-d"]
      );

      // Set dropdown values
      document.getElementById("status").value = data.status || "";
      document.getElementById("sizePack").value = data["size/pack"] || "";
      document.getElementById("category").value = data.catagory || "";
      document.getElementById("cargo").value = data.cargo || "";

      // Set other fields
      document.getElementById("unit").value = data.unit || "";
      document.getElementById("repeated").checked = data.repeated || false;
      document.getElementById("ppo").value = data.ppo || "";
      document.getElementById("note").value = data.note || "";

      // Update aging after setting released date
      updateAging();

      // Add edit mode indicators
      document.getElementById("code").setAttribute("data-edit-mode", "true");
      document.getElementById("code").setAttribute("data-original-code", code);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error loading item for edit: " + error.message);
  }
}

async function deleteItem(code) {
  if (!confirm(`Are you sure you want to delete item "${code}"?`)) {
    return;
  }

  try {
    // First, get the exact record to delete
    const { data: existingData, error: fetchError } = await supabaseClient
      .from("inventory")
      .select("*")
      .eq('"code & colour"', code)
      .single();

    if (fetchError) throw fetchError;
    if (!existingData) {
      alert("Record not found!");
      return;
    }

    // Delete the specific record
    const { error: deleteError } = await supabaseClient
      .from("inventory")
      .delete()
      .eq('"code & colour"', code)
      .eq("id", existingData.id);

    if (deleteError) throw deleteError;

    alert("Item deleted successfully!");
    await loadInventoryData();
  } catch (error) {
    console.error("Error:", error);
    alert("Error deleting item: " + error.message);
  }
}

// Add this new function to calculate aging
function calculateAging(releasedDate) {
  if (!releasedDate) {
    return "";
  }

  const released = new Date(releasedDate);
  const today = new Date();

  // Calculate the difference in weeks
  const diffTime = Math.abs(today - released);
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

  // Convert to ordinal number format (1st, 2nd, 3rd, etc.)
  const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]) + " week";
  };

  return ordinal(diffWeeks);
}

// Add this new function to handle the update button click
function updateAging() {
  const releasedInput = document.getElementById("released");
  const agingInput = document.getElementById("aging");

  if (!releasedInput.value) {
    agingInput.value = "not release";
    return;
  }

  const releasedDate = new Date(releasedInput.value);
  const currentDate = new Date();

  // Calculate the difference in weeks
  const diffTime = Math.abs(currentDate - releasedDate);
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

  // Convert number to ordinal string
  function getOrdinalWeek(num) {
    const j = num % 10,
      k = num % 100;
    if (j == 1 && k != 11) {
      return num + "st week";
    }
    if (j == 2 && k != 12) {
      return num + "nd week";
    }
    if (j == 3 && k != 13) {
      return num + "rd week";
    }
    return num + "th week";
  }

  agingInput.value = getOrdinalWeek(diffWeeks);
}

// Add event listener for released date changes
document.getElementById("released")?.addEventListener("change", updateAging);

// Add search functionality
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearButton = document.getElementById("clearSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");
  const repeatedFilter = document.getElementById("repeatedFilter");
  const sortSelect = document.getElementById("sortSelect");

  let debounceTimer;
  let isRepeatedFilterActive = false;

  function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;
    const sortValue = sortSelect.value;

    let filtered = inventoryData.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item["code & colour"].toLowerCase().includes(searchTerm) ||
        (item["item name"] &&
          item["item name"].toLowerCase().includes(searchTerm));

      const matchesCategory = !categoryValue || item.catagory === categoryValue;
      const matchesStatus = !statusValue || item.status === statusValue;
      const matchesRepeated = !isRepeatedFilterActive || item.repeated === true;

      return (
        matchesSearch && matchesCategory && matchesStatus && matchesRepeated
      );
    });

    filtered = sortData(filtered, sortValue);
    renderInventoryTable(filtered);
    updateResultsCount(
      filtered,
      categoryValue,
      statusValue,
      isRepeatedFilterActive
    );
  }

  // Add repeated filter button handler
  repeatedFilter.addEventListener("click", () => {
    isRepeatedFilterActive = !isRepeatedFilterActive;
    repeatedFilter.classList.toggle("active");
    applyFilters();
  });

  // Update clear button handler
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    statusFilter.value = "";
    sortSelect.value = "released-desc";
    isRepeatedFilterActive = false;
    repeatedFilter.classList.remove("active");
    const filtered = sortData([...inventoryData], "released-desc");
    renderInventoryTable(filtered);
    updateResultsCount(filtered);
  });

  // Search input handler
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 300);
  });

  // Filter change handlers
  categoryFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);
}

// Add this function to handle auto uppercase conversion
function setupAutoUppercase() {
  // Get the input elements
  const codeInput = document.getElementById("code");
  const nameInput = document.getElementById("itemName");

  // Function to handle uppercase conversion
  function convertToUpperCase(event) {
    const input = event.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    // Restore cursor position
    input.setSelectionRange(start, end);
  }

  // Add event listeners for both inputs
  if (codeInput) {
    codeInput.addEventListener("input", convertToUpperCase);
  }

  if (nameInput) {
    nameInput.addEventListener("input", convertToUpperCase);
  }
}

// Update the setupTableScroll function
function setupTableScroll() {
  const tableWrapper = document.querySelector(".table-wrapper");
  const scrollLeftBtn = document.getElementById("scrollLeft");
  const scrollRightBtn = document.getElementById("scrollRight");

  // Calculate number of visible columns
  const getVisibleColumns = () => {
    const tableWidth = tableWrapper.scrollWidth;
    const viewportWidth = tableWrapper.clientWidth;
    return Math.ceil(tableWidth / viewportWidth);
  };

  scrollLeftBtn.addEventListener("click", () => {
    const columnCount = getVisibleColumns();
    const scrollStep = tableWrapper.scrollWidth / columnCount;
    tableWrapper.scrollLeft -= scrollStep;
  });

  scrollRightBtn.addEventListener("click", () => {
    const columnCount = getVisibleColumns();
    const scrollStep = tableWrapper.scrollWidth / columnCount;
    tableWrapper.scrollLeft += scrollStep;
  });

  // Update button states on scroll
  tableWrapper.addEventListener("scroll", () => {
    const maxScroll = tableWrapper.scrollWidth - tableWrapper.clientWidth;
    scrollLeftBtn.disabled = tableWrapper.scrollLeft <= 0;
    scrollRightBtn.disabled = tableWrapper.scrollLeft >= maxScroll - 10;
  });
}

// Event Listeners and Initialization
window.addEventListener("load", async function () {
  const session = await getCurrentSession();
  const user = JSON.parse(localStorage.getItem("user"));

  if (!session || !user || user.role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  // Initialize all data
  await Promise.all([
    loadInventoryData(),
    loadStatusOptions(),
    loadSizePackOptions(),
    loadCategoryOptions(),
    loadCargoOptions(),
    loadFilterOptions(),
  ]);

  setupSearch();
  setupAutoUppercase();
  setupTableScroll();
  handleQuantityInput();

  // Add form submit handler
  const form = document.getElementById("inventoryForm");
  if (form) {
    form.removeEventListener("submit", handleSubmit);
    form.addEventListener("submit", handleSubmit);
  }
});

// Modal Event Listeners
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeStatusModal();
    closeSizePackModal();
  }
});

// Click outside modal to close
document.addEventListener("click", function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
  }
});

// Enter key support for status and size/pack inputs
document
  .getElementById("newStatus")
  ?.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      addNewStatus();
    }
  });

document
  .getElementById("newSizePack")
  ?.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      addNewSizePack();
    }
  });

// Form field validation listeners
document.getElementById("unit")?.addEventListener("change", function () {
  const qtyInput = document.getElementById("qty");
  if (qtyInput.value) {
    qtyInput.dispatchEvent(new Event("change"));
  }
});

// Export functions to global scope for HTML onclick handlers
window.showStatusModal = showStatusModal;
window.showSizePackModal = showSizePackModal;
window.showCategoryModal = showCategoryModal;
window.showCargoModal = showCargoModal;
window.closeStatusModal = closeStatusModal;
window.closeSizePackModal = closeSizePackModal;
window.closeCategoryModal = closeCategoryModal;
window.closeCargoModal = closeCargoModal;
window.addNewStatus = addNewStatus;
window.addNewSizePack = addNewSizePack;
window.addNewCategory = addNewCategory;
window.addNewCargo = addNewCargo;
window.deleteStatus = deleteStatus;
window.deleteSizePack = deleteSizePack;
window.loadItemForEdit = loadItemForEdit;
window.deleteItem = deleteItem;
window.logout = logout;
window.updateAging = updateAging;

// Update the saveInventoryItem function
async function saveInventoryItem() {
  try {
    const formData = {
      "code & colour": document.getElementById("code").value.toUpperCase(),
      "item name": document.getElementById("itemName").value.toUpperCase(),
      location: document.getElementById("location").value,
      qty: document.getElementById("qty").value,
      inventory: document.getElementById("inventory").value,
      released: document.getElementById("released").value,
      aging: document.getElementById("aging").value,
      status: document.getElementById("status").value,
      unit: document.getElementById("unit").value,
      "size/pack": document.getElementById("sizePack").value,
      catagory: document.getElementById("category").value,
      repeated: document.getElementById("repeated").checked,
      ppo: document.getElementById("ppo").value,
      "mfg-d": document.getElementById("mfgDate").value,
      cargo: document.getElementById("cargo").value,
      "schedule-d": document.getElementById("scheduleDate").value,
      "arrive-d": document.getElementById("arriveDate").value,
      note: document.getElementById("note").value,
    };

    // ... rest of the function remains the same
  } catch (error) {
    console.error("Error:", error);
    alert("Error saving inventory item: " + error.message);
  }
}

// Add the sortData function
function sortData(data, sortOption) {
  const sortedData = [...data];

  switch (sortOption) {
    case "released-desc":
      sortedData.sort((a, b) => {
        if (!a.released) return 1;
        if (!b.released) return -1;
        return new Date(b.released) - new Date(a.released);
      });
      break;
    case "released-asc":
      sortedData.sort((a, b) => {
        if (!a.released) return 1;
        if (!b.released) return -1;
        return new Date(a.released) - new Date(b.released);
      });
      break;
    case "inventory-asc":
      sortedData.sort((a, b) => {
        const aVal = parseFloat(a.inventory) || 0;
        const bVal = parseFloat(b.inventory) || 0;
        return aVal - bVal;
      });
      break;
    case "inventory-desc":
      sortedData.sort((a, b) => {
        const aVal = parseFloat(a.inventory) || 0;
        const bVal = parseFloat(b.inventory) || 0;
        return bVal - aVal;
      });
      break;
    case "received-desc":
      sortedData.sort((a, b) => {
        if (!a["arrive-d"]) return 1;
        if (!b["arrive-d"]) return -1;
        return new Date(b["arrive-d"]) - new Date(a["arrive-d"]);
      });
      break;
    case "received-asc":
      sortedData.sort((a, b) => {
        if (!a["arrive-d"]) return 1;
        if (!b["arrive-d"]) return -1;
        return new Date(a["arrive-d"]) - new Date(b["arrive-d"]);
      });
      break;
    default:
      // Default sort by released date desc
      sortedData.sort((a, b) => {
        if (!a.released) return 1;
        if (!b.released) return -1;
        return new Date(b.released) - new Date(a.released);
      });
  }

  return sortedData;
}

// Add loadFilterOptions function
async function loadFilterOptions() {
  try {
    // Load status options from status_options table
    const { data: statusData, error: statusError } = await supabaseClient
      .from("status_options")
      .select("status")
      .order("status");

    if (statusError) throw statusError;

    if (statusData) {
      const statusSelect = document.getElementById("statusFilter");
      if (!statusSelect) return;

      // Clear existing options except the first one (All Status)
      while (statusSelect.options.length > 1) {
        statusSelect.remove(1);
      }

      // Add new options from status_options table
      statusData.forEach(({ status }) => {
        if (status) {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = status;
          statusSelect.appendChild(option);
        }
      });
    }

    // Load category options from category_options table
    const { data: categoryData, error: categoryError } = await supabaseClient
      .from("category_options")
      .select("category")
      .order("category");

    if (categoryError) throw categoryError;

    if (categoryData) {
      const categorySelect = document.getElementById("categoryFilter");
      if (!categorySelect) return;

      // Clear existing options except the first one (All Categories)
      while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
      }

      // Add new options from category_options table
      categoryData.forEach(({ category }) => {
        if (category) {
          const option = document.createElement("option");
          option.value = category;
          option.textContent = category;
          categorySelect.appendChild(option);
        }
      });
    }
  } catch (error) {
    console.error("Error loading filter options:", error);
  }
}

// Add deleteCategory function
async function deleteCategory(category) {
  if (!confirm(`Are you sure you want to delete "${category}"?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("category_options")
      .delete()
      .eq("category", category);

    if (error) throw error;

    alert("Category deleted successfully!");
    await loadCategoryOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error deleting category: " + error.message);
  }
}

// Add deleteCargo function
async function deleteCargo(cargo) {
  if (!confirm(`Are you sure you want to delete "${cargo}"?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("cargo_options")
      .delete()
      .eq("cargo", cargo);

    if (error) throw error;

    alert("Cargo deleted successfully!");
    await loadCargoOptions();
  } catch (error) {
    console.error("Error:", error);
    alert("Error deleting cargo: " + error.message);
  }
}

// Make sure to export the delete functions
window.deleteStatus = deleteStatus;
window.deleteSizePack = deleteSizePack;
window.deleteCategory = deleteCategory;
window.deleteCargo = deleteCargo;
