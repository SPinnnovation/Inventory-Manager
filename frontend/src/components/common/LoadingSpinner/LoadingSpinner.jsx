import PropTypes from 'prop-types';
import styles from './styles/LoadingSpinner.module.css';

/**
 * @param {{ fullPage?: boolean, size?: 'sm'|'md'|'lg' }}
*/
function LoadingSpinner({ fullPage = false, size = 'md' }) {
  const spinner = (
    <span
      className={`${styles.spinner} ${styles[size]}`}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return <div className={styles.fullPage}>{spinner}</div>;
  }

  return spinner;
}

LoadingSpinner.propTypes = {
  fullPage: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};  // Define prop types for the LoadingSpinner component to ensure correct usage and provide better developer experience

export default LoadingSpinner;