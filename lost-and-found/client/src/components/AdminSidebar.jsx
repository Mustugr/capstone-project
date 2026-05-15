import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import "./AdminSidebar.css";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { unreadTotal, pendingReports } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { label: "Dashboard", path: "/admin-dashboard" },
    { label: "Messages", path: "/admin-message", badge: unreadTotal },
    { label: "Add item", path: "/admin-add" },
    { label: "Overview", path: "/admin-overview", badge: pendingReports },
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
          className="admin-sidebar__hamburger"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      {isOpen && <div className="admin-sidebar__backdrop" onClick={close} />}

      <aside className={`admin-sidebar${isOpen ? " admin-sidebar--open" : ""}`}>
        <div>
          <div className="admin-sidebar__brand-wrapper">
            <span className="admin-sidebar__text">Lost &amp; Found Portal</span>
          </div>

          <nav className="admin-sidebar__nav">
            {links.map((link) => {
              const isActive = location.pathname === link.path;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={close}
                  className={`admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`}
                >
                  <span>{link.label}</span>
                  {link.badge ? (
                    <span className="admin-sidebar__badge">{link.badge > 99 ? "99+" : link.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} className="admin-sidebar__logout">
          Logout
        </button>
      </aside>
    </>
  );
}
