// Initialize Supabase client
const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let currentWeekStart = null;
let currentWeekEnd = null;
let weeks = [];

// Check authentication on page load
async function checkAuth() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }
}

// Utility functions
function formatDateTime(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return ""; // Invalid date

    // Format date and time with timezone consideration
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "";
  }
}

function formatDate(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return ""; // Invalid date
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getWeekEnd(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  d.setDate(d.getDate() - d.getDay() + 6);
  return d;
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

// Sort functions
function sortItemsSummary(items, sortBy) {
  items.sort((a, b) => {
    switch (sortBy) {
      case "released-desc":
        // Handle null/undefined released dates
        if (!a.released && !b.released) return 0;
        if (!a.released) return 1;
        if (!b.released) return -1;
        return new Date(b.released) - new Date(a.released);
      case "released-asc":
        // Handle null/undefined released dates
        if (!a.released && !b.released) return 0;
        if (!a.released) return 1;
        if (!b.released) return -1;
        return new Date(a.released) - new Date(b.released);
      case "quantity-desc":
        return b.total_quantity - a.total_quantity;
      case "quantity-asc":
        return a.total_quantity - b.total_quantity;
      case "order-desc":
        return new Date(b.order_date) - new Date(a.order_date);
      case "order-asc":
        return new Date(a.order_date) - new Date(b.order_date);
      default:
        return new Date(b.released || 0) - new Date(a.released || 0);
    }
  });
}

// Process item summary data
function processItemSummary(orderItems, searchTerm, inventoryMap) {
  const summary = {};

  orderItems?.forEach((item) => {
    if (!summary[item.code_colour]) {
      const inventoryItem = inventoryMap[item.code_colour] || {};
      summary[item.code_colour] = {
        code_colour: item.code_colour,
        item_name: item.item_name,
        total_quantity: 0,
        inventory_quantity: inventoryItem.inventory || 0,
        released: inventoryItem.released || null,
        aging: inventoryItem.aging || "",
        category: inventoryItem.catagory || "",
        total_weekly_orders: 0,
      };
    }
    summary[item.code_colour].total_quantity +=
      parseFloat(item.order_quantity) || 0;
    summary[item.code_colour].total_weekly_orders++;
  });

  return Object.values(summary).filter((item) => {
    if (!searchTerm) return true;
    return (
      item.code_colour.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.item_name &&
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
}

// Add customer summary processing
function processCustomerSummary(orders, searchTerm, inventoryMap) {
  const customerItems = orders.flatMap((order) =>
    order.order_items.map((item) => {
      const inventoryItem = inventoryMap[item.code_colour] || {};
      return {
        order_date: order.order_date,
        customer_name: order.customer_name,
        sales_agent: order.agent_state,
        item_code: item.code_colour,
        order_qty: item.order_quantity,
        release_date: inventoryItem.released || null,
        order_status: order.status,
        is_cancelled: order.is_cancelled,
        cancel_date: order.cancel_date,
        dispatch_time: order.dispatch_time,
      };
    })
  );

  return customerItems.filter((item) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.customer_name.toLowerCase().includes(searchLower) ||
      item.item_code.toLowerCase().includes(searchLower)
    );
  });
}

// Load filters
async function loadFilters() {
  try {
    // Load unique customers
    const { data: customerData, error: customerError } = await supabaseClient
      .from("order_header")
      .select("customer_name")
      .not("customer_name", "is", null);

    if (customerError) throw customerError;

    // Get unique customers (case-insensitive)
    const uniqueCustomers = Array.from(
      new Set(
        customerData
          .map((item) => item.customer_name?.trim().toUpperCase())
          .filter(Boolean)
      )
    ).sort();

    // Load agents
    const { data: agentData, error: agentError } = await supabaseClient
      .from("order_header")
      .select("agent_state")
      .not("agent_state", "is", null);

    if (agentError) throw agentError;

    // Get unique agents
    const uniqueAgents = Array.from(
      new Set(agentData.map((item) => item.agent_state?.trim()).filter(Boolean))
    ).sort();

    // Populate filter dropdowns
    const customerFilter = document.getElementById("customerFilter");
    const agentFilter = document.getElementById("agentFilter");

    if (customerFilter) {
      customerFilter.innerHTML =
        '<option value="">All Customers</option>' +
        uniqueCustomers
          .map((name) => `<option value="${name}">${name}</option>`)
          .join("");
    }

    if (agentFilter) {
      agentFilter.innerHTML =
        '<option value="">All Agents</option>' +
        uniqueAgents
          .map((state) => `<option value="${state}">${state}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Error loading filters:", error);
    alert("Error loading filters. Please try again.");
  }
}

// Load weeks for filter
async function loadCurrentWeek() {
  try {
    // Get all order dates
    const { data: orderDates, error } = await supabaseClient
      .from("order_header")
      .select("order_date")
      .order("order_date", { ascending: false });

    if (error) throw error;

    // Get unique weeks from order dates
    const uniqueWeeks = new Set();
    orderDates.forEach((order) => {
      const date = new Date(order.order_date);
      const weekStart = getWeekStart(date);
      uniqueWeeks.add(weekStart.toISOString());
    });

    // Convert to array and sort
    weeks = Array.from(uniqueWeeks)
      .map((dateStr) => {
        const start = new Date(dateStr);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end };
      })
      .sort((a, b) => b.start - a.start);

    // Update current week display
    const currentWeekInfo = document.getElementById("currentWeek");
    if (currentWeekInfo) {
      const today = new Date();
      currentWeekStart = getWeekStart(today);
      currentWeekEnd = getWeekEnd(today);
      currentWeekInfo.textContent = `Current Week: ${formatDate(
        currentWeekStart
      )} - ${formatDate(currentWeekEnd)}`;
    }

    // Populate week filter
    const weekFilter = document.getElementById("weekFilter");
    if (weekFilter && weeks.length > 0) {
      weekFilter.innerHTML =
        '<option value="">All Weeks</option>' +
        weeks
          .map((week) => {
            const value = `${week.start.toISOString()}|${week.end.toISOString()}`;
            const label = `${formatDate(week.start)} - ${formatDate(week.end)}`;
            return `<option value="${value}">${label}</option>`;
          })
          .join("");
    }

    // Update last login time
    const lastUpdated = document.getElementById("lastUpdated");
    if (lastUpdated) {
      lastUpdated.textContent = `Last Login Time: ${formatDateTime(
        new Date()
      )}`;
    }
  } catch (error) {
    console.error("Error loading weeks:", error);
    alert("Error loading week filter. Please try again.");
  }
}

// Fetch and display data
async function fetchItemsSummary(
  weekStart,
  weekEnd,
  customerFilter,
  agentFilter,
  searchTerm,
  sortBy
) {
  try {
    // First get inventory data for additional item details
    const { data: inventoryData, error: inventoryError } = await supabaseClient
      .from("inventory")
      .select("*");

    if (inventoryError) throw inventoryError;

    // Create inventory lookup map
    const inventoryMap = {};
    inventoryData.forEach((item) => {
      inventoryMap[item["code & colour"]] = item;
    });

    // Get order items with their header information
    let query = supabaseClient.from("order_header").select(`
        order_id,
        order_date,
        customer_name,
        agent_state,
        status,
        is_cancelled,
        cancel_date,
        dispatch_time,
        order_items (
          code_colour,
          item_name,
          order_quantity
        )
      `);

    if (weekStart && weekEnd) {
      query = query.gte("order_date", weekStart).lte("order_date", weekEnd);
    }

    if (customerFilter) {
      query = query.eq("customer_name", customerFilter);
    }

    if (agentFilter) {
      query = query.eq("agent_state", agentFilter);
    }

    const { data: orders, error: orderError } = await query;

    if (orderError) throw orderError;

    // Process data based on active table
    const activeTable = document.querySelector(".submenu-item.active")?.dataset
      .table;

    if (activeTable === "items") {
      // Flatten order items and process for items summary
      const flattenedItems = orders.flatMap((order) =>
        order.order_items.map((item) => ({
          ...item,
          order_header: {
            order_id: order.order_id,
            order_date: order.order_date,
            customer_name: order.customer_name,
            agent_state: order.agent_state,
            status: order.status,
            is_cancelled: order.is_cancelled,
            cancel_date: order.cancel_date,
            dispatch_time: order.dispatch_time,
          },
        }))
      );

      const itemSummary = processItemSummary(
        flattenedItems,
        searchTerm,
        inventoryMap
      );
      sortItemsSummary(itemSummary, sortBy);
      renderItemsTable(itemSummary);
    } else if (activeTable === "customers") {
      // Process for customer summary including cancelled orders
      const customerSummary = processCustomerSummary(
        orders,
        searchTerm,
        inventoryMap
      );
      sortCustomerSummary(customerSummary, sortBy);
      renderCustomerTable(customerSummary);
    }
  } catch (error) {
    console.error("Error fetching summary:", error);
    alert("Error loading summary data. Please try again.");
  }
}

// Render functions
function renderItemsTable(items) {
  const tbody = document.querySelector("#itemsTable tbody");
  tbody.innerHTML = items
    .map(
      (item) => `
      <tr>
        <td>${item.code_colour}</td>
        <td>${item.item_name || ""}</td>
        <td>${item.total_weekly_orders}</td>
        <td>${item.inventory_quantity}</td>
        <td>${formatDate(item.released)}</td>
        <td>${item.aging}</td>
        <td>${item.category}</td>
      </tr>
    `
    )
    .join("");
}

// Add renderCustomerTable function
function renderCustomerTable(items) {
  const tbody = document.querySelector("#customerTable tbody");
  tbody.innerHTML = items
    .map(
      (item) => `
    <tr>
      <td>${formatDateTime(item.order_date)}</td>
      <td>${item.customer_name}</td>
      <td class="agent-cell" style="white-space: nowrap;">${
        item.sales_agent
      }</td>
      <td>${item.item_code}</td>
      <td>${item.order_qty}</td>
      <td>
        ${
          item.is_cancelled && item.cancel_date
            ? `<span class="cancelled-status">Cancelled on ${formatDate(
                item.cancel_date
              )}</span>`
            : item.order_status === "dispatched" && item.dispatch_time
            ? `<span class="dispatched-status">Dispatched on ${formatDate(
                item.dispatch_time
              )}</span>`
            : item.order_status
        }
      </td>
    </tr>
  `
    )
    .join("");
}

// Event handlers
function setupEventListeners() {
  const filters = ["weekFilter", "customerFilter", "agentFilter", "sortSelect"];
  filters.forEach((id) => {
    document.getElementById(id)?.addEventListener("change", refreshData);
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(refreshData, 300));
  }

  // Update clear button to reset all filters
  document.getElementById("clearSearch")?.addEventListener("click", () => {
    // Reset all filters
    document.getElementById("weekFilter").value = "";
    document.getElementById("customerFilter").value = "";
    document.getElementById("agentFilter").value = "";
    document.getElementById("sortSelect").value = "released-desc";
    document.getElementById("searchInput").value = "";
    refreshData();
  });
}

// Refresh data
async function refreshData() {
  const weekFilter = document.getElementById("weekFilter").value;
  const customerFilter = document.getElementById("customerFilter").value;
  const agentFilter = document.getElementById("agentFilter").value;
  const searchTerm = document.getElementById("searchInput").value;
  const sortBy = document.getElementById("sortSelect").value;

  let weekStart = null,
    weekEnd = null;
  if (weekFilter) {
    [weekStart, weekEnd] = weekFilter.split("|");
  }

  await fetchItemsSummary(
    weekStart,
    weekEnd,
    customerFilter,
    agentFilter,
    searchTerm,
    sortBy
  );
}

// Function to switch between tables
function switchTable(tableType) {
  // Remove active class from all submenu items
  document.querySelectorAll(".submenu-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to clicked submenu item
  document.querySelector(`[data-table="${tableType}"]`).classList.add("active");

  // Hide all table containers
  document.querySelectorAll(".table-container").forEach((container) => {
    container.classList.remove("active");
  });

  // Show selected table container
  document.getElementById(`${tableType}TableContainer`).classList.add("active");

  // Refresh data if needed
  refreshData();
}

// Initialize page
async function initializePage() {
  await checkAuth();
  await loadCurrentWeek();
  await loadFilters();
  setupEventListeners();
  setupBackButton();

  // Set initial active table
  switchTable("items");

  await refreshData();
}

// Add new function to handle back button setup
function setupBackButton() {
  const user = JSON.parse(localStorage.getItem("user"));
  const backButton = document.getElementById("backButton");

  if (backButton && user) {
    // Update button text based on role
    backButton.textContent = `Back to ${
      user.role === "admin" ? "Admin" : "Viewer"
    } Dashboard`;

    // Update onclick handler
    backButton.onclick = () => {
      window.location.href =
        user.role === "admin" ? "admin.html" : "viewer.html";
    };
  }
}

// Start the application
document.addEventListener("DOMContentLoaded", initializePage);

// Export functions for global access
window.refreshData = refreshData;
window.logout = () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
};

// Export switchTable for global access
window.switchTable = switchTable;

// Add sorting for customer summary
function sortCustomerSummary(items, sortBy) {
  items.sort((a, b) => {
    switch (sortBy) {
      case "order-desc":
        return new Date(b.order_date) - new Date(a.order_date);
      case "order-asc":
        return new Date(a.order_date) - new Date(b.order_date);
      case "quantity-desc":
        return b.order_qty - a.order_qty;
      case "quantity-asc":
        return a.order_qty - b.order_qty;
      default:
        return new Date(b.order_date) - new Date(a.order_date);
    }
  });
}

// Update the sort options text to be more concise
document.addEventListener("DOMContentLoaded", function () {
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.innerHTML = `
      <option value="released-desc">Released (Newest First)</option>
      <option value="released-asc">Released (Oldest First)</option>
      <option value="quantity-desc">Quantity (High-Low)</option>
      <option value="quantity-asc">Quantity (Low-High)</option>
      <option value="order-desc">Order Date (New-Old)</option>
      <option value="order-asc">Order Date (Old-New)</option>
    `;
  }
});
// Check authentication when page loads
window.addEventListener("load", function () {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Only admin and viewer roles can access history page
  if (user.role !== "admin" && user.role !== "viewer") {
    // Redirect to appropriate page based on role
    if (user.role === "guest") {
      window.location.href = "guest.html";
    } else {
      window.location.href = "index.html";
    }
    return;
  }

  // Initialize page if authentication passes
  initializePage();
});
