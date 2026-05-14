import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner.jsx';
import EmptyState from '../../common/EmptyState/EmptyState.jsx';
import styles from './styles/DataTable.module.css';

/**
 * Generic table for CRUD pages.
 *
 * columns: [{ key, label, render?: (value, row) => ReactNode, className? }]
 * rows: array of objects
 * onEdit / onDelete: called with the row object; omit to hide the button
 */
function DataTable({ columns, rows, loading, onEdit, onDelete, keyField = 'id', emptyTitle, emptyMessage }) {
  if (loading) {
    return <div className={styles.loadingWrapper}><LoadingSpinner size="lg" /></div>;
  }
  if (!rows.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  const hasActions = onEdit || onDelete;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.headerClass}>{col.label}</th>
            ))}
            {hasActions && <th className={styles.actionsHead}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row[keyField]}>
              {columns.map(col => (
                <td key={col.key} className={col.className}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
              {hasActions && (
                <td className={styles.actions}>
                  {onEdit   && <button className={styles.btnEdit}   onClick={() => onEdit(row)}   title="Edit">✎</button>}
                  {onDelete && <button className={styles.btnDelete} onClick={() => onDelete(row)} title="Delete">✕</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;