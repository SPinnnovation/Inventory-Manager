import React from 'react'
import styles from './styles/Dashboard.module.css';
import { formatDate } from '../../utils/formatters';


const STATS = [
  { label: 'Total Items', value: '1,248', delta: '+12 this week',  color: 'blue'   },
  { label: 'Low Stock Items', value: '23', delta: '−5 from last week', color: 'orange' },
  { label: 'Active Orders', value: '7', delta: '+2 open', color: 'green'  },
  { label: 'Categories', value: '16', delta: 'no change', color: 'purple' },
];

const RECENT = [
  { id: 1, action: 'Stock added', item: 'Office Chair Pro',  qty: '+10', user: 'admin@home.local',   time: '2h ago'  },
  { id: 2, action: 'Order created', item: 'PO-0042', qty: '5 items', user: 'manager@home.local', time: '4h ago'  },
  { id: 3, action: 'Stock removed', item: 'HDMI Cable 2m',     qty: '−3',  user: 'staff@home.local',   time: '6h ago'  },
  { id: 4, action: 'Order closed', item: 'PO-0041',           qty: '—',   user: 'manager@home.local', time: '1d ago'  },
  { id: 5, action: 'Item created', item: 'Standing Desk',     qty: '—',   user: 'admin@home.local',   time: '1d ago'  },
];

function StatCard({ label, value, delta, color }) {
  return (
    <div className={`${styles.statCard} ${styles[`stat_${color}`]}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statDelta}>{delta}</span>
    </div>
  );
}

const Dashboard = () => {

    const today = formatDate(new Date().toISOString());

  return (
    <div className={styles.page}>
        <div className={styles.pageHeader}>
            <div>
                <p className={styles.date}>{today}</p>
                <p className={styles.hint}>Mock data — backend business logic coming soon.</p>
            </div>
        </div>

        {/* Stat Cards */}
        <div className={styles.statsGrid}>
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Recent Activity */}
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Action</th><th>Item / Reference</th>
                            <th>Qty</th><th>By</th><th>When</th>
                        </tr>
                    </thead>

                    <tbody>
                        {RECENT.map(r => (
                            <tr key={r.id}>
                            <td><span className={styles.actionBadge}>{r.action}</span></td>
                            <td>{r.item}</td>
                            <td>{r.qty}</td>
                            <td className={styles.muted}>{r.user}</td>
                            <td className={styles.muted}>{r.time}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  )
}

export default Dashboard