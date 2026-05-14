import PropTypes from 'prop-types';
import styles from './styles/Select.module.css';

/**
 * Styled native select that matches the Input component design.
 */
function Select({ label, id, error, helper, options = [], placeholder, className = '', ...rest }) {
  return (
    <div className={`${styles.field} ${className}`}>
        {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      < div className={styles.wrapper}>
            <select
                id={id}
                className={`${styles.select} ${error ? styles.selectError : ''}`}
                aria-invalid={!!error}
                {...rest}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            
            <span className={styles.chevron} aria-hidden="true">▾</span>
        </div>

        {error  && <span className={styles.error} role="alert">{error}</span>}

        {!error && helper && <span className={styles.helper}>{helper}</span>}
    </div>
  );
}

Select.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string.isRequired,
  error: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.any, label: PropTypes.string })),
  placeholder: PropTypes.string,
};  // Note: We intentionally allow any value type for options.value to support both string and numeric IDs, as well as more complex values if needed. The select element will convert them to strings internally, but this flexibility allows the component to be used in a wider range of scenarios without forcing the caller to transform their data first.

export default Select;