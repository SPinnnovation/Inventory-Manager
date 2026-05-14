import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Badge from '../../../components/common/Badge/Badge.jsx';
import Modal from '../../../components/common/Modal/Modal.jsx';
import Button from '../../../components/common/Button/Button.jsx';
import Input from '../../../components/common/Input/Input.jsx';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import Pagination from '../../../components/common/Pagination/Pagination.jsx';
import LoadingSpinner from '../../../components/common/LoadingSpinner/LoadingSpinner.jsx';
import EmptyState from '../../../components/common/EmptyState/EmptyState.jsx';
import inventoryService from '../../../services/inventoryService.js';
import useAuth from '../../../hooks/useAuth.js';
import useNotification from '../../../hooks/useNotification.js';
import styles from './styles/Warehouses.module.css';

const EMPTY_FORM = { name: '', code: '', address: '', is_active: true };

function Warehouses() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const isAdmin = user?.role === 'admin';

  const [items,        setItems]        = useState([]);
  const [count,        setCount]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [errors,       setErrors]       = useState({});

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = { page, page_size: 20 };
    if (search) params.search = search;
    inventoryService.getWarehouses(params)
      .then(d => { setItems(d.results ?? d); setCount(d.count ?? (d.results ?? d).length); })
      .catch(() => notify.error('Failed to load warehouses.'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const setField = k => e =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openCreate = () => {
    setEditItem(null); setForm(EMPTY_FORM); setErrors({}); setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, code: item.code, address: item.address ?? '', is_active: item.is_active });
    setErrors({}); setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.code.trim()) e.code = 'Code is required.';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editItem) {
        await inventoryService.updateWarehouse(editItem.id, form);
        notify.success('Warehouse updated.');
      } else {
        await inventoryService.createWarehouse(form);
        notify.success('Warehouse created.');
      }
      setShowForm(false); fetchItems();
    } catch (e) {
      notify.error(e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await inventoryService.deleteWarehouse(deleteTarget.id);
      notify.success('Warehouse deleted.');
      setDeleteTarget(null); fetchItems();
    } catch (e) {
      notify.error(e.message);
    } finally { setDeleting(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Warehouses"
        subtitle="Physical warehouse locations."
        action={isAdmin}
        actionLabel="+ Add Warehouse"
        onAction={openCreate}
      />

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search by name or code…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.spinnerWrap}><LoadingSpinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="🏭" title="No warehouses" message="Add your first warehouse to start managing locations." />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Address</th><th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td className={styles.mono}>{item.code}</td>
                    <td><strong>{item.name}</strong></td>
                    <td className={styles.muted}>{item.address || '—'}</td>
                    <td><Badge variant={item.is_active ? 'success' : 'neutral'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    {isAdmin && (
                      <td>
                        <div className={styles.actionBtns}>
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                          <Button size="sm" variant="danger"  onClick={() => setDeleteTarget(item)}>Delete</Button>
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

      {showForm && (
        <Modal title={editItem ? 'Edit Warehouse' : 'Add Warehouse'} onClose={() => setShowForm(false)} size="md">
          <div className={styles.formGrid}>
            <Input id="wh-name"    label="Name"              value={form.name}    onChange={setField('name')}    error={errors.name} />
            <Input id="wh-code"    label="Code"              value={form.code}    onChange={setField('code')}    error={errors.code} placeholder="e.g. WH-01" />
            <Input id="wh-address" label="Address (optional)" value={form.address} onChange={setField('address')} className={styles.formFull} />
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.is_active} onChange={setField('is_active')} /> Active
            </label>
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Create Warehouse'}</Button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Warehouse"
          message={`Delete "${deleteTarget.name}" (${deleteTarget.code})? All floors, racks and shelves inside it will also be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

export default Warehouses;