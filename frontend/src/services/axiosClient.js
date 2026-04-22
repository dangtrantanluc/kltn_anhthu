import axios from 'axios';

const STORAGE_KEYS = {
    access: 'hris_token',
    refresh: 'hris_refresh_token',
    user: 'hris_user',
};

const getAccess = () => localStorage.getItem(STORAGE_KEYS.access);
const getRefresh = () => localStorage.getItem(STORAGE_KEYS.refresh);
const setAccess = (t) => localStorage.setItem(STORAGE_KEYS.access, t);
const setRefresh = (t) => localStorage.setItem(STORAGE_KEYS.refresh, t);
const clearAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.access);
    localStorage.removeItem(STORAGE_KEYS.refresh);
    localStorage.removeItem(STORAGE_KEYS.user);
};

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// ── Request: gắn Bearer token ────────────────────────────
axiosClient.interceptors.request.use(
    (config) => {
        const token = getAccess();
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response: auto-refresh khi 401 ───────────────────────
let isRefreshing = false;
let pendingQueue = []; // [{ resolve, reject, config }]

const flushQueue = (err, token = null) => {
    pendingQueue.forEach(({ resolve, reject, config }) => {
        if (err) return reject(err);
        config.headers['Authorization'] = `Bearer ${token}`;
        resolve(axiosClient(config));
    });
    pendingQueue = [];
};

const PUBLIC_PATHS = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const status = error.response?.status;
        const path = original?.url || '';

        // Không thử refresh cho public endpoints
        if (status !== 401 || original._retry || PUBLIC_PATHS.some((p) => path.endsWith(p))) {
            return Promise.reject(error);
        }
        const refreshToken = getRefresh();
        if (!refreshToken) {
            clearAuth();
            if (window.location.pathname !== '/login') window.location.href = '/login';
            return Promise.reject(error);
        }

        original._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push({ resolve, reject, config: original });
            });
        }

        isRefreshing = true;
        try {
            const { data } = await axios.post(
                `${axiosClient.defaults.baseURL}/auth/refresh`,
                { refreshToken }
            );
            setAccess(data.accessToken);
            if (data.refreshToken) setRefresh(data.refreshToken);
            flushQueue(null, data.accessToken);
            original.headers['Authorization'] = `Bearer ${data.accessToken}`;
            return axiosClient(original);
        } catch (refreshErr) {
            flushQueue(refreshErr, null);
            clearAuth();
            if (window.location.pathname !== '/login') window.location.href = '/login';
            return Promise.reject(refreshErr);
        } finally {
            isRefreshing = false;
        }
    }
);

export { STORAGE_KEYS, clearAuth };
export default axiosClient;
