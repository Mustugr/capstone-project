import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./LoginPage.css";

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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password"); return; }
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin-dashboard" : "/student-dashboard");
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

          <Link to="/register" className="auth-lift-btn">
            <span className="auth-lift-btn__face">Create Account</span>
          </Link>
        </div>
      </header>

      <main className="login-main">
        <div className="login-card">
          <span className="auth-eyebrow">Portal</span>
          <h1 className="login-title">Sign In</h1>

          <form onSubmit={handleLogin} className="login-form">
            {error && <p className="auth-error">{error}</p>}
            <div>
              <label className="auth-label">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>

            <div>
              <label className="auth-label">Password</label>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <button type="submit" disabled={loading} className="auth-lift-btn auth-lift-btn--full">
              <span className="auth-lift-btn__face">{loading ? "Signing in..." : "Sign In"}</span>
            </button>

            <p className="auth-small-text">Forgot your password?</p>
            <p className="auth-small-text">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="auth-text-link">
                Register <span aria-hidden="true">→</span>
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
