// Configuration for the application
const config = {
  SUPABASE_URL: "https://zgkvnervcankwdengvpr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3ZuZXJ2Y2Fua3dkZW5ndnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzODczMDYsImV4cCI6MjA1MTk2MzMwNn0.O-Zis9DjH16hg-J6oCO8RXl7EDxzpRhT9KqNJ_XukpY",
};

// Create Supabase client
const supabaseClient = supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);
