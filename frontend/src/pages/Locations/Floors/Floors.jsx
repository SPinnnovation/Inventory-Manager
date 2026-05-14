import { useState, useEffect } from 'react';
import useList from '../../../hooks/useList.js';
import useAuth from '../../../hooks/useAuth.js';
import useNotification from '../../../hooks/useNotification.js';
import inventoryService from '../../../services/inventoryService.js';
import DataTable from '../../../components/inventory/DataTable/DataTable.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/common/Pagination/Pagination.jsx';
import Modal from '../../../components/common/Modal/Modal.jsx';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import Input from '../../../components/common/Input/Input.jsx';
import Select from '../../../components/common/Select/Select.jsx';
import Button from '../../../components/common/Button/Button.jsx';
import Badge from '../../../components/common/Badge/Badge.jsx';
import styles from './styles/Floors.module.css';

function FloorForm({ item, onSave, onCancel }) {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ warehouse: item?.warehouse ?? '', level: item?.level ?? '', is_active: item?.is_active ?? true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    inventoryService.getWarehouses({ page_size: 200, is_active: true })
      .then(d => setWarehouses(d.results.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }))))
      .catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.warehouse) e.warehouse = 'Warehouse is required.';
    if (!form.level.trim()) e.level = 'Level is required.';
    return e;
  };

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); if (errors[f]) setErrors(p => ({ ...p, [f]: '' })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <Select id="fl-wh" label="Warehouse" options={warehouses} placeholder="— Select warehouse —" value={form.warehouse} onChange={e => set('warehouse', e.target.value)} error={errors.warehouse} />
      <Input id="fl-level" label="Level" value={form.level} onChange={e => set('level', e.target.value)} error={errors.level} placeholder="G, 1, 2, Mezzanine…" />
      <label className={styles.checkLabel}><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />Active</label>
      <div className={styles.formActions}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{item?.id ? 'Save Changes' : 'Create Floor'}</Button>
      </div>
    </form>
  );
}

const COLUMNS = [
  { key: 'warehouse_code', label: 'Warehouse', className: styles.mono },
  { key: 'level',          label: 'Level' },
  { key: 'is_active',      label: 'Status', render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge> },
];

function Floors() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const canWrite = user?.role === 'admin';

  const { items, count, loading, params, setSearch, setPage, reload } = useList(inventoryService.getFloors);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (data) => {
    try {
      if (editItem?.id) { await inventoryService.updateFloor(editItem.id, data); notify.success('Floor updated.'); }
      else { await inventoryService.createFloor(data); notify.success('Floor created.'); }
      setEditItem(null); reload();
    } catch (err) { notify.error(err.message); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await inventoryService.deleteFloor(deleteItem.id); notify.success('Floor deleted.'); setDeleteItem(null); reload(); }
    catch (err) { notify.error(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Floors" subtitle={`${count} total`} action={canWrite} actionLabel="+ New Floor" onAction={() => setEditItem({})} />
      <div className={styles.toolbar}>
        <input className={styles.search} type="search" placeholder="Search level or warehouse…" value={params.search ?? ''} onChange={e => setSearch(e.target.value)} />
      </div>
      <DataTable columns={COLUMNS} rows={items} loading={loading} onEdit={canWrite ? setEditItem : null} onDelete={canWrite ? setDeleteItem : null} emptyTitle="No floors" emptyMessage="Add floors to a warehouse." />
      <Pagination count={count} page={params.page} pageSize={params.page_size} onPage={setPage} />

      {editItem !== null && (
        <Modal title={editItem.id ? 'Edit Floor' : 'New Floor'} onClose={() => setEditItem(null)}>
          <FloorForm item={editItem} onSave={handleSave} onCancel={() => setEditItem(null)} />
        </Modal>
      )}
      {deleteItem && (
        <ConfirmDialog title="Delete Floor" message={`Delete floor "${deleteItem.level}"? Racks and shelves within will also be deleted.`} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} loading={deleting} />
      )}
    </div>
  );
}

export default Floors;