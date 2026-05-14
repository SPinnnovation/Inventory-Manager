import api from "./api";

/**
 * All inventory-related API calls, mapped directly to backend endpoints.
 * Base: /api/v1/inventory/
*/

const inventoryService = {
    // ---- Warehouses ----
    getWarehouses: (params) => api.get('/inventory/warehouses/', { params }).then(r => r.data),
    createWarehouse: (data) => api.post('/inventory/warehouses/', data).then(r => r.data),
    updateWarehouse: (id, data) => api.patch(`/inventory/warehouses/${id}/`, data).then(r => r.data),
    deleteWarehouse: (id) => api.delete(`/inventory/warehouses/${id}/`),

    // ---- Floors ----
    getFloors: (params) => api.get('/inventory/floors/', { params }).then(r => r.data),
    createFloor: (data) => api.post('/inventory/floors/', data).then(r => r.data),
    updateFloor: (id, data) => api.patch(`/inventory/floors/${id}/`, data).then(r => r.data),
    deleteFloor: (id) => api.delete(`/inventory/floors/${id}/`),

    // ---- Racks ----
    getRacks: (params) => api.get('/inventory/racks/', { params }).then(r => r.data),
    createRack: (data) => api.post('/inventory/racks/', data).then(r => r.data),
    updateRack: (id, data) => api.patch(`/inventory/racks/${id}/`, data).then(r => r.data),
    deleteRack: (id) => api.delete(`/inventory/racks/${id}/`),

    // ---- Shelves ----
    getShelves: (params) => api.get('/inventory/shelves/', { params }).then(r => r.data),
    createShelf: (data) => api.post('/inventory/shelves/', data).then(r => r.data),
    updateShelf: (id, data) => api.patch(`/inventory/shelves/${id}/`, data).then(r => r.data),
    deleteShelf: (id) => api.delete(`/inventory/shelves/${id}/`),

    // ---- Categories ----
    getCategories: (params) => api.get('/inventory/categories/', { params }).then(r => r.data),
    createCategory: (data) => api.post('/inventory/categories/', data).then(r => r.data),
    updateCategory: (id, data) => api.patch(`/inventory/categories/${id}/`, data).then(r => r.data),
    deleteCategory: (id) => api.delete(`/inventory/categories/${id}/`),

    // ---- Products ----
    getProducts: (params) => api.get('/inventory/products/', { params }).then(r => r.data),
    getProduct: (id) => api.get(`/inventory/products/${id}/`).then(r => r.data),
    createProduct: (data) => api.post('/inventory/products/', data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then(r => r.data),
    updateProduct: (id, data) => api.patch(`/inventory/products/${id}/`, data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then(r => r.data),
    deleteProduct: (id) => api.delete(`/inventory/products/${id}/`),

    // ---- Stock ----
    getStock: (params) => api.get('/inventory/stock/', { params }).then(r => r.data),
    createStock: (data) => api.post('/inventory/stock/', data).then(r => r.data),
    adjustStock: (id, data) => api.post(`/inventory/stock/${id}/adjust/`, data).then(r => r.data),
    deleteStock: (id) => api.delete(`/inventory/stock/${id}/`),

    // ---- Movements (read-only) ----
    getMovements: (params) => api.get('/inventory/movements/', { params }).then(r => r.data),

};

export default inventoryService;