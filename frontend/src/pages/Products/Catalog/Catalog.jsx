import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Badge from '../../../components/common/Badge/Badge.jsx';
import Modal from '../../../components/common/Modal/Modal.jsx';
import Button from '../../../components/common/Button/Button.jsx';
import Input from '../../../components/common/Input/Input.jsx';
import Select from '../../../components/common/Select/Select.jsx';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import Pagination from '../../../components/common/Pagination/Pagination.jsx';
import LoadingSpinner from '../../../components/common/LoadingSpinner/LoadingSpinner.jsx';
import EmptyState from '../../../components/common/EmptyState/EmptyState.jsx';
import inventoryService from '../../../services/inventoryService.js';
import useAuth from '../../../hooks/useAuth.js';
import useNotification from '../../../hooks/useNotification.js';
import styles from './styles/Catalog.module.css';

const EMPTY_FORM = {
  name: '', sku: '', description: '', category_id: '',
  unit_of_measure: '', base_price: '', reorder_point: '', is_active: true,
};

function Catalog() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const canWrite = ['admin', 'floor_manager'].includes(user?.role);

  const [items,        setItems]        = useState([]);
  const [count,        setCount]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [categories,   setCategories]   = useState([]);
  const [filterCat,    setFilterCat]    = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [errors,       setErrors]       = useState({});

  useEffect(() => {
    inventoryService.getCategories({ page_size: 500 })
      .then(d => setCategories([{ value: '', label: 'No category' }, ...(d.results ?? d).map(c => ({ value: c.id, label: c.name }))]))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = { page, page_size: 20 };
    if (search)       params.search    = search;
    if (filterActive) params.is_active = filterActive;
    if (filterCat)    params.category  = filterCat;
    inventoryService.getProducts(params)
      .then(d => { setItems(d.results ?? d); setCount(d.count ?? (d.results ?? d).length); })
      .catch(() => notify.error('Failed to load products.'))
      .finally(() => setLoading(false));
  }, [page, search, filterActive, filterCat]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const setField = k => e =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openCreate = () => {
    setEditItem(null); setForm(EMPTY_FORM); setErrors({}); setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, sku: item.sku, description: item.description ?? '',
      category_id: item.category?.id ?? '',
      unit_of_measure: item.unit_of_measure ?? '',
      base_price: item.base_price ?? '',
      reorder_point: item.reorder_point ?? '',
      is_active: item.is_active,
    });
    setErrors({}); setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name           = 'Name is required.';
    if (!form.sku.trim())            e.sku            = 'SKU is required.';
    if (!form.unit_of_measure.trim()) e.unit_of_measure = 'Unit of measure is required.';
    return e;
  };

  const buildPayload = () => {
    const p = { name: form.name, sku: form.sku, unit_of_measure: form.unit_of_measure, is_active: form.is_active };
    if (form.description.trim())  p.description  = form.description;
    if (form.category_id)          p.category_id  = Number(form.category_id);
    if (form.base_price !== '')    p.base_price   = form.base_price;
    if (form.reorder_point !== '') p.reorder_point = form.reorder_point;
    return p;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editItem) {
        await inventoryService.updateProduct(editItem.id, buildPayload());
        notify.success('Product updated.');
      } else {
        await inventoryService.createProduct(buildPayload());
        notify.success('Product created.');
      }
      setShowForm(false); fetchItems();
    } catch (e) {
      notify.error(e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await inventoryService.deleteProduct(deleteTarget.id);
      notify.success('Product deleted.');
      setDeleteTarget(null); fetchItems();
    } catch (e) {
      notify.error(e.message);
    } finally { setDeleting(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Product Catalog"
        subtitle="All products and their stock totals."
        action={canWrite}
        actionLabel="+ Add Product"
        onAction={openCreate}
      />

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search name or SKU…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className={styles.filterSelect}
          value={filterCat}
          onChange={e => { setFilterCat(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          className={styles.filterSelect}
          value={filterActive}
          onChange={e => { setFilterActive(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.spinnerWrap}><LoadingSpinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="📋" title="No products" message="Add your first product to the catalog." />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th><th>SKU</th><th>Category</th><th>Unit</th>
                  <th>Base Price</th><th>Total Stock</th><th>Status</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td className={styles.mono}>{item.sku}</td>
                    <td className={styles.muted}>{item.category?.name ?? '—'}</td>
                    <td className={styles.muted}>{item.unit_of_measure}</td>
                    <td className={styles.muted}>{item.base_price ? `$${parseFloat(item.base_price).toFixed(2)}` : '—'}</td>
                    <td>
                      {item.total_quantity != null
                        ? <Badge variant={parseFloat(item.total_quantity) === 0 ? 'error' : 'success'}>{item.total_quantity}</Badge>
                        : <span className={styles.muted}>—</span>}
                    </td>
                    <td><Badge variant={item.is_active ? 'success' : 'neutral'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    {canWrite && (
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
        <Modal title={editItem ? 'Edit Product' : 'Add Product'} onClose={() => setShowForm(false)} size="lg">
          <div className={styles.formGrid}>
            <Input id="p-name"  label="Name"           value={form.name}  onChange={setField('name')}  error={errors.name} />
            <Input id="p-sku"   label="SKU"            value={form.sku}   onChange={setField('sku')}   error={errors.sku} placeholder="e.g. OFC-001" />
            <Input id="p-unit"  label="Unit of Measure" value={form.unit_of_measure} onChange={setField('unit_of_measure')} error={errors.unit_of_measure} placeholder="e.g. pcs, kg, box" />
            <Select
              id="p-category"
              label="Category (optional)"
              value={form.category_id}
              onChange={setField('category_id')}
              options={categories}
            />
            <Input id="p-price"  label="Base Price (optional)"    type="number" step="0.01" min="0" value={form.base_price}    onChange={setField('base_price')} />
            <Input id="p-reorder" label="Reorder Point (optional)" type="number" step="0.01" min="0" value={form.reorder_point} onChange={setField('reorder_point')} />
            <Input id="p-desc"  label="Description (optional)"  value={form.description} onChange={setField('description')} className={styles.formFull} />
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.is_active} onChange={setField('is_active')} /> Active
            </label>
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Create Product'}</Button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Product"
          message={`Delete "${deleteTarget.name}" (${deleteTarget.sku})? Stock records linked to this product will also be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

export default Catalog;