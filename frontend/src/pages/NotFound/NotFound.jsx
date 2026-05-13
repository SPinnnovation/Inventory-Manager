import { Link } from 'react-router-dom';
import styles from './styles/NotFound.module.css';

function NotFound() {
  return (
    <div className={styles.page}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.msg}>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/dashboard" className={styles.link}>Go to Dashboard</Link>
    </div>
  );
}

export default NotFound;