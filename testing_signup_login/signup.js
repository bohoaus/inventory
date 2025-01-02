// Initial Setup and Configuration
const supabaseUrl = "https://twjuvshslihzobyamtfj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3anV2c2hzbGloem9ieWFtdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MTQxOTMsImV4cCI6MjA1MTA5MDE5M30.3mE-W4CskWOg4490dgm-bjMmdo8cghAk6y7JCDtco1g";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// DOM Elements
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");
const userDashboard = document.getElementById("userDashboard");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const tabBtns = document.querySelectorAll(".tab-btn");
const authForms = document.querySelectorAll(".auth-form");

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const tabName = btn.dataset.tab;
    authForms.forEach((form) => {
      form.classList.add("hidden");
      if (form.id === `${tabName}Form`) {
        form.classList.remove("hidden");
      }
    });
  });
});

// Check if user is already logged in
async function checkUser() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (user) {
    showDashboard(user);
  }
}

// Show dashboard
function showDashboard(user) {
  document.querySelector(".auth-container").classList.add("hidden");
  userDashboard.classList.remove("hidden");
  userEmail.textContent = user.email;
}

// Login form submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    loginMessage.textContent = "Login successful!";
    loginMessage.classList.add("success");
    showDashboard(data.user);
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.classList.add("error");
  }
});

// Signup form submission
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    signupMessage.textContent = "Check your email to confirm your account!";
    signupMessage.classList.add("success");
  } catch (error) {
    signupMessage.textContent = error.message;
    signupMessage.classList.add("error");
  }
});

// Logout functionality
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  userDashboard.classList.add("hidden");
  document.querySelector(".auth-container").classList.remove("hidden");
  loginForm.reset();
  signupForm.reset();
});

// Check user status when page loads
checkUser();
