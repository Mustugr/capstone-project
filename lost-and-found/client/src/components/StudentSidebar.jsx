import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./StudentSidebar.css";

export default function StudentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const links = [
    { label: "Dashboard", path: "/student-dashboard" },
    { label: "Submit Lost Item", path: "/student-report-item" },
    { label: "My Reports", path: "/student-reports" },
    { label: "Messages", path: "/student-messages" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="student-sidebar">
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
                className={`student-sidebar__link ${isActive ? "student-sidebar__link--active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <button onClick={handleLogout} className="student-sidebar__logout">
        Logout
      </button>
    </aside>
  );
}
