import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import ItemCell from "../../components/ItemCell";
import { api } from "../../lib/api";
import "./AdminDashboard.css";

const CATEGORIES = [
  "Electronic", "Clothing", "Books", "Backpack / Bag",
  "Wallet / Purse", "Keys", "ID Card", "Water Bottle",
  "Accessories", "Jewelry", "Not Specified",
];

export default function AdminDashboard() {
  const [items, setItems]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    api.get("/found-items")
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : items;

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
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
