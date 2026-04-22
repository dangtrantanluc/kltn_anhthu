import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Plus,
    X,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Check,
    Ban,
    Trash2,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import ConfirmDialog from '../components/common/ConfirmDialog';
import useAuthStore from '../store/authStore';
import useUiStore from '../store/uiStore';
import { requestService } from '../services/api';

const REQUEST_TYPE_LABELS = {
    LEAVE_REQUEST: 'Nghỉ phép',
    MISSING_PUNCH: 'Bổ sung chấm công',
};

const formatDate = (v) =>
    v ? new Date(v).toLocaleDateString('vi-VN') : '—';

const statusBadge = (status) => {
    if (status === 'APPROVED') {
        return (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
            </span>
        );
    }
    if (status === 'REJECTED') {
        return (
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-red-200">
                <XCircle className="w-3.5 h-3.5" /> Từ chối
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Chờ duyệt
        </span>
    );
};

export default function RequestsView() {
    const user = useAuthStore((s) => s.user);
    const toast = useUiStore((s) => s.toast);
    const canReview = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role);

    const [activeTab, setActiveTab] = useState('mine'); // mine | pending
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    const [confirmCancel, setConfirmCancel] = useState({ open: false, id: null });
    const [rejectModal, setRejectModal] = useState({ open: false, id: null });
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const scope = activeTab === 'pending' ? 'pending' : 'me';
            const { data } = await requestService.list({ scope, limit: 100 });
            setItems(data.items || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được dữ liệu.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, toast]);

    useEffect(() => {
        load();
    }, [load]);

    const columns = useMemo(() => {
        const base = [
            { key: 'target_date', label: 'Ngày áp dụng' },
            { key: 'request_type', label: 'Loại đơn' },
            { key: 'detail', label: 'Chi tiết' },
            { key: 'reason', label: 'Lý do' },
            { key: 'status', label: 'Trạng thái' },
        ];
        if (activeTab === 'pending') {
            base.splice(1, 0, { key: 'employee', label: 'Nhân viên' });
            base.push({ key: 'actions', label: 'Thao tác' });
        } else {
            base.push({ key: 'cancel', label: '' });
        }
        return base;
    }, [activeTab]);

    const approve = async (id) => {
        setProcessing(true);
        try {
            await requestService.approve(id);
            toast.success('Đã duyệt đơn.');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Duyệt đơn thất bại.');
        } finally {
            setProcessing(false);
        }
    };

    const submitReject = async () => {
        if (rejectReason.trim().length < 3) {
            toast.error('Lý do từ chối phải có ít nhất 3 ký tự.');
            return;
        }
        setProcessing(true);
        try {
            await requestService.reject(rejectModal.id, rejectReason.trim());
            toast.success('Đã từ chối đơn.');
            setRejectModal({ open: false, id: null });
            setRejectReason('');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Từ chối đơn thất bại.');
        } finally {
            setProcessing(false);
        }
    };

    const cancel = async () => {
        try {
            await requestService.cancel(confirmCancel.id);
            toast.success('Đã huỷ đơn.');
            setConfirmCancel({ open: false, id: null });
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Huỷ đơn thất bại.');
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Quản lý Đơn từ
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm font-medium">
                            Tạo và theo dõi đơn xin nghỉ phép, bổ sung công.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Tạo đơn mới
                    </button>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-gray-200/50 rounded-lg mb-4 w-fit">
                    <TabButton active={activeTab === 'mine'} onClick={() => setActiveTab('mine')}>
                        Đơn của tôi
                    </TabButton>
                    {canReview && (
                        <TabButton
                            active={activeTab === 'pending'}
                            onClick={() => setActiveTab('pending')}
                        >
                            Cần phê duyệt
                        </TabButton>
                    )}
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {columns.map((c) => (
                                    <th
                                        key={c.key}
                                        className="py-3.5 px-4 text-gray-500 font-semibold text-xs uppercase"
                                    >
                                        {c.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={columns.length} className="py-10 text-center text-gray-400">
                                        Đang tải...
                                    </td>
                                </tr>
                            )}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="py-16 text-center text-gray-400">
                                        <FileText className="w-10 h-10 mx-auto mb-3 stroke-[1.5] text-gray-300" />
                                        {activeTab === 'pending' ? 'Không có đơn chờ duyệt.' : 'Bạn chưa có đơn nào.'}
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                items.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/50">
                                        <td className="py-3 px-4 font-medium text-gray-900">
                                            {formatDate(r.target_date)}
                                        </td>
                                        {activeTab === 'pending' && (
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-gray-900">{r.full_name}</p>
                                                <p className="text-gray-500 text-xs">
                                                    {r.employee_code} · {r.department || '—'}
                                                </p>
                                            </td>
                                        )}
                                        <td className="py-3 px-4">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium border border-indigo-100">
                                                {REQUEST_TYPE_LABELS[r.request_type]}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 text-xs">
                                            {r.request_type === 'LEAVE_REQUEST'
                                                ? r.leave_type === 'PAID'
                                                    ? 'Nghỉ hưởng lương'
                                                    : 'Nghỉ không lương'
                                                : `IN: ${r.requested_check_in || '—'} / OUT: ${r.requested_check_out || '—'}`}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate" title={r.reason}>
                                            {r.reason}
                                        </td>
                                        <td className="py-3 px-4">
                                            {statusBadge(r.status)}
                                            {r.status === 'REJECTED' && r.reject_reason && (
                                                <p className="text-xs text-red-500 mt-1 italic max-w-[200px] truncate">
                                                    Lý do: {r.reject_reason}
                                                </p>
                                            )}
                                        </td>
                                        {activeTab === 'pending' ? (
                                            <td className="py-3 px-4">
                                                <div className="flex gap-1">
                                                    <button
                                                        disabled={processing}
                                                        onClick={() => approve(r.id)}
                                                        className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded"
                                                        title="Duyệt"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        disabled={processing}
                                                        onClick={() => setRejectModal({ open: true, id: r.id })}
                                                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded"
                                                        title="Từ chối"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        ) : (
                                            <td className="py-3 px-4 text-right">
                                                {r.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => setConfirmCancel({ open: true, id: r.id })}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title="Huỷ đơn"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Create modal */}
            {showCreate && (
                <CreateRequestModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => {
                        setShowCreate(false);
                        setActiveTab('mine');
                        load();
                    }}
                />
            )}

            {/* Reject modal */}
            {rejectModal.open && (
                <div
                    className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setRejectModal({ open: false, id: null })}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Từ chối đơn</h3>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Lý do từ chối *
                        </label>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            placeholder="Vui lòng nhập lý do..."
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setRejectModal({ open: false, id: null })}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={submitReject}
                                disabled={processing}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg shadow"
                            >
                                {processing ? 'Đang xử lý...' : 'Từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmCancel.open}
                title="Huỷ đơn?"
                message="Đơn đang chờ duyệt sẽ bị xoá hoàn toàn."
                onConfirm={cancel}
                onCancel={() => setConfirmCancel({ open: false, id: null })}
            />
        </div>
    );
}

function TabButton({ active, children, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
        >
            {children}
        </button>
    );
}

function CreateRequestModal({ onClose, onCreated }) {
    const toast = useUiStore((s) => s.toast);
    const today = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        request_type: 'LEAVE_REQUEST',
        leave_type: 'PAID',
        target_date: today,
        requested_check_in: '',
        requested_check_out: '',
        reason: '',
    });
    const [saving, setSaving] = useState(false);

    const isLeave = form.request_type === 'LEAVE_REQUEST';

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await requestService.create({
                ...form,
                leave_type: isLeave ? form.leave_type : null,
                requested_check_in: isLeave ? null : form.requested_check_in || null,
                requested_check_out: isLeave ? null : form.requested_check_out || null,
            });
            toast.success('Đã gửi đơn thành công.');
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gửi đơn thất bại.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Tạo Đơn từ mới</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loại đơn</label>
                    <select
                        value={form.request_type}
                        onChange={(e) => setForm((f) => ({ ...f, request_type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    >
                        <option value="LEAVE_REQUEST">Xin nghỉ phép</option>
                        <option value="MISSING_PUNCH">Bổ sung chấm công</option>
                    </select>
                </div>

                {isLeave && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loại nghỉ</label>
                        <select
                            value={form.leave_type}
                            onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        >
                            <option value="PAID">Hưởng lương</option>
                            <option value="UNPAID">Không lương</option>
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày áp dụng</label>
                    <input
                        type="date"
                        required
                        value={form.target_date}
                        onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                </div>

                {!isLeave && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check-in</label>
                            <input
                                type="time"
                                value={form.requested_check_in}
                                onChange={(e) => setForm((f) => ({ ...f, requested_check_in: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check-out</label>
                            <input
                                type="time"
                                value={form.requested_check_out}
                                onChange={(e) => setForm((f) => ({ ...f, requested_check_out: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lý do *</label>
                    <textarea
                        required
                        value={form.reason}
                        onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                        rows={3}
                        minLength={5}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        placeholder="Nhập lý do (ít nhất 5 ký tự)..."
                    />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50"
                    >
                        Huỷ
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm"
                    >
                        {saving ? 'Đang gửi...' : 'Gửi đơn'}
                    </button>
                </div>
            </form>
        </div>
    );
}
