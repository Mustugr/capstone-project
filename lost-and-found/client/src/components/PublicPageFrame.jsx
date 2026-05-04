import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../pages/public/HomePage.css";

export default function PublicPageFrame({ active = "home", children }) {
  const [showToTop, setShowToTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const labels = Array.from(
      document.querySelectorAll(".public-page-shell .home-highlight-label")
    );

    if (!labels.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.35,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    labels.forEach((label, index) => {
      observer.observe(label);

      if (index === 0) {
        requestAnimationFrame(() => {
          label.classList.add("is-revealed");
        });
      }
    });

    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    const handleScroll = () => {
      setShowToTop(window.scrollY > 320);
    };

    const handleResize = () => {
      if (window.innerWidth > 760) {
        setMobileMenuOpen(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [active]);

  return (
    <div className="home-page public-page-shell">
      <header className="home-header">
        <div className="home-header__inner">
          <Link to="/" className="home-brand" onClick={() => setMobileMenuOpen(false)}>
            Lost &amp; Found Portal
          </Link>

          <button
            type="button"
            className={`home-header__menu-button${
              mobileMenuOpen ? " is-open" : ""
            }`}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-nav"
            aria-label="Toggle navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav
            id="public-mobile-nav"
            className={`home-header__nav${mobileMenuOpen ? " is-open" : ""}`}
            aria-label="Public site navigation"
          >
            <Link
              to="/"
              className={`home-header__link${
                active === "home" ? " home-header__link--active" : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/about"
              className={`home-header__link${
                active === "about" ? " home-header__link--active" : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/contact"
              className={`home-header__link${
                active === "contact" ? " home-header__link--active" : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <Link
              to="/privacy"
              className={`home-header__link${
                active === "privacy" ? " home-header__link--active" : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Privacy
            </Link>

            <div className="home-header__actions">
              <Link
                to="/login"
                className="home-header__button home-header__button--ghost"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="home-header__button-face">Sign In</span>
              </Link>
              <Link
                to="/register"
                className="home-header__button home-header__button--filled"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="home-header__button-face">Create Account</span>
              </Link>
            </div>
          </nav>

          <div className="home-header__actions home-header__actions--desktop">
            <Link to="/login" className="home-header__button home-header__button--ghost">
              <span className="home-header__button-face">Sign In</span>
            </Link>
            <Link
              to="/register"
              className="home-header__button home-header__button--filled"
            >
              <span className="home-header__button-face">Create Account</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="home-main">{children}</main>

      <footer className="site-footer home-site-footer">
        <div className="home-site-footer__inner">
          <div className="site-footer-links">
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
          <span>© 2026 Lost &amp; Found</span>
        </div>
        <p className="site-footer-disclaimer">
          This is a student capstone project and is not affiliated with,
          endorsed by, or sponsored by Hunter College or The City University
          of New York.
        </p>
      </footer>

      <button
        type="button"
        className={`home-to-top${showToTop ? " is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
      >
        <span className="home-to-top__arrow" aria-hidden="true">
          ↑
        </span>
        <span className="home-to-top__label">To Top</span>
      </button>
    </div>
  );
}
