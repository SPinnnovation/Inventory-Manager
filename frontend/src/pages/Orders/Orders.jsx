import React from 'react';
import styles from './styles/Orders.module.css';
import { formatDate } from '../../utils/formatters.js';

const MOCK_ORDERS = [
  { id: 'PO-0042', type: 'Purchase', ref: 'ACME Corp',       items: 5, status: 'Pending',   created: '2026-05-10' },
  { id: 'WO-0018', type: 'Work',     ref: 'Floor A Restock', items: 3, status: 'Open',      created: '2026-05-09' },
  { id: 'PO-0041', type: 'Purchase', ref: 'TechSupply Ltd',  items: 8, status: 'Closed',    created: '2026-05-07' },
  { id: 'WO-0017', type: 'Work',     ref: 'Floor B Audit',   items: 2, status: 'Completed', created: '2026-05-06' },
  { id: 'PO-0040', type: 'Purchase', ref: 'OfficeWorld',     items: 12,status: 'Approved',  created: '2026-05-04' },
];

const STATUS_CLASS = {
  Pending:   'statusOrange',
  Open:      'statusBlue',
  Approved:  'statusGreen',
  Closed:    'statusGray',
  Completed: 'statusGreen',
};

function Orders() {
  return (
    <div className={styles.page}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th><th>Type</th><th>Reference</th>
              <th>Items</th><th>Status</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map(o => (
              <tr key={o.id}>
                <td className={styles.orderId}>{o.id}</td>
                <td>
                  <span className={`${styles.typeBadge} ${o.type === 'Purchase' ? styles.typePO : styles.typeWO}`}>
                    {o.type}
                  </span>
                </td>
                <td>{o.ref}</td>
                <td>{o.items}</td>
                <td>
                  <span className={`${styles.badge} ${styles[STATUS_CLASS[o.status]]}`}>
                    {o.status}
                  </span>
                </td>
                <td className={styles.muted}>{formatDate(o.created)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.mockNote}>Mock data — orders endpoints coming soon.</p>
    </div>
  );
}

export default Orders;