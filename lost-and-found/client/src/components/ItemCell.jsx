import './ItemCell.css';
import { SERVER_BASE } from '../lib/api';

export default function ItemCell({ image, item, category, dateSubmitted, storage, location, onImageClick }) {
  const src = image
    ? image.startsWith('http') ? image : `${SERVER_BASE}${image}`
    : null;

  const formatDate = (val) => {
    if (!val) return '—';
    try { return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
    catch { return val; }
  };

  return (
    <div className="cellContainer">
      <div
        className={`img_container${onImageClick ? ' img_container--clickable' : ''}`}
        onClick={onImageClick}
        role={onImageClick ? 'button' : undefined}
        tabIndex={onImageClick ? 0 : undefined}
      >
        {src ? (
          <img src={src} alt={item} />
        ) : (
          <div className="img_placeholder">No Photo</div>
        )}
      </div>
      <div className="details">
        <p className="details__name">{item}</p>
        <p><b>Category:</b> {category || '—'}</p>
        <p><b>Date Found:</b> {formatDate(dateSubmitted)}</p>
        <p><b>Location Found:</b> {location || '—'}</p>
        <p><b>Storage:</b> {storage || '—'}</p>
      </div>
    </div>
  );
}
