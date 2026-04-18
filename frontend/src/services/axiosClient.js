import axios from 'axios';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor ──────────────────────────────────────────────────────
// Attach Bearer token from localStorage to every request
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('hris_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────────────────
// On 401 Unauthorized → clear auth state and redirect to /login
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('hris_token');
            localStorage.removeItem('hris_user');
            // Redirect to login — use window.location to avoid React Router import issues
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
