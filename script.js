const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error) throw error;

    // Get user role from your users table or metadata
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("role")
      .eq("email", username)
      .single();

    if (userError) throw userError;
    // Store user data
    localStorage.setItem(
      "user",
      JSON.stringify({
        email: username,
        role: userData.role,
      })
    );

    // Redirect based on role
    switch (userData.role) {
      case "admin":
        window.location.href = "admin.html";
        break;
      case "viewer":
        window.location.href = "viewer.html";
        break;
      case "guest":
        window.location.href = "guest.html";
        break;
      default:
        throw new Error("Invalid role");
    }
  } catch (error) {
    alert(error.message);
  }
}

// Check if user is already logged in
window.addEventListener("load", function () {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    if (user.role === "admin") {
      window.location.href = "admin.html";
    } else if (user.role === "viewer") {
      window.location.href = "viewer.html";
    } else {
      window.location.href = "guest.html";
    }
  }
});
