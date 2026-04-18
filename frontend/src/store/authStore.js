import { create } from 'zustand';

const useAuthStore = create((set) => ({
    token: localStorage.getItem('hris_token') || null,
    user: JSON.parse(localStorage.getItem('hris_user') || 'null'),

    login: (token, user) => {
        localStorage.setItem('hris_token', token);
        localStorage.setItem('hris_user', JSON.stringify(user));
        set({ token, user });
    },

    logout: () => {
        localStorage.removeItem('hris_token');
        localStorage.removeItem('hris_user');
        set({ token: null, user: null });
    },
}));

export default useAuthStore;
