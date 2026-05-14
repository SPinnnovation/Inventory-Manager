import styles from './styles/EmptyState.module.css';

function EmptyState({ title = 'No data found', message = 'Try adjusting your search or filters.', icon = '📭' }) {
  return (
    <div className={styles.container}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
    </div>
  );
}

export default EmptyState;