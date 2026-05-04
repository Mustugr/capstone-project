import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../../components/StudentSidebar";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports")
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusClass = (status) => {
    if (status === "Pending")  return "status-badge status-pending";
    if (status === "Matched")  return "status-badge status-matched";
    return "status-badge status-resolved";
  };

  const count = (status) => reports.filter((r) => r.status === status).length;

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="student-layout">
      <StudentSidebar />

      <main className="student-dashboard">
        <div className="student-dashboard__header">
          <span className="student-eyebrow">Overview</span>
          <h1 className="student-page-title">Welcome, {user?.full_name?.split(" ")[0] ?? "Student"}</h1>
          <p className="student-page-subtitle">Track your lost item requests and updates.</p>
        </div>

        <div className="student-dashboard__stats">
          <div className="student-card student-dashboard__stat">
            <span className="student-eyebrow">Pending</span>
            <div className="student-dashboard__stat-value">{count("Pending")}</div>
          </div>
          <div className="student-card student-dashboard__stat">
            <span className="student-eyebrow">Matched</span>
            <div className="student-dashboard__stat-value">{count("Matched")}</div>
          </div>
          <div className="student-card student-dashboard__stat">
            <span className="student-eyebrow">Resolved</span>
            <div className="student-dashboard__stat-value">{count("Resolved")}</div>
          </div>
        </div>

        <div className="student-card student-dashboard__table">
          <div className="student-dashboard__table-header">
            <span className="student-eyebrow">Activity</span>
            <h2 className="student-section-title">Recent Reports</h2>
          </div>

          {loading ? (
            <p style={{ padding: "24px", color: "var(--muted)" }}>Loading...</p>
          ) : (
            <table className="student-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: "24px", color: "var(--muted)", textAlign: "center" }}>No reports yet. <button className="auth-text-link" onClick={() => navigate("/student-report-item")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--primary)",fontWeight:700}}>Submit one →</button></td></tr>
                ) : (
                  reports.slice(0, 5).map((report) => (
                    <tr key={report.id}>
                      <td>{report.item_name}</td>
                      <td>{formatDate(report.created_at)}</td>
                      <td><span className={statusClass(report.status)}>{report.status}</span></td>
                      <td>
                        <button className="student-lift-btn" onClick={() => navigate("/student-reports")}>
                          <span className="student-lift-btn__face">View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
