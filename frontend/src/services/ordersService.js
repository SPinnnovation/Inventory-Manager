import api from "./api";

/**
 * All orders-related API calls.
 * Base: /api/v1/orders/
 */
const ordersService = {
    // ---- Purchase Orders ----
    getPurchaseOrders: (params) => api.get('/orders/purchase-orders/', { params }).then(r => r.data),
    getPurchaseOrder: (id) => api.get(`/orders/purchase-orders/${id}/`).then(r => r.data),
    createPurchaseOrder: (data) => api.post('/orders/purchase-orders/', data).then(r => r.data),
    updatePurchaseOrder: (id, data) => api.patch(`/orders/purchase-orders/${id}/`, data).then(r => r.data),
    deletePurchaseOrder: (id) => api.delete(`/orders/purchase-orders/${id}/`),
    issuePurchaseOrder:  (id) => api.post(`/orders/purchase-orders/${id}/issue/`).then(r => r.data),
    cancelPurchaseOrder: (id) => api.post(`/orders/purchase-orders/${id}/cancel/`).then(r => r.data),

    // ---- PO Items ----
    createPurchaseOrderItem: (data) => api.post('/orders/purchase-order-items/', data).then(r => r.data),
    updatePurchaseOrderItem: (id, data) => api.patch(`/orders/purchase-order-items/${id}/`, data).then(r => r.data),
    deletePurchaseOrderItem: (id) => api.delete(`/orders/purchase-order-items/${id}/`),
    receivePurchaseOrderItem: (id, data) => api.post(`/orders/purchase-order-items/${id}/receive/`, data).then(r => r.data),

    // ---- Work Orders ----
    getWorkOrders: (params) => api.get('/orders/work-orders/', { params }).then(r => r.data),
    getWorkOrder: (id) => api.get(`/orders/work-orders/${id}/`).then(r => r.data),
    createWorkOrder: (data) => api.post('/orders/work-orders/', data).then(r => r.data),
    updateWorkOrder: (id, data) => api.patch(`/orders/work-orders/${id}/`, data).then(r => r.data),
    deleteWorkOrder: (id) => api.delete(`/orders/work-orders/${id}/`),
    issueWorkOrder: (id) => api.post(`/orders/work-orders/${id}/issue/`).then(r => r.data),
    completeWorkOrder: (id, data) => api.post(`/orders/work-orders/${id}/complete/`, data).then(r => r.data),
    cancelWorkOrder: (id) => api.post(`/orders/work-orders/${id}/cancel/`).then(r => r.data),

    // ---- WO Items ----
    createWorkOrderItem: (data) => api.post('/orders/work-order-items/', data).then(r => r.data),
    updateWorkOrderItem: (id, data) => api.patch(`/orders/work-order-items/${id}/`, data).then(r => r.data),
    deleteWorkOrderItem: (id) => api.delete(`/orders/work-order-items/${id}/`),
};

export default ordersService;