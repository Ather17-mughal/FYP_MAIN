import "./ProfilePromptModal.css"

export default function ProfilePromptModal({ onFillNow, onFillLater }) {
  return (
    <div className="profile-overlay" role="dialog" aria-modal="true" aria-label="Profile setup prompt">
      <div className="profile-prompt-card">
        <p className="eyebrow">Welcome</p>
        <h2>Would you like to complete your profile now?</h2>
        <p className="subtle">You can fill out your information now or continue and complete it later.</p>

        <div className="prompt-actions">
          <button className="ghost-btn" onClick={onFillLater}>Fill later</button>
          <button className="primary-btn" onClick={onFillNow}>Fill now</button>
        </div>
      </div>
    </div>
  )
}
