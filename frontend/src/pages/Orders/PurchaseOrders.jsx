import React, { useState, useEffect, useCallback } from 'react'
import styles from './styles/PurchaseOrders.module.css';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';
import ordersService from '../../services/ordersService';


// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ISSUED', label: 'Issued' },
    { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
];  // For filtering in the list view, not all possible statuses since some are only relevant for certain order types (e.g. DRAFT isn't relevant for work orders since they get created in ISSUED status right away)

const STATUS_VARIANT = {
    DRAFT: 'neutral',
    ISSUED: 'info',
    PARTIALLY_RECEIVED: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'error',
}; // For styling badges, not all possible statuses since some are only relevant for certain order types (e.g. DRAFT isn't relevant for work orders since they get created in ISSUED status right away)

const STATUS_LABEL = {
    DRAFT: 'Draft',
    ISSUED: 'Issued',
    PARTIALLY_RECEIVED: 'Partially Received',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
}; // For displaying status in the UI, not all possible statuses since some are only relevant for certain order types (e.g. DRAFT isn't relevant for work orders since they get created in ISSUED status right away)

const EMPTY_PO = {
    supplier_name: '', supplier_reference: '', supplier_contact: '',
    supplier_email: '', supplier_phone: '', expected_delivery_date: '', notes: '',
}; // Initial empty state for creating a new purchase order, not all fields are required so we can leave them blank. We don't include items here since they are created separately and linked to the PO via its ID, so we start with an empty list of items and add them after the PO is created and we have its ID.

const EMPTY_ITEM = {
    product_id: '', destination_location_id: '', quantity_ordered: '', unit_price: '', notes: '',
};  // Initial empty state for creating a new purchase order item, not all fields are required so we can leave them blank. We don't include the purchase_order_id here since we will set that when we create the item and link it to the PO, so we just start with an empty value and fill it in later.


const PurchaseOrders = () => {

    const { user } = useAuth();
    const { notify } = useNotification();
    const canWrite = ['admin', 'floor_manager'].includes(user?.role);
    const canReceive = ['admin', 'floor_manager', 'staff'].includes(user?.role);
    const isAdmin = user?.role === 'admin';

    // List
    const [pos, setPOs] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [overdueOnly, setOverdueOnly] = useState(false);

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState(null);   // PO being edited
    const [detailPO, setDetailPO] = useState(null);   // PO whose items are shown
    const [addItemPO, setAddItemPO] = useState(null);   // PO to add item to
    const [editItem, setEditItem] = useState(null);   // POItem being edited
    const [receiveItem, setReceiveItem] = useState(null);   // POItem to receive
    const [confirmIssue, setConfirmIssue] = useState(null);
    const [confirmCancel, setConfirmCancel] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteItemTarget, setDeleteItemTarget] = useState(null);

    // Forms
    const [poForm, setPOForm] = useState(EMPTY_PO);
    const [itemForm, setItemForm] = useState(EMPTY_ITEM);
    const [receiveQty, setReceiveQty] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [products, setProducts] = useState([]);
    const [shelves, setShelves] = useState([]);
    const [loadingOpts, setLoadingOpts] = useState(false);    

    // Fetch
    const fetchPOs = useCallback(() => {
        setLoading(true);

        const params = { page, page_size: 20 } // We want to fetch 20 items per page, this is a common default and allows for pagination controls to be more useful. The backend will enforce a maximum page size to prevent abuse, so even if we set a very high number here the backend will limit it to a reasonable amount.
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        if (overdueOnly) params.is_overdue = true;

        // Get purchase orders with the specified filters and pagination, then update state with the results. We handle both paginated and non-paginated responses for flexibility, but ideally the backend should always return paginated responses for list endpoints to ensure consistent behavior and prevent performance issues with large datasets. We also catch any errors and show a notification, and finally set loading to false regardless of success or failure to stop showing the loading indicator.
        ordersService.getPurchaseOrders(params)
        .then(d => { setPOs(d.results ?? d); setCount(d.count ?? (d.results ?? d).length); })
        .catch(() => notify.error('Failed to load purchase orders.'))
        .finally(() => setLoading(false));  

    }, [search, statusFilter, overdueOnly, page]); // Re-run this function whenever the search term, status filter, overdue filter, or page number changes to fetch the appropriate data from the backend based on the current filters and pagination.

    useEffect(() => { fetchPOs(); }, [fetchPOs]); // Fetch purchase orders when the component mounts and whenever the fetchPOs function changes (which happens when its dependencies change, i.e. when filters or pagination change)

    const refreshDetails = (id) => {
        ordersService.getPurchaseOrder(id)
        .then(updated => {
            setDetailPO(updated);
            setPOs(prev => prev.map(p => p.id === updated.id ? updated : p));
        })
        .catch(() => {});        
    }

  return (
    <div className={styles.page}>
        <PageHeader 
            title="Purchase Orders"
            subtitle = "Manage your purchase orders, track their status, and receive items from suppliers."
            action = {() => {}}
            actionLabel = "+ Add Purchase Order"
            onAction = {() => {}}
        />
    </div>
  )
}

export default PurchaseOrders