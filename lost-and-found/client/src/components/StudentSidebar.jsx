import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import "./StudentSidebar.css";

export default function StudentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { unreadTotal } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { label: "Dashboard", path: "/student-dashboard" },
    { label: "Submit Lost Item", path: "/student-report-item" },
    { label: "My Reports", path: "/student-reports" },
    { label: "Messages", path: "/student-messages", badge: unreadTotal },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const close = () => setIsOpen(false);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="student-sidebar__hamburger"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      {isOpen && <div className="student-sidebar__backdrop" onClick={close} />}

      <aside className={`student-sidebar${isOpen ? " student-sidebar--open" : ""}`}>
        <div>
          <div className="student-sidebar__brand">
            <span className="student-sidebar__brand-text">Lost &amp; Found Portal</span>
          </div>

          <nav className="student-sidebar__nav">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={close}
                  className={`student-sidebar__link ${isActive ? "student-sidebar__link--active" : ""}`}
                >
                  <span>{link.label}</span>
                  {link.badge ? (
                    <span className="student-sidebar__badge">{link.badge > 99 ? "99+" : link.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} className="student-sidebar__logout">
          Logout
        </button>
      </aside>
    </>
  );
}
