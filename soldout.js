// Initialize Supabase client
const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Add this function to handle back navigation
function handleBackNavigation() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user.role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "viewer.html";
  }
}

// Load week filter options
async function loadWeekFilter() {
  try {
    // Get all items with soldout_date
    const { data, error } = await supabaseClient
      .from("inventory")
      .select("soldout_date")
      .not("soldout_date", "is", null)
      .order("soldout_date", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      document.getElementById("weekFilter").innerHTML =
        '<option value="">No sold out items found</option>';
      return;
    }

    const weeks = new Map(); // Use Map to store unique weeks

    data.forEach((item) => {
      if (item.soldout_date) {
        const date = new Date(item.soldout_date);
        // Get the start of the week (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Format the week start date as YYYY-MM-DD for Map key
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weeks.has(weekKey)) {
          // Get the end of the week (Saturday)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          weeks.set(weekKey, {
            start: weekStart.toISOString(),
            end: weekEnd.toISOString(),
            display: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
          });
        }
      }
    });

    // Convert Map to Array and sort by date
    const weekOptions = Array.from(weeks.values()).sort(
      (a, b) => new Date(b.start) - new Date(a.start)
    );

    // Populate select element
    const weekSelect = document.getElementById("weekFilter");
    weekSelect.innerHTML = ""; // Clear existing options

    weekOptions.forEach((week) => {
      const option = document.createElement("option");
      option.value = JSON.stringify({
        start: week.start,
        end: week.end,
      });
      option.textContent = week.display;
      weekSelect.appendChild(option);
    });

    // Select the latest week by default and load initial data
    if (weekOptions.length > 0) {
      weekSelect.value = JSON.stringify({
        start: weekOptions[0].start,
        end: weekOptions[0].end,
      });
      await filterSoldOutItems();
    }
  } catch (error) {
    console.error("Error loading week filter:", error);
    alert("Error loading week filter: " + error.message);
  }
}

// Filter sold out items based on selected week
async function filterSoldOutItems() {
  try {
    const weekFilter = document.getElementById("weekFilter").value;
    if (!weekFilter) {
      return;
    }

    const { start, end } = JSON.parse(weekFilter);

    const { data, error } = await supabaseClient
      .from("inventory")
      .select('*, "code & colour", "item name", released')
      .eq("status", "Out of Stock")
      .gte("soldout_date", start)
      .lte("soldout_date", end)
      .order("soldout_date", { ascending: false });

    if (error) throw error;

    const tbody = document.querySelector("#soldOutTable tbody");
    tbody.innerHTML = "";

    if (data && data.length > 0) {
      // Define status priority order
      const statusPriority = {
        "New Release": 1,
        "Full Price": 2,
        "On Sale": 3,
      };

      // Sort data by status priority and then by soldout_date
      const sortedData = data.sort((a, b) => {
        // First sort by status priority
        const statusA = statusPriority[a.soldout_status] || 999; // Unknown statuses go last
        const statusB = statusPriority[b.soldout_status] || 999;

        if (statusA !== statusB) {
          return statusA - statusB;
        }

        // If same status, sort by soldout_date (newest first)
        return new Date(b.soldout_date) - new Date(a.soldout_date);
      });

      // Create table rows with status-based styling
      sortedData.forEach((item) => {
        const tr = document.createElement("tr");

        // Add status-specific class for row styling
        const statusClass = getStatusClass(item.soldout_status);
        tr.className = `status-${statusClass}`;

        tr.innerHTML = `
          <td>${item["code & colour"] || ""}</td>
          <td>${item["item name"] || ""}</td>
          <td>${formatDate(item.released) || "N/A"}</td>
          <td>${formatDate(item.soldout_date)}</td>
          <td>
            <span class="status-badge ${statusClass}">
              ${item.soldout_status || "N/A"}
            </span>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="no-items">
            No sold out items found for this week
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Error filtering sold out items:", error);
    alert("Error filtering sold out items: " + error.message);
  }
}

// Add helper function to get status class
function getStatusClass(status) {
  switch (status) {
    case "New Release":
      return "new-release";
    case "Full Price":
      return "full-price";
    case "On Sale":
      return "on-sale";
    default:
      return "unknown-status";
  }
}

// Format date helper function
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ""; // Invalid date
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

// Initialize page
window.addEventListener("load", async function () {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Update back button text based on user role
  const backButton = document.querySelector(
    ".header-buttons button:first-child"
  );
  if (backButton) {
    backButton.textContent = `Back to ${
      user.role === "admin" ? "Admin" : "Viewer"
    }`;
    backButton.addEventListener("click", handleBackNavigation);
  }

  // Add click event listener to logout button
  const logoutButton = document.querySelector(
    ".header-buttons button:last-child"
  );
  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  // Load the week filter and initial data
  await loadWeekFilter();
});

// Logout function
function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Make sure functions are available globally
window.handleBackNavigation = handleBackNavigation;
window.logout = logout;
window.filterSoldOutItems = filterSoldOutItems;
