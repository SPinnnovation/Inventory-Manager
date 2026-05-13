import PropTypes from 'prop-types';
import styles from './styles/Button.module.css';


/**
 * Reusable button component.
 * @param {object} props
 * @param {'primary'|'outline'|'ghost'|'danger'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.fullWidth=false]
*/
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...rest
}) => {

  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className,  
  ].filter(Boolean).join(' ');  // Combine base styles with variant, size, and state styles, along with any additional className passed in

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={loading ? styles.loadingText : ''}>{children}</span>
    </button>
  )
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'outline', 'ghost', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
};  // Define prop types for the Button component to ensure correct usage and provide better developer experience

export default Button