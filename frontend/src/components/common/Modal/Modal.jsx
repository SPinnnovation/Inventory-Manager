import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './styles/Modal.module.css';

/**
 * Accessible modal dialog rendered via a portal.
 * @param {{ title, onClose, children, size? }} props
 */
function Modal({ title, onClose, children, size = 'md' }) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';    // Clean up on unmount

    return () => { document.body.style.overflow = ''; };    // Re-attach if onClose changes (unlikely, but good practice)
  }, []);   // Note: This is a simple implementation; for more complex apps, consider using a library like react-aria or reach-ui for better focus management and accessibility.

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };  // Note: This is a simple global handler; for more complex apps, consider using a library like react-aria or reach-ui for better focus management and accessibility.

    window.addEventListener('keydown', handler);    // Clean up on unmount

    return () => window.removeEventListener('keydown', handler);    // Re-attach handler if onClose changes (unlikely, but good practice)
  }, [onClose]);    // Re-attach handler if onClose changes (unlikely, but good practice)

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`${styles.dialog} ${styles[size]}`}>
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;