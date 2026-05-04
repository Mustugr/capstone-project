import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./RegisterPage.css";

function checkPassword(pw) {
  return {
    minLength:  pw.length >= 8,
    uppercase:  /[A-Z]/.test(pw),
    special:    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [touched, setTouched]   = useState({ password: false, confirmPassword: false });

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleBlur   = (e) => setTouched((prev) => ({ ...prev, [e.target.name]: true }));

  const checks   = checkPassword(formData.password);
  const allValid = checks.minLength && checks.uppercase && checks.special;
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
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className="auth-input"
              />
              {(touched.password || formData.password) && (
                <ul className="pw-checklist">
                  <li className={checks.minLength ? "pw-check pw-check--ok" : "pw-check pw-check--fail"}>
                    {checks.minLength ? "✓" : "✗"} At least 8 characters
                  </li>
                  <li className={checks.uppercase ? "pw-check pw-check--ok" : "pw-check pw-check--fail"}>
                    {checks.uppercase ? "✓" : "✗"} At least one uppercase letter
                  </li>
                  <li className={checks.special ? "pw-check pw-check--ok" : "pw-check pw-check--fail"}>
                    {checks.special ? "✓" : "✗"} At least one special character
                  </li>
                </ul>
              )}
            </div>

            <div>
              <label className="auth-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`auth-input${touched.confirmPassword && formData.confirmPassword ? (matches ? " auth-input--ok" : " auth-input--err") : ""}`}
              />
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
