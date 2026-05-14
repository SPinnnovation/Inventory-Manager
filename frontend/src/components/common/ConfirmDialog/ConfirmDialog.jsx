import Modal from '../Modal/Modal.jsx';
import Button from '../Button/Button.jsx';
import styles from './styles/ConfirmDialog.module.css';

function ConfirmDialog({ title = 'Confirm', message, onConfirm, onCancel, loading = false, variant = 'danger' }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>Confirm</Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;