import { useEffect, useState } from 'react';
import './ModalOverview.css';
import { api, SERVER_BASE } from '../lib/api';
import ItemCell from './ItemCell';

export default function ModalOverview({ isOpen, onClose, report, onMatch }) {
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/found-items')
      .then(setFoundItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !report?.id) {
      setClaim(null);
      return;
    }
    api.get(`/claims/report/${report.id}`)
      .then(setClaim)
      .catch(() => setClaim(null));
  }, [isOpen, report?.id]);

  const refreshClaim = async () => {
    if (!report?.id) return;
    try {
      const fresh = await api.get(`/claims/report/${report.id}`);
      setClaim(fresh);
    } catch { /* ignore */ }
  };

  const handleApproveClaim = async () => {
    if (!claim || busy) return;
    setBusy(true);
    try {
      await api.patch(`/claims/${claim.id}/approve`, {});
      await refreshClaim();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRejectClaim = async (fraudulent) => {
    if (!claim || busy) return;
    const reason = window.prompt(
      fraudulent
        ? "Reason for rejection (fraudulent — student will be locked out of chat for 14 days):"
        : "Reason for rejection (optional):"
    );
    if (reason === null) return;
    setBusy(true);
    try {
      await api.patch(`/claims/${claim.id}/reject`, { reason, is_fraudulent: fraudulent });
      await refreshClaim();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

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

  const handleResolve = async () => {
    if (!report || busy) return;
    setBusy(true);
    try {
      const updated = await api.patch(`/reports/${report.id}/resolve`, {});
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
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';

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
              {report.ticket_number && (
                <p><span className="ticket-tag">{report.ticket_number}</span></p>
              )}
              <p><strong>{report.item_name}</strong></p>
              <p>{report.category || 'No category'}</p>
              <p>{formatDate(report.created_at)}</p>
              {report.location_lost && <p>{report.location_lost}</p>}
              {report.description && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                  {report.description}
                </p>
              )}
              {report.image_url && (
                <img
                  src={report.image_url}
                  alt={report.item_name}
                  className="report__photo"
                />
              )}
              <span className={statusClass(report.status)} style={{ marginTop: 12, display: 'inline-block' }}>
                {report.status}
              </span>
              {report.status === 'Matched' && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Student already picked up?</p>
                  <button type='button' className="admin-lift-btn" disabled={busy} onClick={handleResolve}>
                    <span className="admin-lift-btn__face">{busy ? 'Saving...' : 'Resolved'}</span>
                  </button>
                </div>
              )}
              {report.student_name && (
                <p style={{ fontSize: 13, marginTop: 12, color: 'var(--muted)' }}>
                  Student: {report.student_name}
                </p>
              )}

              {claim && (
                <div className="claim-panel">
                  <h2>Hawk AI Claim</h2>
                  <p className="claim-panel__subtitle">
                    Submitted {formatDate(claim.created_at)} · Status: <strong>{claim.status}</strong>
                  </p>
                  <ul className="claim-panel__fields">
                    {claim.color && <li><span>Color/material:</span> {claim.color}</li>}
                    {claim.brand && <li><span>Brand:</span> {claim.brand}</li>}
                    {claim.contents && <li><span>Contents:</span> {claim.contents}</li>}
                    {claim.distinguishing_marks && <li><span>Marks:</span> {claim.distinguishing_marks}</li>}
                    {claim.approximate_location && <li><span>Where:</span> {claim.approximate_location}</li>}
                    {claim.approximate_date && <li><span>When:</span> {claim.approximate_date}</li>}
                  </ul>
                  {claim.status === 'Rejected' && claim.rejected_reason && (
                    <p className="claim-panel__rejected">Reason: {claim.rejected_reason}{claim.is_fraudulent && ' (flagged as fraudulent)'}</p>
                  )}
                  {claim.status === 'Pending Review' && (
                    <div className="claim-panel__actions">
                      <button type="button" disabled={busy} onClick={handleApproveClaim}>Approve</button>
                      <button type="button" disabled={busy} onClick={() => handleRejectClaim(false)}>Reject</button>
                      <button type="button" className="claim-panel__danger" disabled={busy} onClick={() => handleRejectClaim(true)}>
                        Reject as Fraudulent
                      </button>
                    </div>
                  )}
                </div>
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
                            ? <img src={item.image_url.startsWith('http') ? item.image_url : `${SERVER_BASE}${item.image_url}`} alt={item.item_name} />
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
            {report.status !== 'Resolved' && (
              <div className="button-container">
                <button type='button' disabled={busy} onClick={handleClearMatch}>
                  {busy ? 'Clearing...' : 'Clear Match'}
                </button>
              </div>
            )}
            {matchedItem && (
              <div className="Item-container">
                <ItemCell
                  image={matchedItem.image_url}
                  item={matchedItem.item_name}
                  category={matchedItem.category}
                  dateSubmitted={matchedItem.date_found}
                  storage={matchedItem.storage_location}
                  location={matchedItem.location_found}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
