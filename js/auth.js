class Auth {
  constructor() {
    this.initialize();
  }

  async initialize() {
    const loginForm = document.getElementById("loginForm");
    const logoutBtn = document.getElementById("logout");

    // Check if we're on the login page
    const isLoginPage =
      window.location.pathname.endsWith("index.html") ||
      window.location.pathname.endsWith("/");

    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
      // If on login page, don't check auth
      if (isLoginPage) {
        return;
      }
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.handleLogout();
      });
    }

    // Only check auth if not on login page
    if (!isLoginPage) {
      await this.checkAuth();
      // Dispatch event when auth is ready
      document.dispatchEvent(new Event("authReady"));
    }
  }

  async checkAuth() {
    try {
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.getUser();
      if (error || !user) {
        window.location.href = "../index.html";
        return;
      }

      // Get user's role from users table
      const { data: userData, error: userError } = await supabaseClient
        .from("users")
        .select("role")
        .eq("auth_user_id", user.id)
        .single();

      if (userError || !userData) {
        console.error("Error getting user role:", userError);
        window.location.href = "../index.html";
        return;
      }

      const userEmailElement = document.getElementById("userEmail");
      if (userEmailElement) {
        userEmailElement.textContent = user.email;
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      window.location.href = "../index.html";
    }
  }

  async handleLogout() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      window.location.href = "../index.html";
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Error signing out. Please try again.");
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user's role from users table
      const { data: userData, error: userError } = await supabaseClient
        .from("users")
        .select("role")
        .eq("auth_user_id", user.id)
        .single();

      if (userError) throw userError;
      if (!userData || !userData.role) {
        throw new Error("User role not found. Please contact administrator.");
      }

      const role = userData.role;
      console.log("Detected role:", role);

      // Redirect based on role
      switch (role.toLowerCase()) {
        case "admin":
          window.location.href = "admin/dashboard.html";
          break;
        case "sales":
          window.location.href = "sales/dashboard.html";
          break;
        case "staff":
          window.location.href = "staff/dashboard.html";
          break;
        case "stock":
          window.location.href = "warehouse/dashboard.html";
          break;
        default:
          throw new Error(`Invalid user role: ${role}`);
      }
    } catch (error) {
      console.error("Error:", error.message);
      const errorMessage = document.getElementById("errorMessage");
      if (errorMessage) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = "block";
      } else {
        alert(error.message);
      }
      // Clear password field on error
      document.getElementById("password").value = "";
    }
  }
}

// Initialize auth when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new Auth();
});
