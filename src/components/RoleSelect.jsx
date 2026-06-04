import { useState } from "react"
import { supabase } from "../lib/supabase"
import downloadLogo from "../assets/download.png"
import "./RoleSelect.css"

export default function RoleSelect({ user, setRole }) {
  const [loading, setLoading] = useState(null)

  async function handleRoleSelect(selectedRole) {
    setLoading(selectedRole)

    if (!user) {
      // Not logged in yet → save role then do Google OAuth
      localStorage.setItem("selected_role", selectedRole)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      })

      if (error) {
        console.error("Auth error:", error)
        setLoading(null)
      }

    } else {
      // Already logged in but no role → just save role
      await supabase.auth.updateUser({
        data: { role: selectedRole }
      })
      setRole(selectedRole)
      setLoading(null)
    }
  }

  return (
    <div className="role-screen">
      <div className="role-card">

        <div className="logo-wrap" aria-label="AI Interview logo">
          <img src={downloadLogo} alt="AI Interview logo" className="logo-image" />
        </div>

        <div className="role-heading">
          <span className="i-am">SELECT YOUR ROLE</span>
        </div>

        <div className="role-buttons">
          <button
            className={`role-btn applicant-btn ${loading === "applicant" ? "btn-loading" : ""}`}
            onClick={() => handleRoleSelect("applicant")}
            disabled={loading !== null}
          >
            {loading === "applicant" ? (
              <span className="btn-spinner"></span>
            ) : (
              <>
                <span className="role-label">APPLICANT</span>
                <span className="role-sub">Looking for a job</span>
              </>
            )}
          </button>

          <button
            className={`role-btn employer-btn ${loading === "employer" ? "btn-loading" : ""}`}
            onClick={() => handleRoleSelect("employer")}
            disabled={loading !== null}
          >
            {loading === "employer" ? (
              <span className="btn-spinner"></span>
            ) : (
              <>
                <span className="role-label">EMPLOYER</span>
                <span className="role-sub">Hiring talent</span>
              </>
            )}
          </button>
        </div>

        <p className="role-footer">
          © 2026 AI Interview Platform. All rights reserved.
        </p>

      </div>
    </div>
  )
}