import Button from '../Button/Button.jsx';
import styles from './styles/PageHeader.module.css';

function PageHeader({ title, subtitle, action, actionLabel = '+ Add', onAction }) {
  return (
    <div className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && (
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

export default PageHeader;