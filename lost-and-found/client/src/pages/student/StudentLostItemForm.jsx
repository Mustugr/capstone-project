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
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName) { setError("Item name is required"); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/reports", {
        item_name:     formData.itemName,
        category:      formData.category,
        location_lost: formData.locationLost,
        date_lost:     formData.dateLost || null,
        description:   formData.description,
      });
      navigate("/student-reports");
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
        </div>
      </main>
    </div>
  );
}
