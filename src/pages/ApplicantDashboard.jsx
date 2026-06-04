import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import downloadLogo from "../assets/download.png"
import "./ApplicantDashboard.css"

export default function ApplicantDashboard({ user }) {
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [activeNav, setActiveNav] = useState("home")
  const [cvInfo, setCvInfo] = useState(() => {
    try {
      const stored = localStorage.getItem("applicant_cv")
      return stored ? JSON.parse(stored) : null
    } catch (err) {
      return null
    }
  })
  const [cvMessage, setCvMessage] = useState("")
  const [selectedJob, setSelectedJob] = useState(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyingJob, setApplyingJob] = useState(null)
  const [appliedJobs, setAppliedJobs] = useState([])
  const [applying, setApplying] = useState(false)

  const [applySuccess, setApplySuccess] = useState("")

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
    setJobs(data || [])
    setLoadingJobs(false)
  }, [])

  async function fetchAppliedJobs() {
    const { data } = await supabase
      .from("applications")
      .select("job_id")
      .eq("applicant_id", user.id)
    setAppliedJobs(data?.map(a => a.job_id) || [])
  }

  useEffect(() => {
  const timer = setTimeout(() => {
    fetchJobs()
    fetchAppliedJobs()
    loadCvInfo()
  }, 0)
  return () => clearTimeout(timer)
}, [fetchJobs])

async function loadCvInfo() {
  const cached = localStorage.getItem("applicant_cv")
  if (cached) {
    setCvInfo(JSON.parse(cached))
    return
  }

  const { data } = await supabase
    .from("applicant_profile")
    .select("cv_url, cv_name, cv_size, cv_uploaded_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (data?.cv_url) {
    const cvData = {
      name: data.cv_name,
      size: data.cv_size,
      uploadedAt: data.cv_uploaded_at,
      path: data.cv_url
    }
    setCvInfo(cvData)
    localStorage.setItem("applicant_cv", JSON.stringify(cvData))
  }
}

 async function handleCvUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  setCvMessage("Uploading...")

  try {
    // File path: CV/user_id/filename
    const filePath = `${user.id}/${file.name}`

    // Delete old CV first if exists
    if (cvInfo) {
      await supabase.storage
        .from("CV")
        .remove([`${user.id}/${cvInfo.name}`])
    }

    // Upload new CV to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("CV")
      .upload(filePath, file, {
        upsert: true
      })

    if (uploadError) throw uploadError

    // Save CV metadata to applicant_profile table
    const { error: updateError } = await supabase
      .from("applicant_profile")
      .update({
        cv_url: filePath,
        cv_name: file.name,
        cv_size: file.size,
        cv_uploaded_at: new Date().toISOString()
      })
      .eq("user_id", user.id)

    if (updateError) throw updateError

    const newCvInfo = {
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      path: filePath
    }

    // Update local state
    setCvInfo(newCvInfo)
    localStorage.setItem("applicant_cv", JSON.stringify(newCvInfo))
    setCvMessage("CV uploaded successfully to cloud!")

  } catch (err) {
    console.error("Upload error:", err)
    setCvMessage("Upload failed: " + err.message)
  }
}

async function handleRemoveCv() {
  try {
    if (cvInfo?.path) {
      // Remove from Supabase storage
      await supabase.storage
        .from("CV")
        .remove([cvInfo.path])

      // Clear cv_url from profile
      await supabase
        .from("applicant_profile")
        .update({ cv_url: null, cv_name: null })
        .eq("user_id", user.id)
    }

    // Clear local state
    localStorage.removeItem("applicant_cv")
    setCvInfo(null)
    setCvMessage("CV removed successfully.")

  } catch (err) {
    setCvMessage("Remove failed: " + err.message)
  }
}

  function handleViewDetails(job) {
    setSelectedJob(job)
    setActiveNav("jobDetails")
  }

  function handleBackToJobs() {
    setSelectedJob(null)
    setActiveNav("jobs")
  }

  function handleOpenApplyModal(job) {
    setApplyingJob(job)
    setShowApplyModal(true)
  }

  function handleCloseApplyModal() {
    setShowApplyModal(false)
    setApplyingJob(null)
  }

  async function handleConfirmApply(cvToUse) {
    if (!cvToUse) return
    setApplying(true)

    const { error } = await supabase
      .from("applications")
      .insert({
        job_id: applyingJob.id,
        applicant_id: user.id,
        status: "pending",
        cv_name: cvToUse.name,
      })

    if (!error) {
      setAppliedJobs(prev => [...prev, applyingJob.id])
      setApplySuccess("Application submitted successfully!")
      setTimeout(() => {
        setShowApplyModal(false)
        setApplyingJob(null)
        setApplySuccess("")
      }, 1500)
    }

    setApplying(false)
  }

  const firstName = user.user_metadata.full_name?.split(" ")[0] || "there"
  const alreadyApplied = applyingJob ? appliedJobs.includes(applyingJob.id) : false

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="app-logo">
          <img src={downloadLogo} alt="HireNest logo" className="app-logo-mark" />
          <span className="app-logo-text">HireNest</span>
        </div>
        <nav className="app-nav">
          <button className={`app-nav-item ${activeNav === "home" ? "app-nav-active" : ""}`} onClick={() => setActiveNav("home")}>
            <span>🏠</span> Home
          </button>
          <button className={`app-nav-item ${activeNav === "jobs" ? "app-nav-active" : ""}`} onClick={() => setActiveNav("jobs")}>
            <span>💼</span> Browse Jobs
          </button>
          <button className={`app-nav-item ${activeNav === "CV" ? "app-nav-active" : ""}`} onClick={() => setActiveNav("CV")}>
            <span>📄</span> Upload CV
          </button>
          <button className="app-nav-item app-nav-disabled" disabled>
            <span>📋</span> My Applications
          </button>
          <button className="app-nav-item app-nav-disabled" disabled>
            <span>🎯</span> Practice Interview
          </button>
          <button className="app-nav-item app-nav-disabled" disabled>
            <span>👤</span> My Profile
          </button>
        </nav>
        <div className="app-sidebar-footer">
          <div className="app-user-info">
            <div className="app-avatar">
              {user.user_metadata.full_name?.charAt(0) || "A"}
            </div>
            <div>
              <p className="app-username">{user.user_metadata.full_name}</p>
              <p className="app-email">{user.email}</p>
            </div>
          </div>
          <button className="app-signout-btn" onClick={() => supabase.auth.signOut()}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">

        {/* HOME */}
        {activeNav === "home" && (
          <div className="app-content">
            <div className="app-welcome">
              <div>
                <h1>Welcome back, {firstName} 👋</h1>
                <p>Find your next opportunity and ace the AI interview</p>
              </div>
            </div>
            <div className="app-stats">
              <div className="app-stat-card">
                <p className="app-stat-number">{appliedJobs.length}</p>
                <p className="app-stat-label">Jobs Applied</p>
              </div>
              <div className="app-stat-card">
                <p className="app-stat-number">0</p>
                <p className="app-stat-label">Interviews Done</p>
              </div>
              <div className="app-stat-card">
                <p className="app-stat-number">0</p>
                <p className="app-stat-label">Offers Received</p>
              </div>
            </div>
            <div className="app-section">
              <div className="app-section-header">
                <h2>Available Jobs</h2>
                <button className="app-view-all" onClick={() => setActiveNav("jobs")}>
                  View All →
                </button>
              </div>
              {loadingJobs ? (
                <p className="app-loading">Loading jobs...</p>
              ) : jobs.length === 0 ? (
                <div className="app-empty"><p>No jobs available right now.</p></div>
              ) : (
                <div className="app-jobs-list">
                  {jobs.slice(0, 3).map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      applied={appliedJobs.includes(job.id)}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BROWSE JOBS */}
        {activeNav === "jobs" && (
          <div className="app-content">
            <div className="app-page-header">
              <h1>Browse Jobs</h1>
              <p>Find the perfect role and showcase your skills</p>
            </div>
            {loadingJobs ? (
              <p className="app-loading">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <div className="app-empty"><p>No jobs available right now.</p></div>
            ) : (
              <div className="app-jobs-list">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    applied={appliedJobs.includes(job.id)}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* JOB DETAILS */}
        {activeNav === "jobDetails" && selectedJob && (
          <div className="app-content">
            <div className="app-page-header job-details-page-header">
              <button className="ghost-btn" onClick={handleBackToJobs}>← Back</button>
              <div>
                <p className="job-details-label">Job Details</p>
                <h1>{selectedJob.title}</h1>
                <p>{selectedJob.location || "Location not specified"}</p>
              </div>
            </div>

            <div className="app-section job-details-page">
              <div className="job-details-grid">
                <div className="job-details-item">
                  <span>Work Type</span>
                  <strong>{selectedJob.work_type || "Not specified"}</strong>
                </div>
                <div className="job-details-item">
                  <span>Experience</span>
                  <strong>{selectedJob.experience_level || "Not specified"}</strong>
                </div>
                <div className="job-details-item">
                  <span>Salary</span>
                  <strong>{selectedJob.salary_range || "Not specified"}</strong>
                </div>
                <div className="job-details-item">
                  <span>Minimum Score</span>
                  <strong>{selectedJob.min_passing_score || 60}%</strong>
                </div>
                <div className="job-details-item">
                  <span>Posted</span>
                  <strong>{new Date(selectedJob.created_at).toLocaleDateString()}</strong>
                </div>
              </div>

              <div className="job-details-block">
                <h2>Description</h2>
                <p>{selectedJob.description || "No description provided."}</p>
              </div>

              <div className="job-details-block">
                <h2>Required Skills</h2>
                <p>{selectedJob.required_skills || "Not specified"}</p>
              </div>

              {/* Apply / Leave buttons */}
              <div className="job-details-actions">
                <button className="leave-btn" onClick={handleBackToJobs}>
                  Leave
                </button>
                <button
                  className={`apply-btn ${appliedJobs.includes(selectedJob.id) ? "applied-btn" : ""}`}
                  onClick={() => !appliedJobs.includes(selectedJob.id) && handleOpenApplyModal(selectedJob)}
                  disabled={appliedJobs.includes(selectedJob.id)}
                >
                  {appliedJobs.includes(selectedJob.id) ? "✓ Applied" : "Apply Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CV UPLOAD */}
        {activeNav === "CV" && (
          <div className="app-content">
            <div className="app-page-header">
              <h1>Upload CV</h1>
              <p>Your CV is saved locally for now. Supabase storage coming soon.</p>
            </div>
            <div className="app-section CV-section">
              <h2>Resume Upload</h2>
              <p className="CV-note">Upload a PDF or DOC file.</p>
              <label className="CV-upload-box">
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleCvUpload} />
                <span>Choose CV file</span>
              </label>
              {cvInfo ? (
                <div className="CV-status-card">
                  <p className="CV-status-title">Current CV</p>
                  <p className="CV-name">{cvInfo.name}</p>
                  <p className="CV-meta">{cvInfo.type} • {(cvInfo.size / 1024).toFixed(1)} KB</p>
                  <p className="CV-meta">Uploaded: {new Date(cvInfo.uploadedAt).toLocaleString()}</p>
                  <button className="CV-remove-btn" onClick={handleRemoveCv}>Remove CV</button>
                </div>
              ) : (
                <p className="CV-empty">No CV uploaded yet.</p>
              )}
              {cvMessage && <p className="CV-message">{cvMessage}</p>}
            </div>
          </div>
        )}

      </main>

      {/* Apply Modal */}
      {showApplyModal && applyingJob && (
        <ApplyModal
          job={applyingJob}
          cvInfo={cvInfo}
          applying={applying}
          applySuccess={applySuccess}
          onConfirm={handleConfirmApply}
          onClose={handleCloseApplyModal}
          onCvUpload={handleCvUpload}
        />
      )}

    </div>
  )
}

// Job Card Component
function JobCard({ job, applied, onViewDetails }) {
  return (
    <div className="job-card">
      <div className="job-card-body">
        <div className="job-card-top">
          <div>
            <h3 className="job-title">{job.title}</h3>
            <div className="job-tags">
              {job.experience_level && <span className="job-tag">{job.experience_level}</span>}
              {job.work_type && <span className="job-tag">{job.work_type}</span>}
              {job.location && <span className="job-tag">📍 {job.location}</span>}
              {job.salary_range && <span className="job-tag">💰 {job.salary_range}</span>}
            </div>
          </div>
          <span className="job-date">{new Date(job.created_at).toLocaleDateString()}</span>
        </div>
        {job.description && <p className="job-description">{job.description}</p>}
        <div className="job-card-footer">
          <div className="job-skills">
            <span className="skills-label">Required Skills:</span>
            <span className="skills-value">{job.required_skills}</span>
          </div>
          <div className="job-card-actions">
            {applied && <span className="applied-tag">✓ Applied</span>}
            <button className="ghost-btn" onClick={() => onViewDetails(job)}>
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Apply Modal Component
function ApplyModal({ job, cvInfo, applying, applySuccess, onConfirm, onClose, onCvUpload }) {
  const [step, setStep] = useState("choose") // choose | newcv
  const [newCv, setNewCv] = useState(null)

  function handleNewCvUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return

  onCvUpload(e)

  const payload = {
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }
  setNewCv(payload)
}

  return (
    <div className="modal-overlay">
      <div className="modal-box">

        {applySuccess ? (
          <div className="modal-success">
            <p className="modal-success-icon">✅</p>
            <p className="modal-success-text">{applySuccess}</p>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Apply for Job</h2>
              <p className="modal-job-title">{job.title}</p>
            </div>

            {step === "choose" && (
              <>
                <p className="modal-question">
                  Which CV would you like to use for this application?
                </p>

                <div className="modal-CV-options">
                  {/* Current CV */}
                  <div
                    className={`modal-CV-card ${!cvInfo ? "modal-CV-disabled" : ""}`}
                    onClick={() => cvInfo && onConfirm(cvInfo)}
                  >
                    <div className="modal-CV-icon">📄</div>
                    <div>
                      <p className="modal-CV-label">Current CV</p>
                      {cvInfo ? (
                        <p className="modal-CV-name">{cvInfo.name}</p>
                      ) : (
                        <p className="modal-CV-none">No CV uploaded yet</p>
                      )}
                    </div>
                  </div>

                  {/* New CV */}
                  <div
                    className="modal-CV-card"
                    onClick={() => setStep("newcv")}
                  >
                    <div className="modal-CV-icon">➕</div>
                    <div>
                      <p className="modal-CV-label">Upload New CV</p>
                      <p className="modal-CV-name">Choose a different file</p>
                    </div>
                  </div>
                </div>

                <button className="modal-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
              </>
            )}

            {step === "newcv" && (
              <>
                <p className="modal-question">Upload your CV for this application:</p>

                <label className="CV-upload-box modal-upload-box">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleNewCvUpload}
                  />
                  <span>📁 Click to upload CV</span>
                </label>

                {newCv && (
                  <div className="modal-new-CV-preview">
                    <p>✅ {newCv.name}</p>
                    <button
                      className="apply-btn"
                      onClick={() => onConfirm(newCv)}
                      disabled={applying}
                    >
                      {applying ? "Submitting..." : "Submit Application"}
                    </button>
                  </div>
                )}

                <button
                  className="modal-cancel-btn"
                  onClick={() => setStep("choose")}
                >
                  ← Back
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}