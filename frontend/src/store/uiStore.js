import { create } from 'zustand';

let nextId = 1;

const useUiStore = create((set, get) => ({
    toasts: [], // [{ id, type, message }]

    pushToast: (message, type = 'info', duration = 3500) => {
        const id = nextId++;
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, duration);
        return id;
    },

    removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    toast: {
        success: (msg) => get().pushToast(msg, 'success'),
        error: (msg) => get().pushToast(msg, 'error'),
        info: (msg) => get().pushToast(msg, 'info'),
    },
}));

export default useUiStore;
