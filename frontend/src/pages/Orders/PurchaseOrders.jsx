import React, { useState, useEffect, useCallback } from 'react'
import styles from './styles/PurchaseOrders.module.css';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';
import ordersService from '../../services/ordersService';
import inventoryService from '../../services/inventoryService';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Pagination from '../../components/common/Pagination/Pagination';
import Modal from '../../components/common/Modal/Modal';
import Input from '../../components/common/Input/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';


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

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';

        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } // Helper function to format date strings in a more readable format for display in the UI. If the dateStr is falsy (e.g. null or empty), we return an em dash to indicate that there is no date. Otherwise, we create a Date object from the date string and use toLocaleDateString with options to format it as "day month year" (e.g. "25 December 2024"). We use 'en-GB' locale to get the desired date format, but this could be adjusted based on user preferences or localization requirements.

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
    }   // After performing an action that modifies a purchase order or its items, we want to refresh the details of that purchase order to show the updated information. This function fetches the latest data for the specified purchase order ID and updates both the detailPO state (if we're currently viewing that PO's details) and the list of POs in state to reflect any changes. We catch errors but don't show a notification here since this is usually called after we've already shown a success notification for the action, and if this fails it's not critical to notify the user since they just need to know that their action succeeded and the details will eventually update when they navigate back to the list or refresh the page.

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
    } // When creating or editing a purchase order item, we need to show dropdowns for selecting the product and destination shelf. This function loads the options for those dropdowns from the backend. We fetch all active products and shelves with a large page size to get them all in one request, but in a real application we might want to implement search-as-you-type for these dropdowns if there are a large number of products or shelves to avoid performance issues. We also handle loading state and errors for this operation.

    
    // ----------------------------------- PO CRUD -----------------------------------

    const openCreate = () => {
        setPOForm(EMPTY_PO);
        setErrors({});
        setShowCreate(true);
    } // When the user clicks the "Add Purchase Order" button, we want to open the create modal with an empty form. This function resets the PO form state to the initial empty values, clears any previous errors, and shows the create modal.

    const openEdit = (po) => {
        setPOForm({
            supplier_name: po.supplier_name || '',
            supplier_reference: po.supplier_reference || '',
            supplier_contact: po.supplier_contact || '',
            supplier_email: po.supplier_email || '',
            supplier_phone: po.supplier_phone || '',
            expected_delivery_date: po.expected_delivery_date || '',
            notes: po.notes || '',
        });

        setErrors({});
        setEditTarget(po);
    }   // When the user clicks the "Edit" button for a purchase order, we want to open the edit modal with the form pre-filled with the existing data for that purchase order. This function takes the selected purchase order as an argument, populates the PO form state with its data (using empty strings as fallbacks for any missing fields), clears any previous errors, and sets the editTarget state to the selected purchase order to show the edit modal.

    const handleSavePO = async () => {
        const errs = {};

        if (!poForm.supplier_name.trim()) errs.supplier_name = 'Required.'; // Currently the only required field for a purchase order is the supplier name, but we could add more validation here as needed (e.g. validate that expected_delivery_date is a valid date in the future, validate email format for supplier_email, etc.)

        if (Object.keys(errs).length) { setErrors(errs); return; } // If there are validation errors, we set the errors state to show those errors in the form and return early to prevent submitting invalid data to the backend.

        setSaving(true);

        try {
            const payload = { ...poForm, expected_delivery_date: poForm.expected_delivery_date || null }; // The backend expects null for no date, but our form uses an empty string for that since it's easier to work with in the input field, so we convert it here before sending the data to the backend. We construct the payload for the API request by taking all the fields from the poForm state, and specifically converting expected_delivery_date to null if it's an empty string.

            if (editTarget) {
                await ordersService.updatePurchaseOrder(editTarget.id, payload); // If we're editing an existing purchase order (i.e. editTarget is set), we call the updatePurchaseOrder service function with the ID of the purchase order being edited and the payload we just constructed to send a PATCH request to the backend to update that purchase order with the new data from the form.

                notify.success('Purchase order updated.');

                setEditTarget(null);
            } else {
                await ordersService.createPurchaseOrder(payload);   // If we're creating a new purchase order (i.e. editTarget is not set), we call the createPurchaseOrder service function with the payload to send a POST request to the backend to create a new purchase order with the data from the form.

                notify.success('Purchase order created.');

                setShowCreate(false);
            }

            fetchPOs(); // After creating or updating a purchase order, we refresh the list of purchase orders to show the changes.

        } catch (e) { notify.error(e.message); }

        finally { setSaving(false); }

    };  // When the user submits the create or edit form for a purchase order, we want to validate the input, send the data to the backend to create or update the purchase order, and then refresh the list of purchase orders to show the changes. This function first validates the form input (currently only checking that supplier_name is not empty, but we could add more validation as needed), and if there are validation errors it sets the errors state and returns early to show those errors in the form. If validation passes, it sets saving to true to disable the form and show a loading indicator on the submit button. Then it constructs the payload for the API request, converting an empty expected_delivery_date to null since that's what the backend expects for no date. It checks if we're editing an existing purchase order (editTarget is set) or creating a new one, and calls the appropriate service function. After a successful response, it shows a success notification, closes the modal, and refreshes the list of purchase orders. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the form.


    const handleIssue = async () => {
        setSaving(true);

        try {
            const updated = await ordersService.issuePurchaseOrder(confirmIssue.id); // When the user confirms that they want to issue a purchase order, we want to send a request to the backend to change the status of that purchase order to "issued". This function sets saving to true to disable the buttons and show a loading indicator while the request is in progress. It then calls the issuePurchaseOrder service function with the ID of the purchase order being issued, which sends a POST request to the backend to perform that action. If the request is successful, it shows a success notification, closes the confirmation dialog, and updates the list of purchase orders in state with the updated data returned from the backend. If we're currently viewing the details of that purchase order (detailPO), it also updates that state with the new data. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the buttons.

            notify.success(`${confirmIssue.po_number} issued.`);

            setConfirmIssue(null);

            setPOs(prev => prev.map(p => p.id === updated.id ? updated : p)); // After successfully issuing the purchase order, we want to update the list of purchase orders in state to reflect the new status and any other changes returned from the backend. We use the functional form of setPOs to get the latest state, and map over the list of purchase orders to replace the old version of the issued purchase order with the updated version returned from the backend (matching by ID). This way we ensure that our UI reflects the most up-to-date information for that purchase order without needing to refetch the entire list from the backend.

            if (detailPO?.id === updated.id) setDetailPO(updated); // If we're currently viewing the details of the purchase order that was just issued, we also want to update that state with the new data returned from the backend to reflect the changes in the details view. We check if detailPO is set and if its ID matches the ID of the updated purchase order, and if so we update detailPO with the new data. This ensures that if the user is viewing the details of a purchase order and issues it, they will see the updated status and any other changes immediately in the details view without needing to navigate away and back or refresh the page.

        } catch (e) { notify.error(e.message); }

        finally { setSaving(false); }
    }; // When the user confirms that they want to issue a purchase order, we want to send a request to the backend to change the status of that purchase order to "issued". This function sets saving to true to disable the buttons and show a loading indicator while the request is in progress. It then calls the issuePurchaseOrder service function with the ID of the purchase order being issued, which sends a POST request to the backend to perform that action. If the request is successful, it shows a success notification, closes the confirmation dialog, and updates the list of purchase orders in state with the updated data returned from the backend. If we're currently viewing the details of that purchase order (detailPO), it also updates that state with the new data. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the buttons.

    const handleCancelPO = async () => {
        setSaving(true);

        try {
            const updated = await ordersService.cancelPurchaseOrder(confirmCancel.id); // When the user confirms that they want to cancel a purchase order, we want to send a request to the backend to change the status of that purchase order to "cancelled". This function sets saving to true to disable the buttons and show a loading indicator while the request is in progress. It then calls the cancelPurchaseOrder service function with the ID of the purchase order being cancelled, which sends a POST request to the backend to perform that action. If the request is successful, it shows a success notification, closes the confirmation dialog, and updates the list of purchase orders in state with the updated data returned from the backend. If we're currently viewing the details of that purchase order (detailPO), it also updates that state with the new data. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the buttons.

            notify.success(`${confirmCancel.po_number} cancelled.`);

            setConfirmCancel(null);

            setPOs(prev => prev.map(p => p.id === updated.id ? updated : p));   // After successfully cancelling the purchase order, we want to update the list of purchase orders in state to reflect the new status and any other changes returned from the backend. We use the functional form of setPOs to get the latest state, and map over the list of purchase orders to replace the old version of the cancelled purchase order with the updated version returned from the backend (matching by ID). This way we ensure that our UI reflects the most up-to-date information for that purchase order without needing to refetch the entire list from the backend.

            if (detailPO?.id === updated.id) setDetailPO(updated); // If we're currently viewing the details of the purchase order that was just cancelled, we also want to update that state with the new data returned from the backend to reflect the changes in the details view. We check if detailPO is set and if its ID matches the ID of the updated purchase order, and if so we update detailPO with the new data. This ensures that if the user is viewing the details of a purchase order and cancels it, they will see the updated status and any other changes immediately in the details view without needing to navigate away and back or refresh the page.

        } catch (e) { notify.error(e.message); }

        finally { setSaving(false); }
    }; // When the user confirms that they want to cancel a purchase order, we want to send a request to the backend to change the status of that purchase order to "cancelled". This function sets saving to true to disable the buttons and show a loading indicator while the request is in progress. It then calls the cancelPurchaseOrder service function with the ID of the purchase order being cancelled, which sends a POST request to the backend to perform that action. If the request is successful, it shows a success notification, closes the confirmation dialog, and updates the list of purchase orders in state with the updated data returned from the backend. If we're currently viewing the details of that purchase order (detailPO), it also updates that state with the new data. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the buttons.

    const handleDeletePO = async () => {
        setSaving(true);

        try {
            await ordersService.deletePurchaseOrder(deleteTarget.id); // When the user confirms that they want to delete a purchase order, we want to send a request to the backend to delete that purchase order. This function sets saving to true to disable the buttons and show a loading indicator while the request is in progress. It then calls the deletePurchaseOrder service function with the ID of the purchase order being deleted, which sends a DELETE request to the backend to perform that action. If the request is successful, it shows a success notification, closes the confirmation dialog, and refreshes the list of purchase orders by calling fetchPOs() to get the updated list from the backend. If we're currently viewing the details of that purchase order (detailPO), it also clears that state since that purchase order has been deleted. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the buttons.

            notify.success('Purchase order deleted.');
            
            setDeleteTarget(null);

            if (detailPO?.id === deleteTarget.id) setDetailPO(null);    // If we're currently viewing the details of the purchase order that was just deleted, we want to clear that state since that purchase order no longer exists. We check if detailPO is set and if its ID matches the ID of the deleted purchase order, and if so we set detailPO to null. This ensures that if the user is viewing the details of a purchase order and deletes it, they will be taken back to the list view since the details they were viewing no longer exist.

            fetchPOs(); // Refresh the list of purchase orders by calling fetchPOs() to get the updated list from the backend.

        } catch (e) { notify.error(e.message); }

        finally { setSaving(false); }
    }; // When the user confirms that they want to delete a purchase order, we want to send a request to the backend to delete that purchase order. This function sets saving to true to disable the buttons and show a loading indicator while the request is in progress. It then calls the deletePurchaseOrder service function with the ID of the purchase order being deleted, which sends a DELETE request to the backend to perform that action. If the request is successful, it shows a success notification, closes the confirmation dialog, and refreshes the list of purchase orders by calling fetchPOs() to get the updated list from the backend. If we're currently viewing the details of that purchase order (detailPO), it also clears that state since that purchase order has been deleted. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the buttons.

    // ----------------------------------- End PO CRUD -----------------------------------


    // --------------------------------------- ITEM CRUD ---------------------------------------

    const openAddItem = (po) => { 
        setAddItemPO(po); 
        setItemForm(EMPTY_ITEM); 
        setErrors({}); 
        loadOptions(); 
    }; // When the user clicks the "Add Item" button for a purchase order, we want to open the add item modal with an empty form and load the options for the product and shelf dropdowns. This function takes the selected purchase order as an argument, sets that as the addItemPO state to show the add item modal, resets the item form state to the initial empty values, clears any previous errors, and calls loadOptions() to fetch the options for the product and shelf dropdowns from the backend.

    const openEditItem = (item) => {
        setItemForm({
            product_id: String(item.product?.id || ''),
            destination_location_id: String(item.destination_location?.id || ''),
            quantity_ordered: String(item.quantity_ordered),
            unit_price: String(item.unit_price),
            notes: item.notes || '',
        });

        setErrors({});
        setEditItem(item);
        loadOptions();
    };  // When the user clicks the "Edit" button for a purchase order item, we want to open the edit item modal with the form pre-filled with the existing data for that item and load the options for the product and shelf dropdowns. This function takes the selected item as an argument, populates the item form state with its data (converting values to strings since they will be used in input fields, and using empty strings as fallbacks for any missing fields), clears any previous errors, sets the editItem state to the selected item to show the edit item modal, and calls loadOptions() to fetch the options for the product and shelf dropdowns from the backend.


    const handleSaveItem = async () => {
        const errs = {};

        if (!itemForm.product_id)  errs.product_id  = 'Required.'; // Currently the only required fields for a purchase order item are the product and quantity ordered, but we could add more validation here as needed (e.g. validate that quantity_ordered is a positive integer, validate that unit_price is a positive number, etc.)

        if (!itemForm.quantity_ordered || parseInt(itemForm.quantity_ordered, 10) < 1) errs.quantity_ordered = 'Minimum 1.'; // We check if quantity_ordered is not empty and if it's a positive integer. We use parseInt to convert the string value from the form to an integer, and check if it's less than 1 to enforce that it must be at least 1. If this validation fails, we add an error message for the quantity_ordered field.

        if (!itemForm.unit_price || parseFloat(itemForm.unit_price) <= 0) errs.unit_price = 'Must be > 0.'; // We check if unit_price is not empty and if it's a positive number. We use parseFloat to convert the string value from the form to a floating-point number, and check if it's less than or equal to 0 to enforce that it must be greater than 0. If this validation fails, we add an error message for the unit_price field.

        if (Object.keys(errs).length) { setErrors(errs); return; } // If there are validation errors, we set the errors state to show those errors in the form and return early to prevent submitting invalid data to the backend.

        setSaving(true);

        try {
            if (editItem) {
                await ordersService.updatePurchaseOrderItem(editItem.id, {
                    destination_location_id: itemForm.destination_location_id ? Number(itemForm.destination_location_id) : null,
                    quantity_ordered: parseInt(itemForm.quantity_ordered, 10),
                    unit_price: itemForm.unit_price,
                    notes: itemForm.notes,
                }); // If we're editing an existing item (i.e. editItem is set), we call the updatePurchaseOrderItem service function with the ID of the item being edited and the payload we construct from the form data to send a PATCH request to the backend to update that item with the new data from the form. Note that we don't allow changing the product of an existing item since that would essentially be a different item, so we only include the fields that can be updated (destination_location_id, quantity_ordered, unit_price, and notes) in the payload.

                notify.success('Item updated.');

                setEditItem(null);
            } else {
                await ordersService.createPurchaseOrderItem({
                    order: addItemPO.id,
                    product_id: Number(itemForm.product_id),
                    destination_location_id: itemForm.destination_location_id ? Number(itemForm.destination_location_id) : null,
                    quantity_ordered: parseInt(itemForm.quantity_ordered, 10),
                    unit_price: itemForm.unit_price,
                    notes: itemForm.notes,
                }); // If we're creating a new item (i.e. editItem is not set), we call the createPurchaseOrderItem service function with the payload we construct from the form data to send a POST request to the backend to create a new item linked to the current purchase order. The payload includes the ID of the purchase order (addItemPO.id) to link the item to that purchase order, as well as the product_id, destination_location_id, quantity_ordered, unit_price, and notes from the form.

                notify.success('Item added.');

                setAddItemPO(null);
            }

            if (detailPO) refreshDetail(detailPO.id); // After creating or updating an item, we want to refresh the details of the current purchase order to show the updated list of items and any changes to the order totals. We check if detailPO is set (i.e. if we're currently viewing the details of a purchase order), and if so we call refreshDetail with the ID of that purchase order to fetch the latest data from the backend and update the state.

            fetchPOs(); // We also want to refresh the list of all purchase orders to reflect any changes in the order totals or status.
        } catch (e) { notify.error(e.message); }

        finally { setSaving(false); }
    }; // When the user submits the create or edit form for a purchase order item, we want to validate the input, send the data to the backend to create or update the item, and then refresh the details of the purchase order to show the changes. This function first validates the form input (checking that product_id is selected, quantity_ordered is a positive integer, and unit_price is a positive number), and if there are validation errors it sets the errors state and returns early to show those errors in the form. If validation passes, it sets saving to true to disable the form and show a loading indicator on the submit button. Then it constructs the payload for the API request based on whether we're editing an existing item or creating a new one. If editing, it sends a PATCH request with the updated fields; if creating, it sends a POST request with all necessary fields including linking it to the current purchase order. After a successful response, it shows a success notification, closes the modal, refreshes the details of the current purchase order to show the updated list of items and any changes to totals or status, and also refreshes the list of all purchase orders. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the form.


    const handleReceive = async () => {
        const qty = parseInt(receiveQty, 10);

        if (!receiveQty || isNaN(qty) || qty < 1) { setErrors({ qty: 'Enter a positive number.' }); return; }   // We validate the receive quantity to ensure that it is not empty, is a valid number, and is a positive integer. If any of these conditions fail, we set an error message for the qty field and return early to show that error in the form and prevent submitting invalid data to the backend.

        setSaving(true);
        try {
            await ordersService.receivePurchaseOrderItem(receiveItem.id, { quantity: qty }); // We call the receivePurchaseOrderItem service function with the ID of the item being received and the quantity to receive, which sends a POST request to the backend to mark that quantity of the item as received. The backend will handle updating the received quantity, changing the status of the item and purchase order if necessary, and performing any other related logic.

            notify.success(`Received ${qty} unit(s).`);

            setReceiveItem(null);

            setReceiveQty('');

            if (detailPO) refreshDetail(detailPO.id);

            fetchPOs();
        } catch (e) { notify.error(e.message); }

        finally { setSaving(false); }
    }; // When the user submits the receive form for a purchase order item, we want to validate the input, send the data to the backend to mark that quantity of the item as received, and then refresh the details of the purchase order to show the changes. This function first validates the receive quantity to ensure that it is not empty, is a valid number, and is a positive integer. If validation fails, it sets an error message for the qty field and returns early to show that error in the form. If validation passes, it sets saving to true to disable the form and show a loading indicator on the submit button. Then it calls the receivePurchaseOrderItem service function with the ID of the item being received and the quantity to receive, which sends a POST request to the backend to perform that action. After a successful response, it shows a success notification with the quantity received, closes the receive modal, clears the receive quantity from state, refreshes the details of the current purchase order if it's open to show updated quantities and status, and also refreshes the list of all purchase orders. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the form.

    const handleDeleteItem = async () => {
        setSaving(true);

        try {
            await ordersService.deletePurchaseOrderItem(deleteItemTarget.id); // We call the deletePurchaseOrderItem service function with the ID of the item being deleted, which sends a DELETE request to the backend to remove that item. The backend will handle deleting the item and updating any related data, such as totals or status of the purchase order.

            notify.success('Item removed.');

            setDeleteItemTarget(null);

            if (detailPO) refreshDetail(detailPO.id);

            fetchPOs();
        } catch (e) { notify.error(e.message); }

        finally { setSaving(false); }
    }; // When the user confirms that they want to delete a purchase order item, we want to send a request to the backend to delete that item, and then refresh the details of the purchase order to show the changes. This function sets saving to true to disable the buttons and show a loading indicator while the request is in progress. It then calls the deletePurchaseOrderItem service function with the ID of the item being deleted, which sends a DELETE request to the backend to perform that action. If the request is successful, it shows a success notification, closes the confirmation dialog, and refreshes the details of the current purchase order if it's open to show the updated list of items and any changes to totals or status. It also refreshes the list of all purchase orders. If there's an error during the API call, it shows an error notification with the message from the error. Finally, it sets saving back to false to re-enable the buttons.

    
    const pof = k => e => { setPOForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })); };  // This is a helper function that returns an onChange handler for the purchase order form fields. It takes a key (the name of the field in the form state) and returns a function that takes an event (from the input field), updates the corresponding field in the poForm state with the new value from the input, and also clears any error message for that field in the errors state. This allows us to easily create onChange handlers for each input field in the purchase order form by calling pof('field_name').

    const itf = k => e => { setItemForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })); }; // This is a similar helper function for the purchase order item form fields. It takes a key and returns an onChange handler that updates the corresponding field in the itemForm state and clears any error message for that field in the errors state. We can use this to create onChange handlers for each input field in the purchase order item form by calling itf('field_name').



  return (
    <div className={styles.page}>
        <PageHeader 
            title="Purchase Orders"
            subtitle = "Manage your purchase orders, track their status, and receive items from suppliers."
            action = {canWrite}
            actionLabel = "+ Add Purchase Order"
            onAction = {openCreate}
        />

        {/* Toolbar */}
        <div className={styles.toolbar}>
            <input 
                className={styles.search}
                placeholder='Search PO number or supplier..'
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select 
                className={styles.filterSelect} 
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <label className={styles.toggleLabel}>
                <input 
                    type="checkbox" 
                    checked={overdueOnly}
                    onChange={e => { setOverdueOnly(e.target.checked); setPage(1); }} 
                />
                Overdue only
            </label>
        </div>

        {/* Table */}
        <div className={styles.card}>
            {loading ? (
                <div className={styles.spinnerWarp}>
                    <LoadingSpinner />
                </div>
            ) : pos.length === 0 ? (
                <EmptyState 
                    title="No purchase orders" 
                    message="Create your first PO to get started." 
                    icon="📋"
                />
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>PO Number</th><th>Supplier</th><th>Status</th>
                                <th>Items</th><th>Total Value</th><th>Expected</th><th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {pos.map(po => (
                                <tr key={po.id}>
                                    <td>
                                        <span className={styles.orderId}>{po.po_number}</span>
                                        {po.is_overdue && <span className={styles.overdueTag}>OVERDUE</span>}
                                    </td>

                                    <td>
                                        <div className={styles.primaryText}>{po.supplier_name}</div>
                                        {po.supplier_reference && <div className={styles.muted}>{po.supplier_reference}</div>}
                                    </td>

                                    <td>
                                        <Badge variant={STATUS_VARIANT[po.status] ?? 'neutral'}>
                                            {STATUS_LABEL[po.status] ?? po.status}
                                        </Badge>
                                    </td>

                                    <td>{po.items?.length ?? 0}</td>

                                    <td className={styles.mono}>
                                        {po.total_value != null ? `₹${parseFloat(po.total_value).toFixed(2)}` : '—'}
                                    </td>

                                    <td className={styles.muted}>{formatDate(po.expected_delivery_date)}</td>

                                    <td>
                                        <div className={styles.actionBtns}>
                                            <Button 
                                                size="sm" 
                                                variant="ghost"
                                                onClick={() => setDetailPO(po)}
                                            >
                                                Items
                                            </Button>

                                            {canWrite && po.status === 'DRAFT' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => openEdit(po)}
                                                >
                                                    Edit
                                                </Button>
                                            )}

                                            {canWrite && po.status === 'DRAFT' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="primary"
                                                    onClick={() => setConfirmIssue(po)}
                                                >
                                                    Issue
                                                </Button>
                                            )}
                                            {canWrite && !['COMPLETED', 'CANCELLED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                                                <Button 
                                                    size="sm" 
                                                    variant="danger"
                                                    onClick={() => setConfirmCancel(po)}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                            {isAdmin && po.status === 'DRAFT' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="danger"
                                                    onClick={() => setDeleteTarget(po)}
                                                >
                                                    Delete
                                                </Button>
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

        {/* ── Create PO ── */}
        {showCreate && (
            <Modal 
                title="Create Purchase Order" 
                onClose={() => setShowCreate(false)} 
                size="lg"
            >
                <POForm 
                    form={poForm} 
                    errors={errors} 
                    onChange={pof} 
                />

                <div className={styles.formActions}>
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button variant="primary" loading={saving} onClick={handleSavePO}>Create PO</Button>
                </div>
            </Modal>
        )}

        {/* ── Edit PO ── */}
        {editTarget && (
            <Modal 
                title={`Edit ${editTarget.po_number}`} 
                onClose={() => setEditTarget(null)} 
                size="lg"
            >
                <POForm form={poForm} errors={errors} onChange={pof} />

                <div className={styles.formActions}>
                    <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
                    <Button variant="primary" loading={saving} onClick={handleSavePO}>Save Changes</Button>
                </div>
            </Modal>
        )}

        {/* ── Items Detail ── */}
        {detailPO && (
            <Modal 
                title={`${detailPO.po_number} — Line Items`} 
                onClose={() => setDetailPO(null)} 
                size="xl"
            >
                <div className={styles.metaGrid}>
                    <MetaCell 
                        label="Supplier"    
                        value={detailPO.supplier_name} 
                    />

                    <MetaCell 
                        label="Status"      
                        value={
                            <Badge variant={STATUS_VARIANT[detailPO.status] ?? 'neutral'}>
                                {STATUS_LABEL[detailPO.status] ?? detailPO.status}
                            </Badge>
                        } 
                    />

                    <MetaCell 
                        label="Total Value" 
                        value={
                            detailPO.total_value != null
                                ? <span className={styles.mono}>₹{parseFloat(detailPO.total_value).toFixed(2)}</span>
                                : '—'
                        } 
                    />

                    <MetaCell 
                        label="Expected"    
                        value={formatDate(detailPO.expected_delivery_date)} 
                    />
                </div>

                <div className={styles.itemsSectionHeader}>
                    <h3 className={styles.sectionTitle}>Items</h3>

                    {canWrite && ['DRAFT', 'ISSUED'].includes(detailPO.status) && (
                        <Button size="sm" onClick={() => openAddItem(detailPO)}>+ Add Item</Button>
                    )}
                </div>

                {!detailPO.items?.length ? (
                    <EmptyState title="No items" message="Add line items to this purchase order." icon="📦" />
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product</th><th>Destination Shelf</th>
                                    <th>Ordered</th><th>Received</th><th>Outstanding</th>
                                    <th>Unit Price</th><th>Line Total</th><th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {detailPO.items.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className={styles.primaryText}>{item.product?.name}</div>
                                            <div className={styles.muted}>{item.product?.sku}</div>
                                        </td>

                                        <td className={styles.muted}>{item.destination_location?.full_path || '—'}</td>

                                        <td>{item.quantity_ordered}</td>

                                        <td>
                                            {item.quantity_received}
                                            {item.is_fully_received && <span className={styles.checkmark}> ✓</span>}
                                        </td>

                                        <td>{item.quantity_outstanding}</td>

                                        <td className={styles.mono}>₹{parseFloat(item.unit_price).toFixed(2)}</td>

                                        <td className={styles.mono}>₹{parseFloat(item.line_total ?? 0).toFixed(2)}</td>

                                        <td>
                                            <div className={styles.actionBtns}>
                                                {canWrite && ['DRAFT', 'ISSUED'].includes(detailPO.status) && (
                                                    <Button size="sm" variant="outline"
                                                        onClick={() => openEditItem(item)}>Edit</Button>
                                                )}
                                                {canReceive && ['ISSUED', 'PARTIALLY_RECEIVED'].includes(detailPO.status) && !item.is_fully_received && (
                                                    <Button size="sm" variant="primary"
                                                        onClick={() => { setReceiveItem(item); setReceiveQty(''); setErrors({}); }}>
                                                        Receive
                                                    </Button>
                                                )}
                                                {isAdmin && detailPO.status === 'DRAFT' && (
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
        {(addItemPO || editItem) && (
            <Modal
                title={editItem ? 'Edit Line Item' : `Add Item to ${addItemPO?.po_number}`}
                onClose={() => { setAddItemPO(null); setEditItem(null); }}
                size="lg"
            >
                {loadingOpts ? <div className={styles.spinnerWrap}><LoadingSpinner /></div> : (
                    <>
                        <div className={styles.formGrid}>
                            {!editItem && (
                                <div className={styles.formFull}>
                                    <Select 
                                        id="item-product" 
                                        label="Product *"
                                        options={products} placeholder="Select product…"
                                        value={itemForm.product_id} onChange={itf('product_id')}
                                        error={errors.product_id} 
                                    />
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
                                <Select 
                                    id="item-dest" 
                                    label="Destination Shelf (optional)"
                                    options={shelves} placeholder="Select shelf…"
                                    value={itemForm.destination_location_id}
                                    onChange={itf('destination_location_id')} 
                                />
                            </div>

                            <Input 
                                id="item-qty" 
                                label="Quantity Ordered *" 
                                type="number" 
                                min="1"
                                value={itemForm.quantity_ordered} onChange={itf('quantity_ordered')}
                                error={errors.quantity_ordered} 
                            />

                            <Input 
                                id="item-price" 
                                label="Unit Price *" 
                                type="number" 
                                min="0.01" 
                                step="0.01"
                                value={itemForm.unit_price} onChange={itf('unit_price')}
                                error={errors.unit_price} 
                            />

                            <div className={styles.formFull}>
                                <Input 
                                    id="item-notes" 
                                    label="Notes"
                                    value={itemForm.notes} onChange={itf('notes')} 
                                />
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <Button variant="ghost" onClick={() => { setAddItemPO(null); setEditItem(null); }}>Cancel</Button>
                            <Button variant="primary" loading={saving} onClick={handleSaveItem}>
                                {editItem ? 'Save Changes' : 'Add Item'}
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        )}


        {/* ── Receive ── */}
        {receiveItem && (
            <Modal 
                title={`Receive: ${receiveItem.product?.name}`}
                onClose={() => { setReceiveItem(null); setErrors({}); }} 
                size="sm"
            >
                <div className={styles.receiveCard}>
                    <div className={styles.receiveRow}><span className={styles.metaLabel}>SKU</span>{receiveItem.product?.sku}</div>
                    <div className={styles.receiveRow}><span className={styles.metaLabel}>Destination</span>{receiveItem.destination_location?.full_path || <span className={styles.warn}>Not set — update item first</span>}</div>
                    <div className={styles.receiveRow}><span className={styles.metaLabel}>Outstanding</span>{receiveItem.quantity_outstanding}</div>
                </div>

                <Input 
                    id="recv-qty" 
                    label="Quantity Receiving *" 
                    type="number"
                    min="1" 
                    max={receiveItem.quantity_outstanding}
                    value={receiveQty}
                    onChange={e => { setReceiveQty(e.target.value); setErrors({}); }}
                    error={errors.qty}
                    helper={`Max: ${receiveItem.quantity_outstanding}`}
                />

                <div className={styles.formActions}>
                    <Button variant="ghost" onClick={() => { setReceiveItem(null); setErrors({}); }}>Cancel</Button>
                    <Button variant="primary" loading={saving} onClick={handleReceive}>Confirm Receipt</Button>
                </div>
            </Modal>
        )}

        {/* ── Confirms ── */}
        {confirmIssue && (
            <ConfirmDialog 
                title="Issue Purchase Order"
                message={`Issue "${confirmIssue.po_number}" to ${confirmIssue.supplier_name}? This locks the order for editing.`}
                variant="primary" onConfirm={handleIssue} onCancel={() => setConfirmIssue(null)} loading={saving} 
            />
        )}
        {confirmCancel && (
            <ConfirmDialog 
                title="Cancel Purchase Order"
                message={`Cancel "${confirmCancel.po_number}"? This cannot be undone.`}
                onConfirm={handleCancelPO} onCancel={() => setConfirmCancel(null)} loading={saving} 
            />
        )}
        {deleteTarget && (
            <ConfirmDialog 
                title="Delete Purchase Order"
                message={`Permanently delete "${deleteTarget.po_number}"?`}
                onConfirm={handleDeletePO} onCancel={() => setDeleteTarget(null)} loading={saving} 
            />
        )}
        {deleteItemTarget && (
            <ConfirmDialog 
                title="Remove Item"
                message={`Remove "${deleteItemTarget.product?.name}" from the order?`}
                onConfirm={handleDeleteItem} onCancel={() => setDeleteItemTarget(null)} loading={saving} 
            />
        )}

    </div>
  )
}


// ── Sub-components ────────────────────────────────────────────────────────────

function POForm({ form, errors, onChange }) {
    return (
        <div className={styles.formGrid}>
            <Input 
                id="sup-name"    
                label="Supplier Name *"    
                value={form.supplier_name}    
                onChange={onChange('supplier_name')}    
                error={errors.supplier_name} 
            />

            <Input 
                id="sup-ref"     
                label="Supplier Reference" 
                value={form.supplier_reference} 
                onChange={onChange('supplier_reference')} 
            />

            <Input 
                id="sup-contact" 
                label="Contact Person"     
                value={form.supplier_contact}  
                onChange={onChange('supplier_contact')} 
            />

            <Input 
                id="sup-email"   
                label="Email" 
                type="email" 
                value={form.supplier_email}    
                onChange={onChange('supplier_email')}   
                error={errors.supplier_email} 
            />

            <Input 
                id="sup-phone"   
                label="Phone"              
                value={form.supplier_phone}    
                onChange={onChange('supplier_phone')} 
            />

            <Input 
                id="exp-date"    
                label="Expected Delivery"  
                value={form.expected_delivery_date} 
                onChange={onChange('expected_delivery_date')} 
                type="date" 
            />

            <div className={styles.formFull}>
                <Input id="po-notes" label="Notes" value={form.notes} onChange={onChange('notes')} />
            </div>
        </div>
    );
}

function MetaCell({ label, value }) {
    return (
        <div>
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{label}</span>
            <span>{value}</span>
        </div>
    );
}

export default PurchaseOrders