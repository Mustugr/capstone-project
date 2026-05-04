import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import "./AdminOverview.css";
import ModalOverview from "../../components/ModalOverview";
import { api } from "../../lib/api";

export default function AdminOverview() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [Visibility, setVisibility] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/reports")
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateReport = (updatedReport) => {
    setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    setSelectedReport(updatedReport);
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesFilter = activeFilter === "All" ? true : report.status === activeFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        report.item_name.toLowerCase().includes(q) ||
        (report.category || "").toLowerCase().includes(q) ||
        report.status.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchTerm, reports]);

  const statusClass = (status) => {
    if (status === "Pending") return "status-badge status-pending";
    if (status === "Matched") return "status-badge status-matched";
    return "status-badge status-resolved";
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <>
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-reports">
          <div className="admin-reports__header">
            <h1 className="page-title">Overview</h1>
            <p className="page-subtitle">Review the status of submissions</p>
          </div>

          <div className="admin-reports__topbar">
            <div className="admin-reports__filters">
              {["All", "Pending", "Matched", "Resolved"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`admin-reports__filter-btn ${activeFilter === filter ? "active" : ""}`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-reports__search"
            />
          </div>

          <div className="admin-reports__table card-surface">
            {loading ? (
              <p style={{ padding: "28px", color: "var(--muted)", fontSize: 14 }}>Loading reports...</p>
            ) : (
              <table className="section-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.item_name}</td>
                        <td>{report.category || "—"}</td>
                        <td>{formatDate(report.created_at)}</td>
                        <td><span className={statusClass(report.status)}>{report.status}</span></td>
                        <td>
                          <button
                            className="admin-lift-btn admin-lift-btn--ghost"
                            onClick={() => navigate(`/admin-message?reportId=${report.id}`)}
                          >
                            <span className="admin-lift-btn__face">Chat</span>
                          </button>
                        </td>
                        <td>
                          <button
                            className="admin-lift-btn"
                            onClick={() => {
                              setSelectedReport(report);
                              setVisibility(true);
                            }}
                          >
                            <span className="admin-lift-btn__face">View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="admin-reports__empty" colSpan="6">No reports found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      <ModalOverview
        isOpen={Visibility}
        onClose={() => setVisibility(false)}
        report={selectedReport}
        onMatch={handleUpdateReport}
      />
    </>
  );
}
