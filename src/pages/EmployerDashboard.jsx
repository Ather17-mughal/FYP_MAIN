import { supabase } from "../lib/supabase"

export default function EmployerDashboard({ user }) {
  return (
    <div style={{ color: "white", padding: "40px", textAlign: "center" }}>
      <h1>Welcome, {user.user_metadata.full_name} 👋</h1>
      <p style={{ color: "#6b7280", marginTop: "8px" }}>Employer Dashboard — Coming Soon</p>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ marginTop: "24px", padding: "10px 24px", background: "#4eb157", border: "1px solid #3a8a42", borderRadius: "10px", color: "white", cursor: "pointer" }}
      >
        Sign Out
      </button>
    </div>
  )
}