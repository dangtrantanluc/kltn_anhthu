import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — modal xác nhận
 *   <ConfirmDialog
 *     open={open}
 *     title="Xoá nhân viên?"
 *     message="Thao tác này sẽ vô hiệu hoá nhân viên. Bạn có chắc chắn?"
 *     onConfirm={handleDelete}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export default function ConfirmDialog({
    open,
    title = 'Xác nhận',
    message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
    confirmText = 'Xác nhận',
    cancelText = 'Huỷ',
    variant = 'danger',
    onConfirm,
    onCancel,
    loading = false,
}) {
    if (!open) return null;

    const variantCls = {
        danger: 'bg-red-600 hover:bg-red-500',
        primary: 'bg-indigo-600 hover:bg-indigo-500',
    }[variant];

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-600 mt-2">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 ${variantCls}`}
                    >
                        {loading ? 'Đang xử lý...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
