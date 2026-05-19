import { useState, useRef } from "react";
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
  const fileRef  = useRef(null);
  const [formData, setFormData] = useState({
    itemName: "", category: "", locationLost: "",
    dateLost: "", description: "",
  });
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [created, setCreated]           = useState(null);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const acceptImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WEBP)");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (e) => acceptImageFile(e.target.files[0]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    acceptImageFile(e.dataTransfer.files?.[0]);
  };

  const resetForm = () => {
    setCreated(null);
    setFormData({ itemName: "", category: "", locationLost: "", dateLost: "", description: "" });
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName) { setError("Item name is required"); return; }
    setError("");
    setLoading(true);
    try {
      const data = new FormData();
      data.append("item_name",     formData.itemName);
      data.append("category",      formData.category);
      data.append("location_lost", formData.locationLost);
      data.append("date_lost",     formData.dateLost);
      data.append("description",   formData.description);
      if (imageFile) data.append("image", imageFile);

      const report = await api.postForm("/reports", data);
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
                <button type="button" className="student-lift-btn student-lift-btn--ghost" onClick={resetForm}>
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

            <div>
              <label className="student-label">Item Photo (optional)</label>
              <div
                className={`student-form-page__upload-area${isDragging ? " student-form-page__upload-area--dragging" : ""}`}
                onClick={() => fileRef.current.click()}
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="student-form-page__preview" />
                ) : (
                  <div className="student-form-page__upload-placeholder">
                    <svg className="student-form-page__upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span>{isDragging ? "Drop the photo here" : "Click or drag a photo here"}</span>
                    <span className="student-form-page__upload-hint">JPG, PNG, WEBP — max 5 MB</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange}
                style={{ display: "none" }} />
              {imageFile && (
                <button type="button" className="student-form-page__remove-img"
                  onClick={() => { setImageFile(null); setImagePreview(null); fileRef.current.value = ""; }}>
                  Remove photo
                </button>
              )}
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
