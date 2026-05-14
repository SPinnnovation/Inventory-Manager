import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import Badge from '../../components/common/Badge/Badge.jsx';
import Modal from '../../components/common/Modal/Modal.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Select from '../../components/common/Select/Select.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import Pagination from '../../components/common/Pagination/Pagination.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import inventoryService from '../../services/inventoryService.js';
import useAuth from '../../hooks/useAuth.js';
import useNotification from '../../hooks/useNotification.js';
import styles from './styles/Stock.module.css';

const MOVEMENT_TYPES = [
  { value: 'PO_RECEIPT',     label: 'PO Receipt (Add)'     },
  { value: 'WO_ISSUE',       label: 'WO Issue (Remove)'    },
  { value: 'ADJUSTMENT_ADD', label: 'Adjustment — Add'     },
  { value: 'ADJUSTMENT_SUB', label: 'Adjustment — Subtract'},
  { value: 'RETURN',         label: 'Return (Add)'         },
];

const EMPTY_ADJUST = { delta: '', movement_type: 'ADJUSTMENT_ADD', reference_id: '', reason: '' };
const EMPTY_CREATE = { product_id: '', location_id: '' };

function Stock() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const canWrite  = ['admin', 'floor_manager'].includes(user?.role);
  const canAdjust = ['admin', 'floor_manager', 'staff'].includes(user?.role);

  const [items,       setItems]       = useState([]);
  const [count,       setCount]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [warehouse,   setWarehouse]   = useState('');
  const [lowStock,    setLowStock]    = useState(false);
  const [warehouses,  setWarehouses]  = useState([]);
  const [products,    setProducts]    = useState([]);
  const [shelves,     setShelves]     = useState([]);

  const [showCreate,   setShowCreate]   = useState(false);
  const [showAdjust,   setShowAdjust]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeStock,  setActiveStock]  = useState(null);
  const [createForm,   setCreateForm]   = useState(EMPTY_CREATE);
  const [adjustForm,   setAdjustForm]   = useState(EMPTY_ADJUST);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [errors,       setErrors]       = useState({});

  useEffect(() => {
    inventoryService.getWarehouses({ page_size: 500 })
      .then(d => setWarehouses((d.results ?? d).map(w => ({ value: w.id, label: `${w.code} – ${w.name}` }))))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = { page, page_size: 20 };
    if (search)    params.search    = search;
    if (warehouse) params.warehouse = warehouse;
    if (lowStock)  params.low_stock = true;
    inventoryService.getStock(params)
      .then(d => { setItems(d.results ?? d); setCount(d.count ?? (d.results ?? d).length); })
      .catch(() => notify.error('Failed to load stock records.'))
      .finally(() => setLoading(false));
  }, [page, search, warehouse, lowStock]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdjust = (stock) => {
    setActiveStock(stock);
    setAdjustForm({ ...EMPTY_ADJUST, version: stock.version });
    setErrors({});
    setShowAdjust(true);
  };

  const openCreate = () => {
    Promise.all([
      inventoryService.getProducts({ page_size: 500, is_active: true }),
      inventoryService.getShelves({ page_size: 500, is_active: true }),
    ]).then(([pd, sd]) => {
      setProducts((pd.results ?? pd).map(p => ({ value: p.id, label: `${p.sku} – ${p.name}` })));
      setShelves((sd.results ?? sd).map(s => ({ value: s.id, label: s.full_path ?? `${s.warehouse_code}/${s.floor_level}/${s.rack_identifier}/${s.identifier}` })));
    }).catch(() => notify.error('Failed to load products or shelves.'));
    setCreateForm(EMPTY_CREATE);
    setErrors({});
    setShowCreate(true);
  };

  const handleAdjust = async () => {
    const errs = {};
    const deltaNum = parseInt(adjustForm.delta, 10);
    if (adjustForm.delta === '' || isNaN(deltaNum)) errs.delta = 'Enter a valid integer.';
    else if (deltaNum === 0) errs.delta = 'Delta cannot be zero.';
    if (!adjustForm.movement_type) errs.movement_type = 'Required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await inventoryService.adjustStock(activeStock.id, {
        delta:         deltaNum,
        movement_type: adjustForm.movement_type,
        reference_id:  adjustForm.reference_id,
        reason:        adjustForm.reason,
        version:       adjustForm.version,
      });
      notify.success('Stock adjusted.');
      setShowAdjust(false);
      fetchItems();
    } catch (e) {
      notify.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const errs = {};
    if (!createForm.product_id)  errs.product_id  = 'Required.';
    if (!createForm.location_id) errs.location_id = 'Required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await inventoryService.createStock({ product_id: Number(createForm.product_id), location_id: Number(createForm.location_id) });
      notify.success('Stock record created. Use Adjust to set initial quantity.');
      setShowCreate(false);
      fetchItems();
    } catch (e) {
      notify.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await inventoryService.deleteStock(deleteTarget.id);
      notify.success('Stock record deleted.');
      setDeleteTarget(null);
      fetchItems();
    } catch (e) {
      notify.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const qtyVariant = (stock) => {
    const qty = parseFloat(stock.quantity ?? 0);
    const rp  = parseFloat(stock.product?.reorder_point ?? 0);
    if (qty === 0)   return 'error';
    if (qty <= rp)   return 'warning';
    return 'success';
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Stock"
        subtitle="Product quantities by shelf location."
        action={canWrite}
        actionLabel="+ Add Stock Record"
        onAction={openCreate}
      />

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search product name or SKU…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className={styles.filterSelect}
          value={warehouse}
          onChange={e => { setWarehouse(e.target.value); setPage(1); }}
        >
          <option value="">All Warehouses</option>
          {warehouses.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.spinnerWrap}><LoadingSpinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="📦" title="No stock records" message="Add a stock record to get started." />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Reorder Point</th>
                  <th>Last Counted</th>
                  {(canAdjust || canWrite) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.product?.name ?? '—'}</strong></td>
                    <td className={styles.mono}>{s.product?.sku ?? '—'}</td>
                    <td className={styles.muted}>
                      {[s.location?.warehouse_name, `FL${s.location?.floor_level}`, `R${s.location?.rack_identifier}`, `S${s.location?.identifier}`].filter(Boolean).join(' / ')}
                    </td>
                    <td><Badge variant={qtyVariant(s)}>{s.quantity}</Badge></td>
                    <td className={styles.muted}>{s.product?.reorder_point ?? '—'}</td>
                    <td className={styles.muted}>{s.last_counted_at ? new Date(s.last_counted_at).toLocaleDateString() : '—'}</td>
                    {(canAdjust || canWrite) && (
                      <td>
                        <div className={styles.actionBtns}>
                          {canAdjust && <Button size="sm" variant="outline" onClick={() => openAdjust(s)}>Adjust</Button>}
                          {canWrite  && <Button size="sm" variant="danger"  onClick={() => setDeleteTarget(s)}>Delete</Button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination count={count} page={page} pageSize={20} onPage={setPage} />

      {/* Adjust Modal */}
      {showAdjust && activeStock && (
        <Modal title="Adjust Stock" onClose={() => setShowAdjust(false)} size="md">
          <div className={styles.adjustInfo}>
            <span className={styles.adjustProduct}>{activeStock.product?.name}</span>
            <span className={styles.adjustLocation}>
              {[activeStock.location?.warehouse_name, `Floor ${activeStock.location?.floor_level}`, `Rack ${activeStock.location?.rack_identifier}`, `Shelf ${activeStock.location?.identifier}`].filter(Boolean).join(' › ')}
            </span>
            <span className={styles.adjustQty}>Current quantity: <strong>{activeStock.quantity}</strong></span>
          </div>
          <div className={styles.formGrid}>
            <Input
              id="delta"
              label="Delta — positive to add, negative to remove"
              type="number"
              value={adjustForm.delta}
              onChange={e => setAdjustForm(f => ({ ...f, delta: e.target.value }))}
              error={errors.delta}
              className={styles.formFull}
            />
            <Select
              id="movement_type"
              label="Movement Type"
              value={adjustForm.movement_type}
              onChange={e => setAdjustForm(f => ({ ...f, movement_type: e.target.value }))}
              options={MOVEMENT_TYPES}
              error={errors.movement_type}
              className={styles.formFull}
            />
            <Input
              id="ref_id"
              label="Reference ID (optional)"
              value={adjustForm.reference_id}
              onChange={e => setAdjustForm(f => ({ ...f, reference_id: e.target.value }))}
              placeholder="e.g. PO-1042"
            />
            <Input
              id="reason"
              label="Reason (optional)"
              value={adjustForm.reason}
              onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Weekly replenishment"
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowAdjust(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAdjust} loading={saving}>Confirm Adjustment</Button>
          </div>
        </Modal>
      )}

      {/* Create Stock Record Modal */}
      {showCreate && (
        <Modal title="Add Stock Record" onClose={() => setShowCreate(false)} size="md">
          <div className={styles.formGrid}>
            <Select
              id="product_id"
              label="Product"
              value={createForm.product_id}
              onChange={e => setCreateForm(f => ({ ...f, product_id: e.target.value }))}
              options={products}
              placeholder="Select product…"
              error={errors.product_id}
              className={styles.formFull}
            />
            <Select
              id="location_id"
              label="Shelf Location"
              value={createForm.location_id}
              onChange={e => setCreateForm(f => ({ ...f, location_id: e.target.value }))}
              options={shelves}
              placeholder="Select shelf…"
              error={errors.location_id}
              className={styles.formFull}
            />
          </div>
          <p className={styles.hint}>Stock quantity starts at 0. Use Adjust to set the initial quantity.</p>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create Record</Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Stock Record"
          message={`Remove the stock record for "${deleteTarget.product?.name}"? All movement history for this record will also be affected.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

export default Stock;