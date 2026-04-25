// Shared primitives
const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

const cx = (...xs) => xs.filter(Boolean).join(' ');
const fmtYen = (n) => '¥' + n.toLocaleString('ja-JP');
const priceSymbol = (p) => '¥'.repeat(p);

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function Swatch({ swatch, initial, size = 'md', style }) {
  const { bg, fg, style: kind } = swatch || { bg: '#e8e8e8', fg: '#b0b0b0', style: 'paper' };
  const fontSize = size === 'xl' ? 96 : size === 'lg' ? 56 : size === 'sm' ? 18 : 38;
  let bgStyle = { background: bg };
  if (kind === 'mono') {
    bgStyle = { background: `linear-gradient(135deg, ${bg} 0%, ${bg} 60%, ${shift(bg, 8)} 100%)` };
  } else if (kind === 'paper') {
    bgStyle = { background: `radial-gradient(circle at 30% 30%, ${shift(bg, 4)}, ${bg} 70%)` };
  } else if (kind === 'bold') {
    bgStyle = { background: bg };
  }
  return (
    <div className="swatch" style={{ ...bgStyle, ...style }}>
      <div className="swatch__stripes" aria-hidden="true" />
      <div className="swatch__initial" style={{ color: fg, fontSize }}>{initial}</div>
    </div>
  );
}

function shift(hex, amt) {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(h.substr(0,2),16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(h.substr(2,2),16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(h.substr(4,2),16) + amt));
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

function Badge({ kind = 'genre', children }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

function StatusBadge({ status, onClick, interactive }) {
  const cfg = {
    wishlist:    { label: 'ほしい',   icon: '★' },
    considering: { label: '検討中',   icon: '？' },
    purchased:   { label: '購入済み', icon: '✓' },
  }[status];
  if (!cfg) return null;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag className={cx('status-badge', status, interactive && 'is-interactive')} onClick={onClick}>
      <span className="status-badge__icon">{cfg.icon}</span>{cfg.label}
    </Tag>
  );
}

function Tag({ children }) {
  return <span className="tag-chip">{children}</span>;
}

function Button({ variant = 'secondary', size, children, ...rest }) {
  return <button className={cx('btn', `btn-${variant}`, size && `btn-${size}`)} {...rest}>{children}</button>;
}

const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = (msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, ...opts }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), opts.duration || 3200);
  };
  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id));
  return (
    <ToastCtx.Provider value={{ show, dismiss }}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={cx('toast', t.error && 'toast-error')}>
            <span>{t.msg}</span>
            {t.action && <button className="toast-action" onClick={() => { t.action.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay is-open" onClick={onClose}>
      <div className={cx('modal', `modal-${size}`)} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { cx, fmtYen, priceSymbol, Swatch, Badge, StatusBadge, Tag, Button, Modal, ToastProvider, useToast, AppCtx, useApp });
