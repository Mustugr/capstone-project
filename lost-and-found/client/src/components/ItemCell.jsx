import './ItemCell.css';

const SERVER = 'http://localhost:4000';

export default function ItemCell({ image, item, category, dateSubmitted, storage }) {
  const src = image
    ? image.startsWith('http') ? image : `${SERVER}${image}`
    : null;

  const formatDate = (val) => {
    if (!val) return '—';
    try { return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return val; }
  };

  return (
    <div className="cellContainer">
      <div className="img_container">
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
        <p><b>Storage:</b> {storage || '—'}</p>
      </div>
    </div>
  );
}
