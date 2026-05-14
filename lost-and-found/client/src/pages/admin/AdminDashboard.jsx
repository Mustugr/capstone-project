import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import ItemCell from "../../components/ItemCell";
import { api, SERVER_BASE } from "../../lib/api";
import "./AdminDashboard.css";

const CATEGORIES = [
  "Electronic", "Clothing", "Books", "Backpack / Bag",
  "Wallet / Purse", "Keys", "ID Card", "Water Bottle",
  "Accessories", "Jewelry", "Not Specified",
];

const formatDate = (val) => {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
  catch { return val; }
};

export default function AdminDashboard() {
  const [items, setItems]                       = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem]         = useState(null);

  useEffect(() => {
    api.get("/found-items")
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedItem(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItem]);

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : items;

  const detailSrc = selectedItem?.image_url
    ? (selectedItem.image_url.startsWith('http') ? selectedItem.image_url : `${SERVER_BASE}${selectedItem.image_url}`)
    : null;

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-found-items">
        <div className="admin-found-items__header">
          <h1 className="page-title">Found Items</h1>
          <p className="page-subtitle">Browse and filter all items currently in the lost &amp; found</p>
        </div>

        <div className="category-filters">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`category-filters__btn${selectedCategory === cat ? " active" : ""}`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        ) : filteredItems.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No items found.</p>
        ) : (
          <div className="Items_container">
            {filteredItems.map((item) => (
              <ItemCell
                key={item.id}
                image={item.image_url}
                item={item.item_name}
                category={item.category}
                dateSubmitted={item.date_found}
                storage={item.storage_location}
                location={item.location_found}
                onImageClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}

        {selectedItem && (
          <div className="item-detail-overlay" onClick={() => setSelectedItem(null)}>
            <div className="item-detail-modal" onClick={(e) => e.stopPropagation()}>
              <button className="item-detail-modal__close" onClick={() => setSelectedItem(null)} aria-label="Close">✕</button>

              <div className="item-detail-modal__image">
                {detailSrc ? (
                  <img src={detailSrc} alt={selectedItem.item_name} />
                ) : (
                  <div className="item-detail-modal__no-image">No Photo</div>
                )}
              </div>

              <div className="item-detail-modal__body">
                <h2 className="item-detail-modal__title">{selectedItem.item_name}</h2>
                <span className={`status-badge status-${(selectedItem.status || '').toLowerCase()}`}>
                  {selectedItem.status}
                </span>

                <dl className="item-detail-modal__fields">
                  <div><dt>Category</dt><dd>{selectedItem.category || '—'}</dd></div>
                  <div><dt>Date Found</dt><dd>{formatDate(selectedItem.date_found)}</dd></div>
                  <div><dt>Location Found</dt><dd>{selectedItem.location_found || '—'}</dd></div>
                  <div><dt>Storage</dt><dd>{selectedItem.storage_location || '—'}</dd></div>
                  <div><dt>Logged On</dt><dd>{formatDate(selectedItem.created_at)}</dd></div>
                </dl>

                <div className="item-detail-modal__description">
                  <h3>Description</h3>
                  <p>{selectedItem.description || <em>No description provided.</em>}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
