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
import styles from './styles/Shelves.module.css';

function ShelfForm({ item, onSave, onCancel }) {
  const [racks, setRacks] = useState([]);
  const [form, setForm] = useState({
    rack: item?.rack ?? '', identifier: item?.identifier ?? '',
    barcode_or_rfid: item?.barcode_or_rfid ?? '',
    max_weight_capacity: item?.max_weight_capacity ?? '',
    is_active: item?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    inventoryService.getRacks({ page_size: 500 })
      .then(d => setRacks(d.results.map(r => ({ value: r.id, label: `${r.warehouse_code} / F${r.floor_level} / Rack ${r.identifier}` }))))
      .catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.rack) e.rack = 'Rack is required.';
    if (!form.identifier.trim()) e.identifier = 'Identifier is required.';
    return e;
  };

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); if (errors[f]) setErrors(p => ({ ...p, [f]: '' })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = { ...form };
    if (!payload.barcode_or_rfid) delete payload.barcode_or_rfid;
    if (!payload.max_weight_capacity) delete payload.max_weight_capacity;
    setSaving(true);
    try { await onSave(payload); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <Select id="sh-rack" label="Rack" options={racks} placeholder="— Select rack —" value={form.rack} onChange={e => set('rack', e.target.value)} error={errors.rack} />
      <Input id="sh-id" label="Identifier" value={form.identifier} onChange={e => set('identifier', e.target.value)} error={errors.identifier} placeholder="S1, Top, Bottom…" />
      <Input id="sh-barcode" label="Barcode / RFID" value={form.barcode_or_rfid} onChange={e => set('barcode_or_rfid', e.target.value)} placeholder="Optional scanner tag" />
      <Input id="sh-weight" label="Max Weight Capacity (kg)" type="number" min="0" step="0.01" value={form.max_weight_capacity} onChange={e => set('max_weight_capacity', e.target.value)} placeholder="Optional" />
      <label className={styles.checkLabel}><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />Active</label>
      <div className={styles.formActions}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{item?.id ? 'Save Changes' : 'Create Shelf'}</Button>
      </div>
    </form>
  );
}

const COLUMNS = [
  { key: 'full_path',       label: 'Location' },
  { key: 'barcode_or_rfid', label: 'Barcode / RFID', render: v => v || '—' },
  { key: 'max_weight_capacity', label: 'Max Weight', render: v => v ? `${v} kg` : '—' },
  { key: 'is_active', label: 'Status', render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge> },
];

function Shelves() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const canWrite = user?.role === 'admin';

  const { items, count, loading, params, setSearch, setPage, reload } = useList(inventoryService.getShelves);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (data) => {
    try {
      if (editItem?.id) { await inventoryService.updateShelf(editItem.id, data); notify.success('Shelf updated.'); }
      else { await inventoryService.createShelf(data); notify.success('Shelf created.'); }
      setEditItem(null); reload();
    } catch (err) { notify.error(err.message); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await inventoryService.deleteShelf(deleteItem.id); notify.success('Shelf deleted.'); setDeleteItem(null); reload(); }
    catch (err) { notify.error(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Shelves" subtitle={`${count} total`} action={canWrite} actionLabel="+ New Shelf" onAction={() => setEditItem({})} />
      <div className={styles.toolbar}>
        <input className={styles.search} type="search" placeholder="Search identifier or barcode…" value={params.search ?? ''} onChange={e => setSearch(e.target.value)} />
      </div>
      <DataTable columns={COLUMNS} rows={items} loading={loading} onEdit={canWrite ? setEditItem : null} onDelete={canWrite ? setDeleteItem : null} emptyTitle="No shelves" emptyMessage="Add shelves to a rack." />
      <Pagination count={count} page={params.page} pageSize={params.page_size} onPage={setPage} />

      {editItem !== null && (
        <Modal title={editItem.id ? 'Edit Shelf' : 'New Shelf'} onClose={() => setEditItem(null)}>
          <ShelfForm item={editItem} onSave={handleSave} onCancel={() => setEditItem(null)} />
        </Modal>
      )}
      {deleteItem && (
        <ConfirmDialog title="Delete Shelf" message={`Delete shelf "${deleteItem.full_path}"?`} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} loading={deleting} />
      )}
    </div>
  );
}

export default Shelves;