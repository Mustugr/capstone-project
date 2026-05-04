import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import { api } from "../../lib/api";
import "./AdminAddItemPage.css";
import ModalOverview  from "../../components/ModalOverview";

const CATEGORIES = [
  "Electronic", "Clothing", "Books", "Backpack / Bag",
  "Wallet / Purse", "Keys", "ID Card", "Water Bottle",
  "Accessories", "Jewelry", "Not Specified",
];

export default function AdminAddItemPage() {
  const navigate  = useNavigate();
  const fileRef   = useRef(null);

  const [formData, setFormData] = useState({
    itemName: "", category: "", locationFound: "",
    dateFound: "", description: "", storageLocation: "",
  });
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName) { setError("Item name is required"); return; }
    setError("");
    setLoading(true);
    try {
      const data = new FormData();
      data.append("item_name",        formData.itemName);
      data.append("category",         formData.category);
      data.append("location_found",   formData.locationFound);
      data.append("date_found",       formData.dateFound);
      data.append("description",      formData.description);
      data.append("storage_location", formData.storageLocation);
      if (imageFile) data.append("image", imageFile);

      await api.postForm("/found-items", data);
      navigate("/admin-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-form-page">
        <div className="admin-form-page__card card-surface">
          <h1 className="admin-form-page__title">New Item Form</h1>
          <p className="admin-form-page__subtitle">Submit the details of the found item</p>

          <form onSubmit={handleSubmit} className="admin-form-page__form">
            {error && <p className="auth-error">{error}</p>}

            <div>
              <label className="admin-form-page__label">Item Name *</label>
              <input name="itemName" value={formData.itemName} onChange={handleChange}
                className="text-input" placeholder="Ex: Black backpack" />
            </div>

            <div>
              <label className="admin-form-page__label">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="select-input">
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="admin-form-page__label">Location Found</label>
              <input name="locationFound" value={formData.locationFound} onChange={handleChange}
                className="text-input" placeholder="Ex: Hunter North, Library, Cafeteria" />
            </div>

            <div>
              <label className="admin-form-page__label">Date Found</label>
              <input type="date" name="dateFound" value={formData.dateFound} onChange={handleChange}
                className="text-input" />
            </div>

            <div>
              <label className="admin-form-page__label">Storage Location</label>
              <input name="storageLocation" value={formData.storageLocation} onChange={handleChange}
                className="text-input" placeholder="Ex: Room 100, Shelf 2" />
            </div>

            <div>
              <label className="admin-form-page__label">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                className="text-area" placeholder="Describe color, brand, size, or unique details..." />
            </div>

            {/* Image upload */}
            <div>
              <label className="admin-form-page__label">Item Photo</label>
              <div className="admin-form-page__upload-area" onClick={() => fileRef.current.click()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="admin-form-page__preview" />
                ) : (
                  <div className="admin-form-page__upload-placeholder">
                  <svg className="admin-form-page__upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span>Click to upload a photo</span>
                  <span className="admin-form-page__upload-hint">JPG, PNG, WEBP — max 5 MB</span>
                </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange}
                style={{ display: "none" }} />
              {imageFile && (
                <button type="button" className="admin-form-page__remove-img"
                  onClick={() => { setImageFile(null); setImagePreview(null); fileRef.current.value = ""; }}>
                  Remove photo
                </button>
              )}
            </div>

            <button type="submit" disabled={loading} className="admin-lift-btn admin-lift-btn--full admin-form-page__submit">
              <span className="admin-lift-btn__face">{loading ? "Submitting..." : "Submit Item"}</span>
            </button>
          </form>
        </div>
      </main>
      <ModalOverview/ >
    </div>
  );
}
