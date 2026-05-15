import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./RegisterPage.css";

function checkPassword(pw) {
  return {
    minLength:  pw.length >= 8,
    uppercase:  /[A-Z]/.test(pw),
    digit:      /\d/.test(pw),
    special:    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  };
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [touched, setTouched]   = useState({ password: false, confirmPassword: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleBlur   = (e) => setTouched((prev) => ({ ...prev, [e.target.name]: true }));

  const checks   = checkPassword(formData.password);
  const allValid = checks.minLength && checks.uppercase && checks.digit && checks.special;
  const matches  = formData.password === formData.confirmPassword && formData.confirmPassword !== "";

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields."); return;
    }
    if (!allValid) {
      setError("Password does not meet all requirements."); return;
    }
    if (!matches) {
      setError("Passwords do not match."); return;
    }
    setError("");
    setLoading(true);
    try {
      await register(formData.fullName, formData.email, formData.password);
      navigate("/student-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header-bar">
        <div className="auth-header-inner">
          <Link to="/" className="auth-brand">Lost &amp; Found Portal</Link>

          <nav className="auth-nav">
            <Link to="/" className="auth-nav-link">Home</Link>
            <Link to="/about" className="auth-nav-link">About</Link>
            <Link to="/contact" className="auth-nav-link">Contact</Link>
            <Link to="/privacy" className="auth-nav-link">Privacy</Link>
          </nav>

          <Link to="/login" className="auth-lift-btn">
            <span className="auth-lift-btn__face">Sign In</span>
          </Link>
        </div>
      </header>

      <main className="register-main">
        <div className="register-card">
          <span className="auth-eyebrow">New Account</span>
          <h1 className="register-title">Create Account</h1>

          <form onSubmit={handleRegister} className="register-form">
            {error && <p className="auth-error">{error}</p>}
            <div>
              <label className="auth-label">Full Name</label>
              <input
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                className="auth-input"
              />
            </div>

            <div>
              <label className="auth-label">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="auth-input"
              />
            </div>

            <div>
              <label className="auth-label">Password</label>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {(touched.password || formData.password) && (
                <ul className="pw-checklist">
                  <li className={checks.minLength ? "pw-check pw-check--ok" : "pw-check pw-check--fail"}>
                    {checks.minLength ? "✓" : "✗"} At least 8 characters
                  </li>
                  <li className={checks.uppercase ? "pw-check pw-check--ok" : "pw-check pw-check--fail"}>
                    {checks.uppercase ? "✓" : "✗"} At least one uppercase letter
                  </li>
                  <li className={checks.digit ? "pw-check pw-check--ok" : "pw-check pw-check--fail"}>
                    {checks.digit ? "✓" : "✗"} At least one number
                  </li>
                  <li className={checks.special ? "pw-check pw-check--ok" : "pw-check pw-check--fail"}>
                    {checks.special ? "✓" : "✗"} At least one special character
                  </li>
                </ul>
              )}
            </div>

            <div>
              <label className="auth-label">Confirm Password</label>
              <div className="auth-password-wrap">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`auth-input${touched.confirmPassword && formData.confirmPassword ? (matches ? " auth-input--ok" : " auth-input--err") : ""}`}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {touched.confirmPassword && formData.confirmPassword && (
                <p className={matches ? "pw-check pw-check--ok" : "pw-check pw-check--fail"} style={{ marginTop: 6 }}>
                  {matches ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="auth-lift-btn auth-lift-btn--full">
              <span className="auth-lift-btn__face">{loading ? "Creating account..." : "Create Account"}</span>
            </button>

            <p className="auth-small-text">
              Already have an account?{" "}
              <Link to="/login" className="auth-text-link">
                Sign In <span aria-hidden="true">→</span>
              </Link>
            </p>
          </form>
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
        <span>© 2026 Lost &amp; Found</span>
      </footer>
    </div>
  );
}
