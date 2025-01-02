// Initialize Supabase client
const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let pieChart = null;
let allWeekData = [];
let currentWeekData = null;

// Check authentication
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

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount || 0);
}

// Update formatNumber function to ensure integer values
function formatNumber(number) {
  // Ensure we're working with integers
  const intValue = parseInt(number) || 0;
  return intValue.toLocaleString("en-AU", {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
}

// Update formatWeekRange function to handle date formatting
function formatWeekRange(weekStart, weekEnd) {
  try {
    if (!weekStart || !weekEnd) return "";

    const start = new Date(weekStart);
    const end = new Date(weekEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";

    const formatDate = function (date) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return day + "/" + month + "/" + year;
    };

    return formatDate(start) + " - " + formatDate(end);
  } catch (error) {
    console.error("Error formatting week range:", error);
    return "";
  }
}

// Fetch and display history data
async function fetchHistoryData() {
  try {
    const { data, error } = await supabaseClient
      .from("weekly_state_orders")
      .select("*")
      .order("week_start", { ascending: false });

    if (error) throw error;

    // Store all week data globally
    allWeekData = data;
    // Set current week as first week and add week_range
    currentWeekData = {
      ...data[0],
      week_range: formatWeekRange(data[0].week_start, data[0].week_end),
    };

    // Populate week filter with all weeks
    populateWeekFilter(data);

    const tbody = document.getElementById("historyTableBody");
    const rows = data.map(function (row) {
      // Ensure all numeric values are converted to integers
      const weekRange = formatWeekRange(row.week_start, row.week_end);
      const qld = parseInt(row.qld_amount) || 0;
      const nsw = parseInt(row.nsw_amount) || 0;
      const sa = parseInt(row.sa_amount) || 0;
      const wa = parseInt(row.wa_amount) || 0;
      const vic = parseInt(row.vic_amount) || 0;
      const nz = parseInt(row.nz_amount) || 0;
      const nt = parseInt(row.nt_amount) || 0;
      const act = parseInt(row.act_amount) || 0;
      const others = parseInt(row.others_amount) || 0;
      const paid = parseInt(row.paid_total) || 0;
      const overall = parseInt(row.overall_total) || 0;

      return (
        "<tr>" +
        "<td>" +
        weekRange +
        "</td>" +
        '<td class="amount">' +
        formatNumber(qld) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(nsw) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(sa) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(wa) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(vic) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(nz) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(nt) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(act) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(others) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(paid) +
        "</td>" +
        '<td class="amount">' +
        formatNumber(overall) +
        "</td>" +
        "</tr>"
      );
    });
    tbody.innerHTML = rows.join("");

    // Update pie chart with current week's data
    if (data.length > 0) {
      updatePieChart(currentWeekData);
    }
  } catch (error) {
    console.error("Error fetching history data:", error);
    alert("Error loading history data. Please try again.");
  }
}

// Update pie chart
function updatePieChart(weekData) {
  const ctx = document.getElementById("statesPieChart").getContext("2d");
  const states = ["QLD", "NSW", "SA", "WA", "VIC", "NZ", "NT", "ACT", "OTHERS"];
  const amounts = states.map(function (state) {
    return parseInt(weekData[state.toLowerCase() + "_amount"]) || 0;
  });

  if (pieChart) {
    pieChart.destroy();
  }

  // Calculate totals
  const paidTotal = parseInt(weekData.paid_total) || 0;
  const overallTotal = parseInt(weekData.overall_total) || 0;

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: states.map((state) => {
        const amount = parseInt(weekData[state.toLowerCase() + "_amount"]) || 0;
        return state + " - " + formatNumber(amount);
      }),
      datasets: [
        {
          data: amounts,
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FF99CC",
            "#66FF99",
            "#999999",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: [
            "Selected Week: " + weekData.week_range,
            "Orders by State",
            "",
            "Paid Total: " + formatNumber(paidTotal),
            "Paid/Unpaid Total: " + formatNumber(overallTotal),
          ],
          font: {
            size: 16,
          },
          padding: {
            bottom: 20,
          },
        },
        legend: {
          position: "right",
          labels: {
            font: {
              size: 15,
            },
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label.split(" - ")[0] || "";
              const value = parseInt(context.raw) || 0;
              const total = context.dataset.data.reduce(function (a, b) {
                return a + parseInt(b);
              }, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return (
                label + ": " + formatNumber(value) + " (" + percentage + "%)"
              );
            },
          },
        },
      },
    },
  });
}

// Refresh data
async function refreshData() {
  window.location.reload();
}

// Update initializePage function to include setupScrollButtons
async function initializePage() {
  await checkAuth();
  updateTimeInfo();
  await fetchHistoryData();
  setupBackButton();

  // Add week filter event listener
  const weekFilter = document.getElementById("weekFilter");
  if (weekFilter) {
    weekFilter.addEventListener("change", handleWeekFilterChange);
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

// Add function to populate week filter
function populateWeekFilter(data) {
  const weekFilter = document.getElementById("weekFilter");
  if (!weekFilter) return;

  // Clear existing options
  weekFilter.innerHTML = "";

  // Add options for each week
  data.forEach((row, index) => {
    const weekRange = formatWeekRange(row.week_start, row.week_end);
    const option = document.createElement("option");
    option.value = index;
    option.textContent = weekRange;
    // Set current week (first week) as default selected
    if (index === 0) {
      option.selected = true;
    }
    weekFilter.appendChild(option);
  });
}

// Add week filter change handler
function handleWeekFilterChange(event) {
  const selectedIndex = parseInt(event.target.value);
  if (selectedIndex >= 0 && allWeekData[selectedIndex]) {
    const selectedWeek = allWeekData[selectedIndex];
    const weekData = Object.assign({}, selectedWeek, {
      week_range: formatWeekRange(
        selectedWeek.week_start,
        selectedWeek.week_end
      ),
      // Initialize Supabase client
    });
    updatePieChart(weekData);
  }
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

// Add function to update time information
function updateTimeInfo() {
  // Update current week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  document.getElementById(
    "currentWeek"
  ).textContent = `Current Week: ${formatDate(weekStart)} - ${formatDate(
    weekEnd
  )}`;

  // Update last login time
  document.getElementById(
    "lastUpdated"
  ).textContent = `Last Login Time: ${now.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${now.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })}`;
}
