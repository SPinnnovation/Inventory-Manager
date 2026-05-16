import api from './api';

const notificationService = {
    /**
     * Fetch notifications for the current user.
     * @param {object} [params] - Optional query params: { is_read: false, page: 1, ... }
     */
    getNotifications: (params = {}) =>
        api.get('/notifications/', { params }).then((r) => r.data),

    /**
     * Mark a single notification as read.
     * @param {number} id - Notification DB id
     */
    markRead: (id) =>
        api.patch(`/notifications/${id}/`, { is_read: true }).then((r) => r.data),

    /**
     * Mark all notifications for the current user as read.
     * Returns { marked_read: N }.
     */
    markAllRead: () =>
        api.post('/notifications/mark-all-read/').then((r) => r.data),
};

export default notificationService;
