const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter both email and password");
    return;
  }

  try {
    // Sign in the user
    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email: username,
        password: password,
      });

    if (authError) throw authError;

    // Get the user's role from the users table
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("role")
      .eq("email", username)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData) {
      throw new Error("User not found in database");
    }

    // Store user data
    localStorage.setItem(
      "user",
      JSON.stringify({
        email: username,
        role: userData.role,
      })
    );

    // Redirect based on role
    window.location.href =
      userData.role === "admin" ? "admin.html" : "viewer.html";
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed: " + (error.message || "Invalid credentials"));
  }
}

// Check if user is already logged in
window.addEventListener("load", function () {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    if (user.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "viewer.html";
    }
  }
});
