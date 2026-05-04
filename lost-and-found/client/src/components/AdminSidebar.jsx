  import { Link, useLocation, useNavigate } from "react-router-dom";
  import { useAuth } from "../context/AuthContext";
  import "./AdminSidebar.css";

  export default function AdminSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const links = [
      { label: "Dashboard", path: "/admin-dashboard" },
      { label: "Messages", path: "/admin-message" },
      { label: "Add item", path: "/admin-add" },
      { label: "Overview", path: "/admin-overview" },
    
    ];

    const handleLogout = () => {
      logout();
      navigate("/login");
    };

    return (
      <aside className="admin-sidebar">
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
                  className={`admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} className="admin-sidebar__logout">
          Logout
        </button>
      </aside>
    );
  }