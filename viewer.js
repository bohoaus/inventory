const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let inventoryData = []; // Store all inventory data
let filteredData = []; // Store filtered data

// Initialize the page
async function initializePage() {
  await loadInventoryData();
  await loadFilterOptions();
  setupSearch();
  setupTableScroll();
}

// Load inventory data
async function loadInventoryData() {
  try {
    // Show loading state
    const tableBody = document.querySelector("#inventoryTable tbody");
    tableBody.innerHTML = `
      <tr>
        <td colspan="18" style="text-align: center; padding: 2rem;">
          Loading data...
        </td>
      </tr>
    `;

    const { data, error } = await supabaseClient.from("inventory").select("*");

    if (error) throw error;

    inventoryData = data || [];
    // Apply default sorting (released date, newest first)
    filteredData = sortData([...inventoryData], "released-desc");
    renderInventoryTable(filteredData);

    // Update results count in search container
    const searchContainer = document.querySelector(".search-container");
    if (searchContainer) {
      const countElement = document.createElement("div");
      countElement.id = "resultsCount";
      countElement.className = "results-count";
      countElement.textContent = `Showing ${filteredData.length} records`;
      searchContainer.appendChild(countElement);
    }
  } catch (error) {
    console.error("Error:", error);
    const tableBody = document.querySelector("#inventoryTable tbody");
    tableBody.innerHTML = `
      <tr>
        <td colspan="18" style="text-align: center; padding: 2rem; color: #e74c3c;">
          Error loading data: ${error.message}
        </td>
      </tr>
    `;
  }
}

// Render inventory table
function renderInventoryTable(data) {
  const tableBody = document.querySelector("#inventoryTable tbody");
  tableBody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Format dates
    const formatDate = (dateStr) =>
      dateStr ? new Date(dateStr).toLocaleDateString() : "";

    // Create cells with proper classes
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

    row.innerHTML = cells
      .map(
        (cell) =>
          `<td class="${cell.truncate ? "truncate" : ""}">${cell.value}</td>`
      )
      .join("");

    tableBody.appendChild(row);
  });

  // Update results count
  const countElement = document.getElementById("resultsCount");
  if (countElement) {
    countElement.textContent = `Showing ${data.length} records`;
  }
}

// Load filter options
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

// Add this function to handle sorting
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

// Update the setupSearch function to include sorting
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearButton = document.getElementById("clearSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");
  const sortSelect = document.getElementById("sortSelect");

  let debounceTimer;

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

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Apply sorting
    filtered = sortData(filtered, sortValue);
    renderInventoryTable(filtered);
  }

  // Search input handler
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 300);
  });

  // Clear button handler
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    statusFilter.value = "";
    sortSelect.value = "released-desc"; // Reset to default sort
    renderInventoryTable(sortData(inventoryData, "released-desc"));
  });

  // Filter change handlers
  categoryFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);
}

// Logout function
function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Check if user is logged in and initialize page
window.addEventListener("load", function () {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "index.html";
  } else {
    initializePage();
  }
});

// Update the setupTableScroll function
function setupTableScroll() {
  const tableWrapper = document.querySelector(".table-wrapper");
  const scrollLeftBtn = document.getElementById("scrollLeft");
  const scrollRightBtn = document.getElementById("scrollRight");

  // Calculate scroll amount based on viewport width
  const calculateScrollAmount = () => {
    const viewportWidth = tableWrapper.clientWidth;
    return Math.floor(viewportWidth * 0.75); // Scroll 75% of visible width
  };

  scrollLeftBtn.addEventListener("click", () => {
    const scrollAmount = calculateScrollAmount();
    tableWrapper.scrollLeft -= scrollAmount;
  });

  scrollRightBtn.addEventListener("click", () => {
    const scrollAmount = calculateScrollAmount();
    tableWrapper.scrollLeft += scrollAmount;
  });

  // Update button states on scroll
  tableWrapper.addEventListener("scroll", () => {
    const maxScroll = tableWrapper.scrollWidth - tableWrapper.clientWidth;

    scrollLeftBtn.disabled = tableWrapper.scrollLeft <= 0;
    scrollRightBtn.disabled = tableWrapper.scrollLeft >= maxScroll - 10; // Add small threshold
  });

  // Update button states on window resize
  window.addEventListener("resize", () => {
    const maxScroll = tableWrapper.scrollWidth - tableWrapper.clientWidth;

    scrollLeftBtn.disabled = tableWrapper.scrollLeft <= 0;
    scrollRightBtn.disabled = tableWrapper.scrollLeft >= maxScroll - 10;
  });
}
