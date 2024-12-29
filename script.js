const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co"; // Replace with your Supabase URL
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g"; // Replace with your Supabase anon key
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Redirect user based on their role
async function redirectToRolePage() {
  const user = supabase.auth.user();
  if (!user) {
    alert("No user logged in!");
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email)
    .single();

  if (error) {
    console.error("Error fetching role:", error);
    alert("Unable to determine role.");
    return;
  }

  const role = data.role;
  if (role === "admin") {
    window.location.href = "admin.html";
  } else if (role === "viewer") {
    window.location.href = "index.html";
  } else {
    alert("Invalid role!");
  }
}

// Display inventory
async function displayInventory(isAdmin = false) {
  const { data: inventory, error } = await supabase
    .from("inventory")
    .select("*");
  if (error) {
    console.error("Error fetching inventory:", error);
    return;
  }

  const inventoryList = document.getElementById("inventory-list");
  inventoryList.innerHTML = "";

  inventory.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "inventory-item";
    itemDiv.innerHTML = `
      <p><strong>${item.name}</strong> (${item.quantity} units @ $${
      item.price
    })</p>
      <p>${item.description}</p>
      ${
        isAdmin
          ? `<button onclick="deleteItem(${item.id})">Delete</button>`
          : ""
      }
    `;
    inventoryList.appendChild(itemDiv);
  });
}

// Add new item
async function addItem(item) {
  const { data, error } = await supabase.from("inventory").insert([item]);
  if (error) {
    console.error("Error adding item:", error);
    alert("Failed to add item.");
    return;
  }
  console.log("Item added:", data);
}

// Delete item (Admin only)
async function deleteItem(id) {
  const { data, error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting item:", error);
    alert("Failed to delete item.");
    return;
  }
  console.log("Item deleted:", data);
  displayInventory(true); // Refresh the list
}

// Logout function
async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout failed:", error);
    alert("Failed to log out.");
    return;
  }
  window.location.href = "login.html";
}

// Redirect to login if not authenticated
async function checkAuth() {
  const user = supabase.auth.user();
  if (!user) {
    window.location.href = "login.html";
  }
}

// Call checkAuth on page load
checkAuth();
