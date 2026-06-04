import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

import analyticsService from '../../services/analyticsService';
import useNotification from '../../hooks/useNotification.js';
import Badge from '../../components/common/Badge/Badge.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner.jsx';
import { formatDate } from '../../utils/formatters';
import { getWebSocketUrl } from '../../utils/websocket';
import styles from './styles/Dashboard.module.css';

// ── Constants ─────────────────────────────────────────────────────────────

const TYPE_VARIANT = {
  PO_RECEIPT:     'success',
  WO_ISSUE:       'warning',
  ADJUSTMENT_ADD: 'info',
  ADJUSTMENT_SUB: 'error',
  RETURN:         'neutral',
};
const TYPE_LABEL = {
  PO_RECEIPT:     'PO Receipt',
  WO_ISSUE:       'WO Issue',
  ADJUSTMENT_ADD: 'Adj +',
  ADJUSTMENT_SUB: 'Adj −',
  RETURN:         'Return',
};
const PRIORITY_VARIANT = {
  LOW:    'neutral',
  NORMAL: 'info',
  HIGH:   'warning',
  URGENT: 'error',
};

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  if (num >= 10_000_000) return `₹${(num / 10_000_000).toFixed(1)}Cr`;
  if (num >= 100_000)    return `₹${(num / 100_000).toFixed(1)}L`;
  if (num >= 1_000)      return `₹${(num / 1_000).toFixed(1)}K`;
  return `₹${num.toFixed(2)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'blue' }) {
  return (
    <div className={`${styles.statCard} ${styles[`stat_${color}`]}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statDelta}>{sub}</span>}
    </div>
  );
}

function AlertSection({ title, count, color, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.alertCard}>
      <button className={styles.alertHeader} onClick={() => setOpen(o => !o)}>
        <span className={styles.alertTitle}>{title}</span>
        <Badge variant={count > 0 ? color : 'neutral'}>{count}</Badge>
        <span className={styles.alertToggle}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.alertBody}>
          {count === 0
            ? <p className={styles.alertEmpty}>All clear — no issues</p>
            : children}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const wsRef = useRef(null);

  const [loading, setLoading]       = useState(true);
  const [summary, setSummary]       = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const [wsOnline, setWsOnline]     = useState(false);

  // ── Initial fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    analyticsService.getDashboardSummary()
      .then(data => {
        setSummary(data);
        setLiveEvents((data.recent_movements || []).slice(0, 20));
      })
      .catch(err => notify.error(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  // ── WebSocket live feed ────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(getWebSocketUrl('/ws/analytics/activity/'));

    wsRef.current = ws;

    ws.onopen    = () => setWsOnline(true);
    ws.onclose   = () => setWsOnline(false);
    ws.onerror   = () => setWsOnline(false);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLiveEvents(prev => [
          {
            product_name:     data.product_name,
            product_sku:      data.product_sku,
            location:         data.location,
            quantity_changed: data.quantity_changed,
            movement_type:    data.movement_type,
            reference_id:     data.reference_id,
            user_email:       data.user_email,
            timestamp:        data.timestamp,
          },
          ...prev.slice(0, 19),
        ]);
      } catch {
        // ignore malformed frames
      }
    };

    return () => ws.close();
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner fullPage />;

  const {
    kpis         = {},
    alerts       = {},
    burn_rates   = [],
    price_trends = [],
  } = summary || {};

  const totalOrders = (kpis.active_po_count || 0) + (kpis.active_wo_count || 0);

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <p className={styles.date}>{formatDate(new Date().toISOString())}</p>
        <span className={styles.livePill}>
          <span className={`${styles.liveDot} ${wsOnline ? styles.liveDotOnline : ''}`} />
          {wsOnline ? 'Live' : 'Connecting…'}
        </span>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        <KpiCard
          label="Total Inventory Value"
          value={formatCurrency(kpis.total_inventory_value)}
          sub={`${kpis.total_sku_count ?? 0} SKUs in stock`}
          color="blue"
        />
        <KpiCard
          label="Active Orders"
          value={totalOrders}
          sub={`${kpis.active_po_count ?? 0} POs · ${kpis.active_wo_count ?? 0} WOs`}
          color="green"
        />
        <KpiCard
          label="Low Stock Items"
          value={kpis.low_stock_count ?? 0}
          sub="Below reorder point"
          color={kpis.low_stock_count > 0 ? 'orange' : 'green'}
        />
        <KpiCard
          label="Blocked Work Orders"
          value={kpis.blocked_wo_count ?? 0}
          sub="Pending insufficient stock"
          color={kpis.blocked_wo_count > 0 ? 'red' : 'green'}
        />
      </div>

      {/* ── Requires Attention ──────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Requires Attention</h2>
        <div className={styles.alertsGrid}>

          {/* Low Stock */}
          <AlertSection
            title="Low Stock Items"
            count={alerts.low_stock_items?.length ?? 0}
            color="warning"
          >
            {alerts.low_stock_items?.map(p => (
              <div key={p.id} className={styles.alertItem}>
                <div className={styles.alertItemInfo}>
                  <span className={styles.alertItemName}>{p.name}</span>
                  <span className={styles.alertItemMeta}>
                    <code className={styles.sku}>{p.sku}</code>
                    <span className={styles.qty}>
                      {p.total_qty} / {p.reorder_point} {p.unit_of_measure}
                    </span>
                  </span>
                </div>
                <button className={styles.alertLink} onClick={() => navigate('/inventory/catalog')}>
                  View
                </button>
              </div>
            ))}
          </AlertSection>

          {/* Blocked WOs */}
          <AlertSection
            title="Blocked Work Orders"
            count={alerts.blocked_work_orders?.length ?? 0}
            color="error"
          >
            {alerts.blocked_work_orders?.map(wo => (
              <div key={wo.id} className={styles.alertItem}>
                <div className={styles.alertItemInfo}>
                  <span className={styles.alertItemName}>{wo.title}</span>
                  <span className={styles.alertItemMeta}>
                    <code className={styles.sku}>{wo.wo_number}</code>
                    <Badge variant={PRIORITY_VARIANT[wo.priority] ?? 'neutral'}>{wo.priority}</Badge>
                  </span>
                </div>
                <button className={styles.alertLink} onClick={() => navigate('/orders/work-orders')}>
                  View
                </button>
              </div>
            ))}
          </AlertSection>

          {/* Overdue POs */}
          <AlertSection
            title="Overdue Purchase Orders"
            count={alerts.overdue_purchase_orders?.length ?? 0}
            color="warning"
          >
            {alerts.overdue_purchase_orders?.map(po => (
              <div key={po.id} className={styles.alertItem}>
                <div className={styles.alertItemInfo}>
                  <span className={styles.alertItemName}>{po.supplier_name}</span>
                  <span className={styles.alertItemMeta}>
                    <code className={styles.sku}>{po.po_number}</code>
                    <span className={styles.overdue}>{po.days_overdue}d overdue</span>
                  </span>
                </div>
                <button className={styles.alertLink} onClick={() => navigate('/orders/purchase-orders')}>
                  View
                </button>
              </div>
            ))}
          </AlertSection>

        </div>
      </div>

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Product</th>
                <th>Location</th>
                <th>Qty</th>
                <th>Reference</th>
                <th>By</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {liveEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.muted} style={{ textAlign: 'center', padding: '24px' }}>
                    No stock movements yet
                  </td>
                </tr>
              )}
              {liveEvents.map((m, i) => (
                <tr key={`${m.timestamp}-${i}`}>
                  <td>
                    <Badge variant={TYPE_VARIANT[m.movement_type] ?? 'neutral'}>
                      {TYPE_LABEL[m.movement_type] ?? m.movement_type}
                    </Badge>
                  </td>
                  <td>
                    {m.product_name}
                    <br />
                    <code className={styles.sku}>{m.product_sku}</code>
                  </td>
                  <td className={styles.muted}>{m.location}</td>
                  <td>
                    <span className={m.quantity_changed >= 0 ? styles.positive : styles.negative}>
                      {m.quantity_changed >= 0 ? '+' : ''}{m.quantity_changed}
                    </span>
                  </td>
                  <td className={styles.muted}>{m.reference_id || '—'}</td>
                  <td className={styles.muted}>{m.user_email}</td>
                  <td className={styles.muted}>{formatDate(m.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Burn Rates ──────────────────────────────────────────────────── */}
      {burn_rates.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Stock Runway — 30-Day Burn Rate</h2>
          <div className={styles.burnGrid}>
            {burn_rates.slice(0, 6).map(b => {
              const critical = b.estimated_days_remaining !== null && b.estimated_days_remaining <= 7;
              const warning  = b.estimated_days_remaining !== null && b.estimated_days_remaining <= 30;
              return (
                <div
                  key={b.product_id}
                  className={`${styles.burnCard} ${critical ? styles.burnCritical : warning ? styles.burnWarning : ''}`}
                >
                  <span className={styles.burnName}>{b.name}</span>
                  <code className={styles.sku}>{b.sku}</code>
                  <div className={styles.burnStats}>
                    <span className={styles.muted}>{b.daily_burn_rate}/day</span>
                    <span className={`${styles.daysRemaining} ${critical ? styles.daysCritical : warning ? styles.daysWarning : ''}`}>
                      {b.estimated_days_remaining !== null ? `${b.estimated_days_remaining}d left` : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Price Trends ────────────────────────────────────────────────── */}
      {price_trends.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Price Trends</h2>
          <div className={styles.trendGrid}>
            {price_trends.map(p => {
              const history = Array.isArray(p.meta) ? p.meta : [];
              if (history.length < 2) return null;
              const chartData = history.map(h => ({ date: h.date, price: parseFloat(h.price) }));
              const latest = chartData[chartData.length - 1]?.price;
              const first  = chartData[0]?.price;
              const changePct = (first && latest !== undefined)
                ? ((latest - first) / first * 100).toFixed(1)
                : null;
              return (
                <div key={p.id} className={styles.trendCard}>
                  <div className={styles.trendHeader}>
                    <span className={styles.trendName}>{p.name}</span>
                    {changePct !== null && (
                      <span className={parseFloat(changePct) >= 0 ? styles.positive : styles.negative}>
                        {parseFloat(changePct) >= 0 ? '+' : ''}{changePct}%
                      </span>
                    )}
                  </div>
                  <code className={styles.sku}>{p.sku}</code>
                  <div className={styles.sparklineWrapper}>
                    <ResponsiveContainer width="100%" height={56}>
                      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="var(--color-primary)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Tooltip
                          formatter={v => [`₹${v}`, 'Price']}
                          labelFormatter={label => label}
                          contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;

