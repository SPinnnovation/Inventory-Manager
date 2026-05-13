import PropTypes from "prop-types";
import styles from './styles/Input.module.css';

/**
 * Labelled input field with optional error message.
*/
function Input({ label, id, error, helper, className = '', ...rest }) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}

      <input
        id={id}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...rest}
      />

      {error && (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {!error && helper && <span className={styles.helper}>{helper}</span>}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string.isRequired,
  error: PropTypes.string,
  helper: PropTypes.string,
};      // Define prop types for the Input component to ensure correct usage and provide better developer experience

export default Input;