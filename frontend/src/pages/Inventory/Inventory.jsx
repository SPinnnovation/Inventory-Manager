import React, { useState } from 'react';
import styles from './styles/Inventory.module.css';

const MOCK_ITEMS = [
  { id: 1,  name: 'Office Chair Pro',    sku: 'OFC-001', category: 'Furniture',    qty: 24, min_qty: 5,  status: 'In Stock'   },
  { id: 2,  name: 'HDMI Cable 2m',       sku: 'CBL-002', category: 'Electronics',  qty: 4,  min_qty: 10, status: 'Low Stock'  },
  { id: 3,  name: 'Standing Desk',       sku: 'DSK-003', category: 'Furniture',    qty: 8,  min_qty: 2,  status: 'In Stock'   },
  { id: 4,  name: 'USB-C Hub 7-Port',    sku: 'USB-004', category: 'Electronics',  qty: 0,  min_qty: 5,  status: 'Out of Stock' },
  { id: 5,  name: 'Whiteboard Markers',  sku: 'STN-005', category: 'Stationery',   qty: 60, min_qty: 20, status: 'In Stock'   },
  { id: 6,  name: 'Laptop Stand',        sku: 'ACC-006', category: 'Accessories',  qty: 3,  min_qty: 5,  status: 'Low Stock'  },
  { id: 7,  name: 'Network Switch 8P',   sku: 'NET-007', category: 'Electronics',  qty: 5,  min_qty: 1,  status: 'In Stock'   },
  { id: 8,  name: 'A4 Paper Ream',       sku: 'STN-008', category: 'Stationery',   qty: 45, min_qty: 10, status: 'In Stock'   },
];

const STATUS_CLASS = {
  'In Stock':     'statusGreen',
  'Low Stock':    'statusOrange',
  'Out of Stock': 'statusRed',
};

const Inventory = () => {
  const [search, setSearch] = useState('');

  const filtered = MOCK_ITEMS.filter(
    i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search by name, SKU or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search inventory"
        />
        <span className={styles.count}>{filtered.length} items</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th><th>SKU</th><th>Category</th>
              <th>Qty</th><th>Min Qty</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className={styles.empty}>No items match your search.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id}>
                  <td className={styles.itemName}>{item.name}</td>
                  <td className={styles.mono}>{item.sku}</td>
                  <td>{item.category}</td>
                  <td className={item.qty === 0 ? styles.qtyZero : ''}>{item.qty}</td>
                  <td className={styles.muted}>{item.min_qty}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[STATUS_CLASS[item.status]]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className={styles.mockNote}>Mock data — inventory endpoints coming soon.</p>
    </div>
  );
}

export default Inventory;