import { useState } from 'react';
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
import Button from '../../../components/common/Button/Button.jsx';
import { formatDate } from '../../../utils/formatters.js';
import styles from './styles/Categories.module.css';

function CategoryForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({ name: item?.name ?? '', description: item?.description ?? '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); if (errors[f]) setErrors(p => ({ ...p, [f]: '' })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: 'Name is required.' }); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <Input id="cat-name" label="Category Name" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="Electronics, Furniture…" />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="cat-desc">Description</label>
        <textarea id="cat-desc" className={styles.textarea} value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Optional description…" />
      </div>
      <div className={styles.formActions}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{item?.id ? 'Save Changes' : 'Create Category'}</Button>
      </div>
    </form>
  );
}

const COLUMNS = [
  { key: 'name',        label: 'Name' },
  { key: 'description', label: 'Description', render: v => v || '—' },
  { key: 'created_at',  label: 'Created',     render: v => formatDate(v) },
];

function Categories() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const canWrite = user?.role === 'admin';

  const { items, count, loading, params, setSearch, setPage, reload } = useList(inventoryService.getCategories);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (data) => {
    try {
      if (editItem?.id) { await inventoryService.updateCategory(editItem.id, data); notify.success('Category updated.'); }
      else { await inventoryService.createCategory(data); notify.success('Category created.'); }
      setEditItem(null); reload();
    } catch (err) { notify.error(err.message); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await inventoryService.deleteCategory(deleteItem.id); notify.success('Category deleted.'); setDeleteItem(null); reload(); }
    catch (err) { notify.error(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Categories" subtitle={`${count} total`} action={canWrite} actionLabel="+ New Category" onAction={() => setEditItem({})} />
      <div className={styles.toolbar}>
        <input className={styles.search} type="search" placeholder="Search categories…" value={params.search ?? ''} onChange={e => setSearch(e.target.value)} />
      </div>
      <DataTable columns={COLUMNS} rows={items} loading={loading} onEdit={canWrite ? setEditItem : null} onDelete={canWrite ? setDeleteItem : null} emptyTitle="No categories" />
      <Pagination count={count} page={params.page} pageSize={params.page_size} onPage={setPage} />

      {editItem !== null && (
        <Modal title={editItem.id ? 'Edit Category' : 'New Category'} onClose={() => setEditItem(null)}>
          <CategoryForm item={editItem} onSave={handleSave} onCancel={() => setEditItem(null)} />
        </Modal>
      )}
      {deleteItem && (
        <ConfirmDialog title="Delete Category" message={`Delete category "${deleteItem.name}"?`} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} loading={deleting} />
      )}
    </div>
  );
}

export default Categories;