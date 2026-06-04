import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import RoleSelect from "./components/RoleSelect"
import ProfilePromptModal from "./components/ProfilePromptModal"
import ProfileOnboardingModal from "./components/ProfileOnboardingModal"
import ApplicantDashboard from "./pages/ApplicantDashboard"
import EmployerDashboard from "./pages/EmployerDashboard"
import "./App.css"

export default function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  useEffect(() => {
    const status = typeof window !== "undefined" ? localStorage.getItem("profile_setup_status") : null
    const needsProfileSetup = Boolean(user && role && status !== "completed" && status !== "skipped")
    setShowProfilePrompt(needsProfileSetup)
  }, [user, role])

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Get role from user metadata
        const savedRole = session.user.user_metadata?.role
        setRole(savedRole)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const savedRole = session.user.user_metadata?.role
          setRole(savedRole)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  // Not logged in → show role selection
  if (!user) return <RoleSelect />

  // Logged in → show correct dashboard based on role
  if (role === "applicant") {
    return (
      <>
        <ApplicantDashboard user={user} />
        {showProfilePrompt && !showProfileModal && (
          <ProfilePromptModal
            onFillNow={() => {
              setShowProfilePrompt(false)
              setShowProfileModal(true)
            }}
            onFillLater={() => {
              localStorage.setItem("profile_setup_status", "skipped")
              setShowProfilePrompt(false)
            }}
          />
        )}
        {showProfileModal && (
          <ProfileOnboardingModal
            user={user}
            onClose={() => setShowProfileModal(false)}
            onLater={() => setShowProfilePrompt(false)}
          />
        )}
      </>
    )
  }

  if (role === "employer") {
    return (
      <>
        <EmployerDashboard user={user} />
        {showProfilePrompt && !showProfileModal && (
          <ProfilePromptModal
            onFillNow={() => {
              setShowProfilePrompt(false)
              setShowProfileModal(true)
            }}
            onFillLater={() => {
              localStorage.setItem("profile_setup_status", "skipped")
              setShowProfilePrompt(false)
            }}
          />
        )}
        {showProfileModal && (
          <ProfileOnboardingModal
            user={user}
            onClose={() => setShowProfileModal(false)}
            onLater={() => setShowProfilePrompt(false)}
          />
        )}
      </>
    )
  }

  // Logged in but no role yet → show role selection again
  return <RoleSelect user={user} setRole={setRole} />
}