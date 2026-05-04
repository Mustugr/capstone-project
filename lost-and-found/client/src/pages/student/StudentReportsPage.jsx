import { useEffect, useMemo, useState } from "react";
import StudentSidebar from "../../components/StudentSidebar";
import { api } from "../../lib/api";
import "./StudentReportsPage.css";

export default function StudentReportsPage() {
  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm]     = useState("");
  const [selected, setSelected]         = useState(null);

  useEffect(() => {
    api.get("/reports")
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesFilter = activeFilter === "All" || r.status === activeFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        r.item_name.toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [reports, activeFilter, searchTerm]);

  const statusClass = (status) => {
    if (status === "Pending") return "status-badge status-pending";
    if (status === "Matched") return "status-badge status-matched";
    return "status-badge status-resolved";
  };

  return (
    <>
      <div className="student-layout">
        <StudentSidebar />

        <main className="student-reports">
          <div className="student-reports__header">
            <span className="student-eyebrow">Submissions</span>
            <h1 className="student-page-title">My Reports</h1>
            <p className="student-page-subtitle">Review the status of your lost item submissions.</p>
          </div>

          <div className="student-reports__topbar">
            <div className="student-reports__filters">
              {["All", "Pending", "Matched", "Resolved"].map((filter) => (
                <button key={filter} onClick={() => setActiveFilter(filter)}
                  className={`student-reports__filter-btn${activeFilter === filter ? " active" : ""}`}>
                  {filter}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Search reports..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="student-input student-reports__search" />
          </div>

          <div className="student-card student-reports__table">
            {loading ? (
              <p style={{ padding: "24px", color: "var(--muted)" }}>Loading...</p>
            ) : (
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
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
                          <button className="student-lift-btn" onClick={() => setSelected(report)}>
                            <span className="student-lift-btn__face">View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="student-reports__empty" colSpan="5">No reports found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Report detail modal */}
      {selected && (
        <div className={`sr-modal-overlay active`} onClick={() => setSelected(null)}>
          <div className="sr-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sr-modal__close" onClick={() => setSelected(null)}>✕</button>
            <span className="sr-modal__heading">Report Details</span>
            <div className="sr-modal__panel">
              <h2 className="sr-modal__item-name">{selected.item_name}</h2>
              <span className={statusClass(selected.status)} style={{ marginBottom: 16, display: "inline-block" }}>
                {selected.status}
              </span>

              <table className="sr-modal__table">
                <tbody>
                  {[
                    ["Category",      selected.category],
                    ["Location Lost", selected.location_lost],
                    ["Date Lost",     selected.date_lost ? formatDate(selected.date_lost) : null],
                    ["Date Submitted",formatDate(selected.created_at)],
                    ["Description",   selected.description],
                  ].map(([label, value]) => value ? (
                    <tr key={label}>
                      <td className="sr-modal__label">{label}</td>
                      <td className="sr-modal__value">{value}</td>
                    </tr>
                  ) : null)}
                </tbody>
              </table>

              {selected.status === "Matched" && (
                <div className="sr-modal__matched-note">
                  Your item has been matched! Check the Messages tab to coordinate pickup with the admin.
                </div>
              )}

              {selected.status === "Resolved" && (
                <div className="sr-modal__resolved-note">
                  This report has been resolved. We hope you got your item back!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
