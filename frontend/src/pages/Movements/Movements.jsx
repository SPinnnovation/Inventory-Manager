import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import Badge from '../../components/common/Badge/Badge.jsx';
import Pagination from '../../components/common/Pagination/Pagination.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import inventoryService from '../../services/inventoryService.js';
import useNotification from '../../hooks/useNotification.js';
import styles from './styles/Movements.module.css';

const TYPE_VARIANT = {
  PO_RECEIPT: 'success',
  WO_ISSUE: 'error',
  ADJUSTMENT_ADD: 'info',
  ADJUSTMENT_SUB: 'warning',
  RETURN: 'success',
}; // Map movement types to badge variants for consistent coloring

const MOVEMENT_TYPE_OPTIONS = [
  { value: '',              label: 'All Types'           },
  { value: 'PO_RECEIPT',     label: 'PO Receipt'          },
  { value: 'WO_ISSUE',       label: 'WO Issue'            },
  { value: 'ADJUSTMENT_ADD', label: 'Adjustment Add'      },
  { value: 'ADJUSTMENT_SUB', label: 'Adjustment Subtract' },
  { value: 'RETURN',         label: 'Return'              },
];  // Options for movement type filter dropdown

function Movements() {
  const { notify } = useNotification(); // Custom hook for showing notifications

  const [items,       setItems]       = useState([]);   // List of movement records to display
  const [count,       setCount]       = useState(0); // Total count of movement records (for pagination)
  const [page,        setPage]        = useState(1); // Current page number for pagination
  const [loading,     setLoading]     = useState(false); // Loading state for data fetching      
  const [filterType,  setFilterType]  = useState(''); // Current movement type filter value
  const [startDate,   setStartDate]   = useState(''); // Current start date filter value
  const [endDate,     setEndDate]     = useState(''); // Current end date filter value
  const [search,      setSearch]      = useState(''); // Current search query for product name or SKU

  const fetchItems = useCallback(() => {
    
    setLoading(true);
    const params = { page, page_size: 20 };

    if (filterType) params.movement_type = filterType;
    if (startDate)  params.start_date    = startDate;
    if (endDate)    params.end_date      = endDate;
    if (search)     params.search        = search;

    inventoryService.getMovements(params)
        .then(d => { setItems(d.results ?? d); setCount(d.count ?? (d.results ?? d).length); })
        .catch(() => notify.error('Failed to load movement history.'))
        .finally(() => setLoading(false));
    }, [page, filterType, startDate, endDate, search]); // Memoized function to fetch movement records based on current filters and pagination

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div className={styles.page}>
      <PageHeader title="Movement History" subtitle="Immutable audit log of all stock changes." />

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search product or SKU…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className={styles.filterSelect}
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
        >
          {MOVEMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className={styles.dateLabel}>
          From
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1); }}
          />
        </label>
        <label className={styles.dateLabel}>
          To
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1); }}
          />
        </label>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.spinnerWrap}><LoadingSpinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="📜" title="No movements" message="No stock movements match the current filters." />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th><th>SKU</th><th>Location</th>
                  <th>Qty Changed</th><th>Type</th><th>Reference</th>
                  <th>Reason</th><th>By</th><th>When</th>
                </tr>
              </thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.product_name}</strong></td>
                    <td className={styles.mono}>{m.product_sku}</td>
                    <td className={styles.muted}>{m.location}</td>
                    <td>
                      <span className={parseFloat(m.quantity_changed) >= 0 ? styles.positive : styles.negative}>
                        {parseFloat(m.quantity_changed) >= 0 ? '+' : ''}{m.quantity_changed}
                      </span>
                    </td>
                    <td>
                      <Badge variant={TYPE_VARIANT[m.movement_type] ?? 'neutral'}>
                        {m.movement_type_display}
                      </Badge>
                    </td>
                    <td className={styles.muted}>{m.reference_id || '—'}</td>
                    <td className={styles.muted}>{m.reason || '—'}</td>
                    <td className={styles.muted}>{m.user_email}</td>
                    <td className={styles.muted}>{new Date(m.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination count={count} page={page} pageSize={20} onPage={setPage} />
    </div>
  );
}

export default Movements;