import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../../components/StudentSidebar";
import { api } from "../../lib/api";
import "./StudentLostItemForm.css";

const CATEGORIES = [
  "Electronic", "Clothing", "Books", "Backpack / Bag",
  "Wallet / Purse", "Keys", "ID Card", "Water Bottle",
  "Accessories", "Jewelry", "Not Specified",
];

export default function StudentLostItemForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    itemName: "", category: "", locationLost: "",
    dateLost: "", description: "",
  });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [created, setCreated]   = useState(null);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName) { setError("Item name is required"); return; }
    setError("");
    setLoading(true);
    try {
      const report = await api.post("/reports", {
        item_name:     formData.itemName,
        category:      formData.category,
        location_lost: formData.locationLost,
        date_lost:     formData.dateLost || null,
        description:   formData.description,
      });
      setCreated(report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-layout">
      <StudentSidebar />

      <main className="student-form-page">
        <div className="student-card student-form-page__card">
          {created ? (
            <div className="student-form-page__success">
              <span className="student-eyebrow">Report Submitted</span>
              <h1 className="student-form-page__title">You're all set</h1>
              <p className="student-form-page__subtitle">
                Save your ticket number — admins will reference it when they contact you.
              </p>
              <div className="student-form-page__ticket">
                <span className="student-eyebrow">Your Ticket</span>
                <div className="ticket-tag ticket-tag--lg">{created.ticket_number}</div>
              </div>
              <p style={{ marginTop: 16, color: "var(--muted)", fontSize: 14 }}>
                Item: <strong>{created.item_name}</strong>
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                <button type="button" className="student-lift-btn" onClick={() => navigate("/student-reports")}>
                  <span className="student-lift-btn__face">View My Reports</span>
                </button>
                <button type="button" className="student-lift-btn student-lift-btn--ghost" onClick={() => {
                  setCreated(null);
                  setFormData({ itemName: "", category: "", locationLost: "", dateLost: "", description: "" });
                }}>
                  <span className="student-lift-btn__face">Submit Another</span>
                </button>
              </div>
            </div>
          ) : (
          <>
          <span className="student-eyebrow">New Submission</span>
          <h1 className="student-form-page__title">Lost Item Form</h1>
          <p className="student-form-page__subtitle">
            Submit the details of your lost item so the admin team can review it.
          </p>

          <form onSubmit={handleSubmit} className="student-form-page__form">
            {error && <p className="auth-error">{error}</p>}

            <div>
              <label className="student-label">Item Name *</label>
              <input name="itemName" value={formData.itemName} onChange={handleChange}
                className="student-input" placeholder="Ex: Black backpack" />
            </div>

            <div>
              <label className="student-label">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="student-select">
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="student-label">Location Lost</label>
              <input name="locationLost" value={formData.locationLost} onChange={handleChange}
                className="student-input" placeholder="Ex: Hunter North, Library, Cafeteria" />
            </div>

            <div>
              <label className="student-label">Date Lost</label>
              <input type="date" name="dateLost" value={formData.dateLost} onChange={handleChange}
                className="student-input" />
            </div>

            <div>
              <label className="student-label">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                className="student-textarea" placeholder="Describe color, brand, size, or unique details..." />
            </div>

            <button type="submit" disabled={loading} className="student-lift-btn student-lift-btn--full">
              <span className="student-lift-btn__face">{loading ? "Submitting..." : "Submit Report"}</span>
            </button>
          </form>
          </>
          )}
        </div>
      </main>
    </div>
  );
}
