import axiosClient from './axiosClient';

export const authService = {
    login: (email, password, rememberMe = false) =>
        axiosClient.post('/auth/login', { email, password, rememberMe }),

    refresh: (refreshToken) =>
        axiosClient.post('/auth/refresh', { refreshToken }),

    logout: (refreshToken) =>
        axiosClient.post('/auth/logout', { refreshToken }),

    forgotPassword: (email) =>
        axiosClient.post('/auth/forgot-password', { email }),

    resetPassword: (token, password) =>
        axiosClient.post('/auth/reset-password', { token, password }),

    changePassword: (oldPassword, newPassword) =>
        axiosClient.post('/auth/change-password', { oldPassword, newPassword }),

    getMe: () => axiosClient.get('/auth/me'),
};

export const attendanceService = {
    getMyAttendance: (month, year) =>
        axiosClient.get('/attendances/me', { params: { month, year } }),

    getAllAttendance: (params) =>
        axiosClient.get('/attendances', { params }),

    syncPunchLogs: (logs) =>
        axiosClient.post('/attendance/sync', logs),

    triggerProcess: () =>
        axiosClient.post('/attendance/rollup'),

    punch: (payload) =>
        axiosClient.post('/attendance/punch', payload),

    updateAttendance: (id, data) =>
        axiosClient.put(`/attendances/${id}`, data),
};

export const userService = {
    list: (params) =>
        axiosClient.get('/users', { params }),

    getById: (id) =>
        axiosClient.get(`/users/${id}`),

    create: (data) =>
        axiosClient.post('/users', data),

    update: (id, data) =>
        axiosClient.put(`/users/${id}`, data),

    remove: (id) =>
        axiosClient.delete(`/users/${id}`),

    updateMe: (data) =>
        axiosClient.patch('/users/me', data),

    // Back-compat aliases
    getAllUsers: (params) =>
        axiosClient.get('/users', { params }),
    getUserById: (id) =>
        axiosClient.get(`/users/${id}`),
    createUser: (data) =>
        axiosClient.post('/users', data),
    updateUser: (id, data) =>
        axiosClient.put(`/users/${id}`, data),
};

export const departmentService = {
    list: () => axiosClient.get('/departments'),
    create: (data) => axiosClient.post('/departments', data),
    update: (id, data) => axiosClient.put(`/departments/${id}`, data),
    remove: (id) => axiosClient.delete(`/departments/${id}`),
};

export const positionService = {
    list: () => axiosClient.get('/positions'),
};

export const shiftService = {
    list: () => axiosClient.get('/shifts'),
    create: (data) => axiosClient.post('/shifts', data),
    update: (id, data) => axiosClient.put(`/shifts/${id}`, data),
    remove: (id) => axiosClient.delete(`/shifts/${id}`),
};

export const locationService = {
    list: (params) => axiosClient.get('/locations', { params }),
    create: (data) => axiosClient.post('/locations', data),
    update: (id, data) => axiosClient.put(`/locations/${id}`, data),
    remove: (id) => axiosClient.delete(`/locations/${id}`),
};

export const requestService = {
    list: (params) => axiosClient.get('/requests', { params }),
    pendingCount: () => axiosClient.get('/requests/pending-count'),
    create: (data) => axiosClient.post('/requests', data),
    approve: (id) => axiosClient.patch(`/requests/${id}/approve`),
    reject: (id, reject_reason) =>
        axiosClient.patch(`/requests/${id}/reject`, { reject_reason }),
    cancel: (id) => axiosClient.delete(`/requests/${id}`),
};

export const payrollService = {
    list: (params) => axiosClient.get('/payrolls', { params }),
    getById: (id) => axiosClient.get(`/payrolls/${id}`),
    generate: (data) => axiosClient.post('/payrolls/generate', data),
    update: (id, data) => axiosClient.put(`/payrolls/${id}`, data),
    managerApprove: (id) =>
        axiosClient.patch(`/payrolls/${id}/manager-approve`),
    employeeConfirm: (id) =>
        axiosClient.patch(`/payrolls/${id}/employee-confirm`),
    exportOne: (id, format = 'xlsx') =>
        axiosClient.get(`/payrolls/${id}/export`, {
            params: { format },
            responseType: 'blob',
        }),
    exportList: (params) =>
        axiosClient.get('/payrolls/export', {
            params,
            responseType: 'blob',
        }),
};

export const reportService = {
    list: (params) => axiosClient.get('/reports', { params }),
    getById: (id) => axiosClient.get(`/reports/${id}`),
    generate: (data) => axiosClient.post('/reports/generate', data),
    download: (id) =>
        axiosClient.get(`/reports/${id}/download`, { responseType: 'blob' }),
};

export const auditService = {
    list: (params) => axiosClient.get('/audit-logs', { params }),
    actions: () => axiosClient.get('/audit-logs/actions'),
};

export const dashboardService = {
    adminOverview: () => axiosClient.get('/dashboard/admin'),
};

// ── Helper: trigger download từ axios blob response ──
export const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};
