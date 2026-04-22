import { create } from 'zustand';
import { STORAGE_KEYS, clearAuth } from '../services/axiosClient';

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
    } catch {
        return null;
    }
};

const useAuthStore = create((set) => ({
    token: localStorage.getItem(STORAGE_KEYS.access) || null,
    refreshToken: localStorage.getItem(STORAGE_KEYS.refresh) || null,
    user: readUser(),

    // login(accessToken, refreshToken, user)
    login: (accessToken, refreshToken, user) => {
        localStorage.setItem(STORAGE_KEYS.access, accessToken);
        if (refreshToken) localStorage.setItem(STORAGE_KEYS.refresh, refreshToken);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        set({ token: accessToken, refreshToken: refreshToken || null, user });
    },

    setUser: (user) => {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        set({ user });
    },

    logout: () => {
        clearAuth();
        set({ token: null, refreshToken: null, user: null });
    },
}));

export default useAuthStore;
