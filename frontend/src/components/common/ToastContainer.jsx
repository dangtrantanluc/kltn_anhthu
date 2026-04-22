import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import useUiStore from '../../store/uiStore';

const typeConfig = {
    success: { icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    error: { icon: XCircle, cls: 'bg-red-50 border-red-200 text-red-800' },
    info: { icon: Info, cls: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
};

export default function ToastContainer() {
    const { toasts, removeToast } = useUiStore();

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-2 w-80">
            {toasts.map((t) => {
                const { icon: Icon, cls } = typeConfig[t.type] || typeConfig.info;
                return (
                    <div
                        key={t.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-sm ${cls}`}
                    >
                        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm flex-1">{t.message}</p>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="text-current opacity-60 hover:opacity-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
