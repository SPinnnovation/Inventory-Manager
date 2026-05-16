import React, { useState, useEffect, useCallback } from 'react';
import PageHeader     from '../../components/common/PageHeader/PageHeader.jsx';
import Badge          from '../../components/common/Badge/Badge.jsx';
import Modal          from '../../components/common/Modal/Modal.jsx';
import Button         from '../../components/common/Button/Button.jsx';
import Input          from '../../components/common/Input/Input.jsx';
import Select         from '../../components/common/Select/Select.jsx';
import ConfirmDialog  from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import Pagination     from '../../components/common/Pagination/Pagination.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner.jsx';
import EmptyState     from '../../components/common/EmptyState/EmptyState.jsx';
import ordersService    from '../../services/ordersService.js';
import inventoryService from '../../services/inventoryService.js';
import useAuth           from '../../hooks/useAuth.js';
import useNotification   from '../../hooks/useNotification.js';
import { formatDate }    from '../../utils/formatters.js';
import styles from './styles/WorkOrders.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '',                          label: 'All Statuses'               },
    { value: 'DRAFT',                     label: 'Draft'                      },
    { value: 'ISSUED',                    label: 'Issued'                     },
    { value: 'PENDING_INSUFFICIENT_STOCK',label: 'Pending — Insufficient Stock'},
    { value: 'COMPLETED_FULLY_USED',      label: 'Completed — Fully Used'     },
    { value: 'COMPLETED_PARTIALLY_USED',  label: 'Completed — Partially Used' },
    { value: 'COMPLETED_NOT_USED',        label: 'Completed — Not Used'       },
    { value: 'CANCELLED',                 label: 'Cancelled'                  },
];

const STATUS_VARIANT = {
    DRAFT:                      'neutral',
    ISSUED:                     'info',
    PENDING_INSUFFICIENT_STOCK: 'warning',
    COMPLETED_FULLY_USED:       'success',
    COMPLETED_PARTIALLY_USED:   'success',
    COMPLETED_NOT_USED:         'neutral',
    CANCELLED:                  'error',
};

const STATUS_LABEL = {
    DRAFT:                      'Draft',
    ISSUED:                     'Issued',
    PENDING_INSUFFICIENT_STOCK: 'Pending Stock',
    COMPLETED_FULLY_USED:       'Completed (Full)',
    COMPLETED_PARTIALLY_USED:   'Completed (Partial)',
    COMPLETED_NOT_USED:         'Completed (Unused)',
    CANCELLED:                  'Cancelled',
};

const PRIORITY_OPTIONS_FILTER = [
    { value: '',       label: 'All Priorities' },
    { value: 'LOW',    label: 'Low'            },
    { value: 'NORMAL', label: 'Normal'         },
    { value: 'HIGH',   label: 'High'           },
    { value: 'URGENT', label: 'Urgent'         },
];

const PRIORITY_FORM_OPTIONS = [
    { value: 'LOW',    label: 'Low'    },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH',   label: 'High'   },
    { value: 'URGENT', label: 'Urgent' },
];

const PRIORITY_VARIANT = { LOW: 'neutral', NORMAL: 'info', HIGH: 'warning', URGENT: 'error' };

const COMPLETION_OPTIONS = [
    { value: 'COMPLETED_FULLY_USED',     label: 'Fully Used — all materials consumed'           },
    { value: 'COMPLETED_PARTIALLY_USED', label: 'Partially Used — some materials left over'      },
    { value: 'COMPLETED_NOT_USED',       label: 'Not Used — no stock deducted'                   },
];

const TERMINAL = new Set(['COMPLETED_FULLY_USED','COMPLETED_PARTIALLY_USED','COMPLETED_NOT_USED','CANCELLED']);

const EMPTY_WO = {
    title: '', description: '', priority: 'NORMAL',
    assigned_to: '', due_date: '', notes: '',
};

const EMPTY_ITEM = { product_id: '', source_location_id: '', quantity_required: '', notes: '' };

const EMPTY_COMPLETE = { completion_status: '', notes: '' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkOrders() {
    const { user }   = useAuth();
    const { notify } = useNotification();
    const canWrite   = ['admin', 'floor_manager'].includes(user?.role);
    const canManage  = ['admin', 'floor_manager', 'staff'].includes(user?.role);
    const isAdmin    = user?.role === 'admin';

    // List
    const [wos,            setWOs]            = useState([]);
    const [count,          setCount]          = useState(0);
    const [page,           setPage]           = useState(1);
    const [loading,        setLoading]        = useState(false);
    const [search,         setSearch]         = useState('');
    const [statusFilter,   setStatusFilter]   = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [overdueOnly,    setOverdueOnly]    = useState(false);

    // Modals
    const [showCreate,       setShowCreate]       = useState(false);
    const [editTarget,       setEditTarget]       = useState(null);
    const [detailWO,         setDetailWO]         = useState(null);
    const [addItemWO,        setAddItemWO]        = useState(null);
    const [editItem,         setEditItem]         = useState(null);
    const [completeTarget,   setCompleteTarget]   = useState(null);
    const [confirmIssue,     setConfirmIssue]     = useState(null);
    const [confirmCancel,    setConfirmCancel]     = useState(null);
    const [deleteTarget,     setDeleteTarget]     = useState(null);
    const [deleteItemTarget, setDeleteItemTarget] = useState(null);

    // Forms
    const [woForm,       setWOForm]       = useState(EMPTY_WO);
    const [itemForm,     setItemForm]     = useState(EMPTY_ITEM);
    const [completeForm, setCompleteForm] = useState(EMPTY_COMPLETE);
    const [saving,       setSaving]       = useState(false);
    const [errors,       setErrors]       = useState({});
    const [products,     setProducts]     = useState([]);
    const [shelves,      setShelves]      = useState([]);
    const [loadingOpts,  setLoadingOpts]  = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchWOs = useCallback(() => {
        setLoading(true);
        const params = { page, page_size: 20 };
        if (search)         params.search    = search;
        if (statusFilter)   params.status    = statusFilter;
        if (priorityFilter) params.priority  = priorityFilter;
        if (overdueOnly)    params.is_overdue = true;
        ordersService.getWorkOrders(params)
            .then(d => { setWOs(d.results ?? d); setCount(d.count ?? (d.results ?? d).length); })
            .catch(() => notify.error('Failed to load work orders.'))
            .finally(() => setLoading(false));
    }, [page, search, statusFilter, priorityFilter, overdueOnly]);

    useEffect(() => { fetchWOs(); }, [fetchWOs]);

    const refreshDetail = (id) => {
        ordersService.getWorkOrder(id)
            .then(updated => {
                setDetailWO(updated);
                setWOs(prev => prev.map(w => w.id === updated.id ? updated : w));
            })
            .catch(() => {});
    };

    const loadOptions = () => {
        setLoadingOpts(true);
        Promise.all([
            inventoryService.getProducts({ page_size: 500, is_active: true }),
            inventoryService.getShelves({ page_size: 500, is_active: true }),
        ]).then(([pd, sd]) => {
            setProducts((pd.results ?? pd).map(p => ({ value: p.id, label: `${p.sku} – ${p.name}` })));
            setShelves((sd.results ?? sd).map(s => ({ value: s.id, label: s.full_path || s.identifier })));
        }).catch(() => notify.error('Failed to load product/shelf options.'))
          .finally(() => setLoadingOpts(false));
    };

    // ── WO CRUD ───────────────────────────────────────────────────────────────

    const openCreate = () => { setWOForm(EMPTY_WO); setErrors({}); setShowCreate(true); };

    const openEdit = (wo) => {
        setWOForm({
            title:       wo.title       || '',
            description: wo.description || '',
            priority:    wo.priority    || 'NORMAL',
            assigned_to: wo.assigned_to || '',
            due_date:    wo.due_date    || '',
            notes:       wo.notes       || '',
        });
        setErrors({});
        setEditTarget(wo);
    };

    const handleSaveWO = async () => {
        const errs = {};
        if (!woForm.title.trim()) errs.title = 'Required.';
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        try {
            const payload = { ...woForm, due_date: woForm.due_date || null };
            if (editTarget) {
                await ordersService.updateWorkOrder(editTarget.id, payload);
                notify.success('Work order updated.');
                setEditTarget(null);
            } else {
                await ordersService.createWorkOrder(payload);
                notify.success('Work order created.');
                setShowCreate(false);
            }
            fetchWOs();
        } catch (e) { notify.error(e.message); }
        finally { setSaving(false); }
    };

    const handleIssue = async () => {
        setSaving(true);
        try {
            const updated = await ordersService.issueWorkOrder(confirmIssue.id);
            notify.success(`${confirmIssue.wo_number} issued.`);
            setConfirmIssue(null);
            setWOs(prev => prev.map(w => w.id === updated.id ? updated : w));
            if (detailWO?.id === updated.id) setDetailWO(updated);
        } catch (e) { notify.error(e.message); }
        finally { setSaving(false); }
    };

    const handleComplete = async () => {
        const errs = {};
        if (!completeForm.completion_status) errs.completion_status = 'Required.';
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        try {
            const updated = await ordersService.completeWorkOrder(completeTarget.id, {
                completion_status: completeForm.completion_status,
                notes: completeForm.notes,
            });
            notify.success(`${completeTarget.wo_number} completed.`);
            setCompleteTarget(null);
            setWOs(prev => prev.map(w => w.id === updated.id ? updated : w));
            if (detailWO?.id === updated.id) setDetailWO(updated);
        } catch (e) { notify.error(e.message); }
        finally { setSaving(false); }
    };

    const handleCancelWO = async () => {
        setSaving(true);
        try {
            const updated = await ordersService.cancelWorkOrder(confirmCancel.id);
            notify.success(`${confirmCancel.wo_number} cancelled.`);
            setConfirmCancel(null);
            setWOs(prev => prev.map(w => w.id === updated.id ? updated : w));
            if (detailWO?.id === updated.id) setDetailWO(updated);
        } catch (e) { notify.error(e.message); }
        finally { setSaving(false); }
    };

    const handleDeleteWO = async () => {
        setSaving(true);
        try {
            await ordersService.deleteWorkOrder(deleteTarget.id);
            notify.success('Work order deleted.');
            setDeleteTarget(null);
            if (detailWO?.id === deleteTarget.id) setDetailWO(null);
            fetchWOs();
        } catch (e) { notify.error(e.message); }
        finally { setSaving(false); }
    };

    // ── Item CRUD ─────────────────────────────────────────────────────────────

    const openAddItem = (wo) => { setAddItemWO(wo); setItemForm(EMPTY_ITEM); setErrors({}); loadOptions(); };

    const openEditItem = (item) => {
        setItemForm({
            product_id:         String(item.product?.id       || ''),
            source_location_id: String(item.source_location?.id || ''),
            quantity_required:  String(item.quantity_required),
            notes:              item.notes || '',
        });
        setErrors({});
        setEditItem(item);
        loadOptions();
    };

    const handleSaveItem = async () => {
        const errs = {};
        if (!itemForm.product_id)         errs.product_id         = 'Required.';
        if (!itemForm.source_location_id) errs.source_location_id = 'Required.';
        if (!itemForm.quantity_required || parseInt(itemForm.quantity_required, 10) < 1)
            errs.quantity_required = 'Minimum 1.';
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        try {
            if (editItem) {
                await ordersService.updateWorkOrderItem(editItem.id, {
                    source_location_id: Number(itemForm.source_location_id),
                    quantity_required:  parseInt(itemForm.quantity_required, 10),
                    notes: itemForm.notes,
                });
                notify.success('Item updated.');
                setEditItem(null);
            } else {
                await ordersService.createWorkOrderItem({
                    work_order:         addItemWO.id,
                    product_id:         Number(itemForm.product_id),
                    source_location_id: Number(itemForm.source_location_id),
                    quantity_required:  parseInt(itemForm.quantity_required, 10),
                    notes: itemForm.notes,
                });
                notify.success('Item added.');
                setAddItemWO(null);
            }
            if (detailWO) refreshDetail(detailWO.id);
            fetchWOs();
        } catch (e) { notify.error(e.message); }
        finally { setSaving(false); }
    };

    const handleDeleteItem = async () => {
        setSaving(true);
        try {
            await ordersService.deleteWorkOrderItem(deleteItemTarget.id);
            notify.success('Item removed.');
            setDeleteItemTarget(null);
            if (detailWO) refreshDetail(detailWO.id);
            fetchWOs();
        } catch (e) { notify.error(e.message); }
        finally { setSaving(false); }
    };

    const wof = k => e => { setWOForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })); };
    const itf = k => e => { setItemForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })); };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className={styles.page}>
            <PageHeader
                title="Work Orders"
                subtitle="Issue and track material usage for operational tasks."
                action={canWrite}
                actionLabel="+ Create WO"
                onAction={openCreate}
            />

            {/* Toolbar */}
            <div className={styles.toolbar}>
                <input className={styles.search} placeholder="Search WO number or title…"
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                <select className={styles.filterSelect} value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select className={styles.filterSelect} value={priorityFilter}
                    onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}>
                    {PRIORITY_OPTIONS_FILTER.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <label className={styles.toggleLabel}>
                    <input type="checkbox" checked={overdueOnly}
                        onChange={e => { setOverdueOnly(e.target.checked); setPage(1); }} />
                    Overdue only
                </label>
            </div>

            {/* Table */}
            <div className={styles.card}>
                {loading ? (
                    <div className={styles.spinnerWrap}><LoadingSpinner /></div>
                ) : wos.length === 0 ? (
                    <EmptyState title="No work orders" message="Create your first WO to get started." icon="🔧" />
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>WO Number</th><th>Title</th><th>Priority</th>
                                    <th>Status</th><th>Assigned To</th><th>Due Date</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wos.map(wo => (
                                    <tr key={wo.id}>
                                        <td>
                                            <span className={styles.orderId}>{wo.wo_number}</span>
                                            {wo.is_overdue && <span className={styles.overdueTag}>OVERDUE</span>}
                                        </td>
                                        <td>
                                            <div className={styles.primaryText}>{wo.title}</div>
                                            {wo.description && <div className={styles.muted}>{wo.description.slice(0, 60)}{wo.description.length > 60 ? '…' : ''}</div>}
                                        </td>
                                        <td>
                                            <Badge variant={PRIORITY_VARIANT[wo.priority] ?? 'neutral'}>
                                                {wo.priority}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge variant={STATUS_VARIANT[wo.status] ?? 'neutral'}>
                                                {STATUS_LABEL[wo.status] ?? wo.status}
                                            </Badge>
                                        </td>
                                        <td className={styles.muted}>{wo.assigned_to || '—'}</td>
                                        <td className={styles.muted}>{formatDate(wo.due_date)}</td>
                                        <td>
                                            <div className={styles.actionBtns}>
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => setDetailWO(wo)}>Items</Button>
                                                {canWrite && wo.status === 'DRAFT' && (
                                                    <Button size="sm" variant="outline"
                                                        onClick={() => openEdit(wo)}>Edit</Button>
                                                )}
                                                {canManage && wo.status === 'DRAFT' && (
                                                    <Button size="sm" variant="primary"
                                                        onClick={() => setConfirmIssue(wo)}>Issue</Button>
                                                )}
                                                {canManage && ['ISSUED', 'PENDING_INSUFFICIENT_STOCK'].includes(wo.status) && (
                                                    <Button size="sm" variant="primary"
                                                        onClick={() => { setCompleteTarget(wo); setCompleteForm(EMPTY_COMPLETE); setErrors({}); }}>
                                                        Complete
                                                    </Button>
                                                )}
                                                {canManage && !TERMINAL.has(wo.status) && (
                                                    <Button size="sm" variant="danger"
                                                        onClick={() => setConfirmCancel(wo)}>Cancel</Button>
                                                )}
                                                {isAdmin && wo.status === 'DRAFT' && (
                                                    <Button size="sm" variant="danger"
                                                        onClick={() => setDeleteTarget(wo)}>Delete</Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination count={count} page={page} onPage={setPage} />

            {/* ── Create WO ── */}
            {showCreate && (
                <Modal title="Create Work Order" onClose={() => setShowCreate(false)} size="lg">
                    <WOForm form={woForm} errors={errors} onChange={wof} />
                    <div className={styles.formActions}>
                        <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button variant="primary" loading={saving} onClick={handleSaveWO}>Create WO</Button>
                    </div>
                </Modal>
            )}

            {/* ── Edit WO ── */}
            {editTarget && (
                <Modal title={`Edit ${editTarget.wo_number}`} onClose={() => setEditTarget(null)} size="lg">
                    <WOForm form={woForm} errors={errors} onChange={wof} />
                    <div className={styles.formActions}>
                        <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
                        <Button variant="primary" loading={saving} onClick={handleSaveWO}>Save Changes</Button>
                    </div>
                </Modal>
            )}

            {/* ── Complete WO ── */}
            {completeTarget && (
                <Modal title={`Complete ${completeTarget.wo_number}`} onClose={() => setCompleteTarget(null)} size="md">
                    <p className={styles.hint}>
                        Completing this work order will deduct stock from the source locations for each item.
                        Choose the outcome that best describes what happened.
                    </p>
                    <Select id="comp-status" label="Completion Status *"
                        options={COMPLETION_OPTIONS} placeholder="Select outcome…"
                        value={completeForm.completion_status}
                        onChange={e => { setCompleteForm(f => ({ ...f, completion_status: e.target.value })); setErrors({}); }}
                        error={errors.completion_status}
                    />
                    <Input id="comp-notes" label="Notes (optional)"
                        value={completeForm.notes}
                        onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))}
                        helper="Appended to the WO notes."
                    />
                    <div className={styles.formActions}>
                        <Button variant="ghost" onClick={() => setCompleteTarget(null)}>Cancel</Button>
                        <Button variant="primary" loading={saving} onClick={handleComplete}>Complete WO</Button>
                    </div>
                </Modal>
            )}

            {/* ── Items Detail ── */}
            {detailWO && (
                <Modal title={`${detailWO.wo_number} — Line Items`} onClose={() => setDetailWO(null)} size="xl">
                    <div className={styles.metaGrid}>
                        <div>
                            <span className={styles.metaLabel}>Title</span>
                            <span>{detailWO.title}</span>
                        </div>
                        <div>
                            <span className={styles.metaLabel}>Status</span>
                            <Badge variant={STATUS_VARIANT[detailWO.status] ?? 'neutral'}>
                                {STATUS_LABEL[detailWO.status] ?? detailWO.status}
                            </Badge>
                        </div>
                        <div>
                            <span className={styles.metaLabel}>Priority</span>
                            <Badge variant={PRIORITY_VARIANT[detailWO.priority] ?? 'neutral'}>
                                {detailWO.priority}
                            </Badge>
                        </div>
                        <div>
                            <span className={styles.metaLabel}>Due Date</span>
                            <span>{formatDate(detailWO.due_date)}</span>
                        </div>
                    </div>

                    <div className={styles.itemsSectionHeader}>
                        <h3 className={styles.sectionTitle}>Items</h3>
                        {canWrite && detailWO.status === 'DRAFT' && (
                            <Button size="sm" onClick={() => openAddItem(detailWO)}>+ Add Item</Button>
                        )}
                    </div>

                    {!detailWO.items?.length ? (
                        <EmptyState title="No items" message="Add line items to this work order." icon="🔩" />
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Product</th><th>Source Shelf</th>
                                        <th>Required</th><th>Issued</th><th>Outstanding</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailWO.items.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className={styles.primaryText}>{item.product?.name}</div>
                                                <div className={styles.muted}>{item.product?.sku}</div>
                                            </td>
                                            <td className={styles.muted}>{item.source_location?.full_path || '—'}</td>
                                            <td>{item.quantity_required}</td>
                                            <td>
                                                {item.quantity_issued}
                                                {item.is_fully_issued && <span className={styles.checkmark}> ✓</span>}
                                            </td>
                                            <td>{item.quantity_outstanding}</td>
                                            <td>
                                                <div className={styles.actionBtns}>
                                                    {canWrite && detailWO.status === 'DRAFT' && (
                                                        <Button size="sm" variant="outline"
                                                            onClick={() => openEditItem(item)}>Edit</Button>
                                                    )}
                                                    {isAdmin && detailWO.status === 'DRAFT' && (
                                                        <Button size="sm" variant="danger"
                                                            onClick={() => setDeleteItemTarget(item)}>✕</Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal>
            )}

            {/* ── Add / Edit Item ── */}
            {(addItemWO || editItem) && (
                <Modal
                    title={editItem ? 'Edit Line Item' : `Add Item to ${addItemWO?.wo_number}`}
                    onClose={() => { setAddItemWO(null); setEditItem(null); }}
                    size="md"
                >
                    {loadingOpts ? <div className={styles.spinnerWrap}><LoadingSpinner /></div> : (
                        <>
                            <div className={styles.formGrid}>
                                {!editItem && (
                                    <div className={styles.formFull}>
                                        <Select id="wi-product" label="Product *"
                                            options={products} placeholder="Select product…"
                                            value={itemForm.product_id} onChange={itf('product_id')}
                                            error={errors.product_id} />
                                    </div>
                                )}
                                {editItem && (
                                    <div className={styles.formFull}>
                                        <p className={styles.readonlyField}>
                                            <strong>Product:</strong> {editItem.product?.sku} – {editItem.product?.name}
                                        </p>
                                    </div>
                                )}
                                <div className={styles.formFull}>
                                    <Select id="wi-src" label="Source Shelf *"
                                        options={shelves} placeholder="Select shelf…"
                                        value={itemForm.source_location_id} onChange={itf('source_location_id')}
                                        error={errors.source_location_id} />
                                </div>
                                <Input id="wi-qty" label="Quantity Required *" type="number" min="1"
                                    value={itemForm.quantity_required} onChange={itf('quantity_required')}
                                    error={errors.quantity_required} />
                                <div className={styles.formFull}>
                                    <Input id="wi-notes" label="Notes"
                                        value={itemForm.notes} onChange={itf('notes')} />
                                </div>
                            </div>
                            <div className={styles.formActions}>
                                <Button variant="ghost" onClick={() => { setAddItemWO(null); setEditItem(null); }}>Cancel</Button>
                                <Button variant="primary" loading={saving} onClick={handleSaveItem}>
                                    {editItem ? 'Save Changes' : 'Add Item'}
                                </Button>
                            </div>
                        </>
                    )}
                </Modal>
            )}

            {/* ── Confirms ── */}
            {confirmIssue && (
                <ConfirmDialog title="Issue Work Order"
                    message={`Issue "${confirmIssue.wo_number}"? Stock will be checked for each item.`}
                    variant="primary" onConfirm={handleIssue} onCancel={() => setConfirmIssue(null)} loading={saving} />
            )}
            {confirmCancel && (
                <ConfirmDialog title="Cancel Work Order"
                    message={`Cancel "${confirmCancel.wo_number}"? This cannot be undone.`}
                    onConfirm={handleCancelWO} onCancel={() => setConfirmCancel(null)} loading={saving} />
            )}
            {deleteTarget && (
                <ConfirmDialog title="Delete Work Order"
                    message={`Permanently delete "${deleteTarget.wo_number}"?`}
                    onConfirm={handleDeleteWO} onCancel={() => setDeleteTarget(null)} loading={saving} />
            )}
            {deleteItemTarget && (
                <ConfirmDialog title="Remove Item"
                    message={`Remove "${deleteItemTarget.product?.name}" from the work order?`}
                    onConfirm={handleDeleteItem} onCancel={() => setDeleteItemTarget(null)} loading={saving} />
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WOForm({ form, errors, onChange }) {
    return (
        <div className={styles.formGrid}>
            <div className={styles.formFull}>
                <Input id="wo-title" label="Title *" value={form.title}
                    onChange={onChange('title')} error={errors.title} />
            </div>
            <div className={styles.formFull}>
                <Input id="wo-desc" label="Description" value={form.description}
                    onChange={onChange('description')} />
            </div>
            <Select id="wo-priority" label="Priority" value={form.priority}
                onChange={onChange('priority')} options={[
                    { value: 'LOW',    label: 'Low'    },
                    { value: 'NORMAL', label: 'Normal' },
                    { value: 'HIGH',   label: 'High'   },
                    { value: 'URGENT', label: 'Urgent' },
                ]} />
            <Input id="wo-assigned" label="Assigned To" value={form.assigned_to}
                onChange={onChange('assigned_to')} helper="Free-text name or team." />
            <Input id="wo-due" label="Due Date" type="date" value={form.due_date}
                onChange={onChange('due_date')} />
            <div className={styles.formFull}>
                <Input id="wo-notes" label="Notes" value={form.notes}
                    onChange={onChange('notes')} />
            </div>
        </div>
    );
}