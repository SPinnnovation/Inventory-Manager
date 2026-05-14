import styles from './styles/Badge.module.css';

const VARIANTS = { success: 'success', warning: 'warning', error: 'error', info: 'info', neutral: 'neutral' };

function Badge({ children, variant = 'neutral' }) {
  return (
    <span className={`${styles.badge} ${styles[VARIANTS[variant] ?? 'neutral']}`}>
      {children}
    </span>
  );
}

export default Badge;