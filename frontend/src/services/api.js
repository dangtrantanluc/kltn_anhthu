import axiosClient from './axiosClient';

export const authService = {
    login: (email, password) =>
        axiosClient.post('/auth/login', { email, password }),

    getMe: () =>
        axiosClient.get('/auth/me'),
};

export const attendanceService = {
    getMyAttendance: (month, year) =>
        axiosClient.get('/attendances/me', { params: { month, year } }),

    getAllAttendance: (params) =>
        axiosClient.get('/attendances', { params }),

    syncPunchLogs: (logs) =>
        axiosClient.post('/attendance/sync', logs),

    triggerProcess: () =>
        axiosClient.post('/attendance/process'),
};

export const userService = {
    getAllUsers: () =>
        axiosClient.get('/users'),

    getUserById: (id) =>
        axiosClient.get(`/users/${id}`),

    createUser: (data) =>
        axiosClient.post('/users', data),

    updateUser: (id, data) =>
        axiosClient.put(`/users/${id}`, data),
};

export const leaveService = {
    getLeaveRequests: () =>
        axiosClient.get('/leave'),

    submitLeave: (data) =>
        axiosClient.post('/leave', data),

    approveLeave: (id, status) =>
        axiosClient.put(`/leave/${id}/approve`, { status }),
};
