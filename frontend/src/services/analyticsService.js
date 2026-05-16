import api from './api';

const analyticsService = {
    getDashboardSummary: () =>
        api.get('/analytics/dashboard/summary/').then(r => r.data),
};

export default analyticsService;
