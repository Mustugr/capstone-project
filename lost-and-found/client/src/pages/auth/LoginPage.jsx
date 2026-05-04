import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
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
