import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import "./ProfileOnboardingModal.css"

function getInitialForm(user) {
  return {
    fullName: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
    email: user?.email || "",
    phone: "",
    location: "",
    education: "",
    university: "",
    degreeProgram: "",
    graduationYear: "",
    skills: "",
    experienceLevel: "",
    desiredRole: "",
    workType: "",
    salaryExpectation: "",
    startDate: "",
  }
}

export default function ProfileOnboardingModal({ onClose, onLater, user }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => getInitialForm(user))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const totalSteps = 3
  const progress = useMemo(() => (step / totalSteps) * 100, [step])

  useEffect(() => {
    setForm(getInitialForm(user))
  }, [user])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError("")

    // Debug — check user and form
    console.log("User ID:", user?.id)
    console.log("Form:", form)

    try {
      const { data: existing } = await supabase
        .from("applicant_profile")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (existing) {
        const { error: updateError } = await supabase
          .from("applicant_profile")
          .update({
            full_name: form.fullName,
            email: form.email,
            phone: form.phone,
            location: form.location,
            education: form.education,
            university: form.university,
            degree_program: form.degreeProgram,
            graduation_year: form.graduationYear,
            skills: form.skills,
            experience_level: form.experienceLevel,
            desired_role: form.desiredRole,
            work_type: form.workType,
            salary_expectation: form.salaryExpectation,
            start_date: form.startDate,
          })
          .eq("user_id", user.id)

        if (updateError) throw updateError

      } else {
        const { error: insertError } = await supabase
          .from("applicant_profile")
          .insert({
            user_id: user.id,
            full_name: form.fullName,
            email: form.email,
            phone: form.phone,
            location: form.location,
            education: form.education,
            university: form.university,
            degree_program: form.degreeProgram,
            graduation_year: form.graduationYear,
            skills: form.skills,
            experience_level: form.experienceLevel,
            desired_role: form.desiredRole,
            work_type: form.workType,
            salary_expectation: form.salaryExpectation,
            start_date: form.startDate,
          })

        if (insertError) throw insertError
      }

      localStorage.setItem("profile_setup_status", "completed")
      onClose()

    } catch (err) {
      console.error("Save error:", err)
      setError(err.message || "Failed to save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    localStorage.setItem("profile_setup_status", "skipped")
    onLater?.()
    onClose()
  }

  return (
    <div className="profile-overlay" role="dialog" aria-modal="true" aria-label="Profile setup">
      <div className="profile-panel">
        <div className="profile-header">
          <div>
            <p className="eyebrow">Profile Setup</p>
            <h2>Complete your profile</h2>
            <p className="subtle">This helps us tailor your experience and improve AI matching.</p>
          </div>
          <button className="ghost-btn" onClick={handleSkip}>Fill later</button>
        </div>

        <div className="progress-wrap" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {step === 1 && (
          <section className="step-card">
            <h3>1. Basic Profile Information</h3>
            <p className="step-note">These are essential.</p>
            <div className="field-grid">
              <label>Full Name<input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Enter your full name" /></label>
              <label>Email<input value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="name@example.com" /></label>
              <label>Phone Number<input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+92 300 0000000" /></label>
              <label>Location<input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Karachi, Pakistan" /></label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="step-card">
            <h3>2. Professional Information</h3>
            <p className="step-note">Very important for AI screening.</p>
            <div className="field-grid">
              <label>Current Education<input value={form.education} onChange={(e) => updateField("education", e.target.value)} placeholder="BS Software Engineering" /></label>
              <label>University / Institute<input value={form.university} onChange={(e) => updateField("university", e.target.value)} placeholder="Sukkur IBA University" /></label>
              <label>Degree Program<input value={form.degreeProgram} onChange={(e) => updateField("degreeProgram", e.target.value)} placeholder="CS, SE, AI" /></label>
              <label>Graduation Year<input value={form.graduationYear} onChange={(e) => updateField("graduationYear", e.target.value)} placeholder="2026" /></label>
              <label>Skills<input value={form.skills} onChange={(e) => updateField("skills", e.target.value)} placeholder="React, AI, Python" /></label>
              <label>Experience Level<input value={form.experienceLevel} onChange={(e) => updateField("experienceLevel", e.target.value)} placeholder="Junior / Senior" /></label>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="step-card">
            <h3>3. Job Preferences</h3>
            <p className="step-note">Useful for recommendations.</p>
            <div className="field-grid">
              <label>Desired Role<input value={form.desiredRole} onChange={(e) => updateField("desiredRole", e.target.value)} placeholder="Frontend, Backend" /></label>
              <label>Preferred Work Type<input value={form.workType} onChange={(e) => updateField("workType", e.target.value)} placeholder="Remote / Hybrid" /></label>
              <label>Salary Expectation (optional)<input value={form.salaryExpectation} onChange={(e) => updateField("salaryExpectation", e.target.value)} placeholder="50k - 80k" /></label>
              <label>Available Start Date<input value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} placeholder="Immediate / 30 days" /></label>
            </div>
          </section>
        )}

        {error && (
          <p style={{ color: "#f87171", fontSize: "0.85rem", textAlign: "center", marginTop: "8px" }}>
            ⚠️ {error}
          </p>
        )}

        <div className="nav-row">
          <button
            className="ghost-btn"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1 || saving}
          >
            Back
          </button>
          {step < totalSteps ? (
            <button
              className="primary-btn"
              onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))}
            >
              Next
            </button>
          ) : (
            <button
              className="primary-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}