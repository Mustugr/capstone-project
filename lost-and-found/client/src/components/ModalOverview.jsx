import { useEffect, useState } from 'react';
import './ModalOverview.css';
import { api } from '../lib/api';
import ItemCell from './ItemCell';

export default function ModalOverview({ isOpen, onClose, report, onMatch }) {
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/found-items')
      .then(setFoundItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen]);

  const matchedItem = foundItems.find(i => i.id === report?.matched_item_id);

  const handleMatch = async (item) => {
    if (!report || busy) return;
    setBusy(true);
    try {
      const updated = await api.patch(`/reports/${report.id}/match`, { found_item_id: item.id });
      onMatch(updated);
      const items = await api.get('/found-items');
      setFoundItems(items);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClearMatch = async () => {
    if (!report || busy) return;
    setBusy(true);
    try {
      const updated = await api.patch(`/reports/${report.id}/unmatch`, {});
      onMatch(updated);
      const items = await api.get('/found-items');
      setFoundItems(items);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const statusClass = (status) => {
    if (status === 'Pending') return 'status-badge status-pending';
    if (status === 'Matched') return 'status-badge status-matched';
    return 'status-badge status-resolved';
  };

  const unclaimed = foundItems.filter(i => i.status === 'Unclaimed');

  return (
    <div className={`modal ${isOpen ? 'active' : ''}`}>
      <button className="modal-close" onClick={onClose}>✕</button>

      <h1>Report Details</h1>

      <div className='innerModal'>
        <div className='report'>
          {report && (
            <>
              <h2>Item Details</h2>
              <p><strong>{report.item_name}</strong></p>
              <p>{report.category || 'No category'}</p>
              <p>{formatDate(report.created_at)}</p>
              {report.location_lost && <p>{report.location_lost}</p>}
              {report.description && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                  {report.description}
                </p>
              )}
              <span className={statusClass(report.status)} style={{ marginTop: 12, display: 'inline-block' }}>
                {report.status}
              </span>
              {report.student_name && (
                <p style={{ fontSize: 13, marginTop: 12, color: 'var(--muted)' }}>
                  Student: {report.student_name}
                </p>
              )}
            </>
          )}
        </div>

        {!report?.matched_item_id ? (
          <div className='match'>
            <div className="list_container">
              <h2>Search Available Items</h2>
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>Loading items...</p>
              ) : unclaimed.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>
                  No unclaimed items available.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Date Found</th>
                      <th>Storage</th>
                      <th>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unclaimed.map((item) => (
                      <tr className='item-set' key={item.id}>
                        <td>
                          {item.image_url
                            ? <img src={`http://localhost:4000${item.image_url}`} alt={item.item_name} />
                            : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                          }
                        </td>
                        <td>{item.item_name}</td>
                        <td>{item.category || '—'}</td>
                        <td>{formatDate(item.date_found)}</td>
                        <td>{item.storage_location || '—'}</td>
                        <td>
                          <button type='button' disabled={busy} onClick={() => handleMatch(item)}>
                            {busy ? '...' : 'Match'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className='MatchedItem'>
            <div className="button-container">
              <button type='button' disabled={busy} onClick={handleClearMatch}>
                {busy ? 'Clearing...' : 'Clear Match'}
              </button>
            </div>
            {matchedItem && (
              <div className="Item-container">
                <ItemCell
                  image={matchedItem.image_url}
                  item={matchedItem.item_name}
                  category={matchedItem.category}
                  dateSubmitted={matchedItem.date_found}
                  storage={matchedItem.storage_location}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
