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
import styles from './styles/Racks.module.css';

function RackForm({ item, onSave, onCancel }) {
  const [floors, setFloors] = useState([]);
  const [form, setForm] = useState({ floor: item?.floor ?? '', identifier: item?.identifier ?? '', is_active: item?.is_active ?? true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    inventoryService.getFloors({ page_size: 200 })
      .then(d => setFloors(d.results.map(f => ({ value: f.id, label: `${f.warehouse_code} / Floor ${f.level}` }))))
      .catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.floor) e.floor = 'Floor is required.';
    if (!form.identifier.trim()) e.identifier = 'Identifier is required.';
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
      <Select id="rack-floor" label="Floor" options={floors} placeholder="— Select floor —" value={form.floor} onChange={e => set('floor', e.target.value)} error={errors.floor} />
      <Input id="rack-id" label="Identifier" value={form.identifier} onChange={e => set('identifier', e.target.value)} error={errors.identifier} placeholder="A, B, R1…" />
      <label className={styles.checkLabel}><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />Active</label>
      <div className={styles.formActions}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{item?.id ? 'Save Changes' : 'Create Rack'}</Button>
      </div>
    </form>
  );
}

const COLUMNS = [
  { key: 'warehouse_code', label: 'Warehouse', className: styles.mono },
  { key: 'floor_level',    label: 'Floor' },
  { key: 'identifier',     label: 'Rack ID', className: styles.mono },
  { key: 'is_active',      label: 'Status', render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge> },
];

function Racks() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const canWrite = user?.role === 'admin';

  const { items, count, loading, params, setSearch, setPage, reload } = useList(inventoryService.getRacks);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (data) => {
    try {
      if (editItem?.id) { await inventoryService.updateRack(editItem.id, data); notify.success('Rack updated.'); }
      else { await inventoryService.createRack(data); notify.success('Rack created.'); }
      setEditItem(null); reload();
    } catch (err) { notify.error(err.message); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await inventoryService.deleteRack(deleteItem.id); notify.success('Rack deleted.'); setDeleteItem(null); reload(); }
    catch (err) { notify.error(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Racks" subtitle={`${count} total`} action={canWrite} actionLabel="+ New Rack" onAction={() => setEditItem({})} />
      <div className={styles.toolbar}>
        <input className={styles.search} type="search" placeholder="Search rack identifier…" value={params.search ?? ''} onChange={e => setSearch(e.target.value)} />
      </div>
      <DataTable columns={COLUMNS} rows={items} loading={loading} onEdit={canWrite ? setEditItem : null} onDelete={canWrite ? setDeleteItem : null} emptyTitle="No racks" emptyMessage="Add racks to a floor." />
      <Pagination count={count} page={params.page} pageSize={params.page_size} onPage={setPage} />

      {editItem !== null && (
        <Modal title={editItem.id ? 'Edit Rack' : 'New Rack'} onClose={() => setEditItem(null)}>
          <RackForm item={editItem} onSave={handleSave} onCancel={() => setEditItem(null)} />
        </Modal>
      )}
      {deleteItem && (
        <ConfirmDialog title="Delete Rack" message={`Delete rack "${deleteItem.identifier}"? Shelves within will also be deleted.`} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} loading={deleting} />
      )}
    </div>
  );
}

export default Racks;