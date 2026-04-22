import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import useUiStore from '../../store/uiStore';
import { shiftService } from '../../services/api';

const emptyForm = { shift_name: '', start_time: '08:00', end_time: '17:00', allowed_late_mins: 0 };

export default function ShiftsPage() {
    const toast = useUiStore((s) => s.toast);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, id: null });
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState({ open: false, id: null });

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await shiftService.list();
            setShifts(data.shifts || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        setForm(emptyForm);
        setModal({ open: true, id: null });
    };

    const openEdit = (s) => {
        setForm({
            shift_name: s.shift_name,
            start_time: (s.start_time || '08:00').slice(0, 5),
            end_time: (s.end_time || '17:00').slice(0, 5),
            allowed_late_mins: s.allowed_late_mins || 0,
        });
        setModal({ open: true, id: s.id });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, allowed_late_mins: Number(form.allowed_late_mins) };
            if (modal.id) {
                await shiftService.update(modal.id, payload);
                toast.success('Cập nhật ca làm việc thành công.');
            } else {
                await shiftService.create(payload);
                toast.success('Tạo ca làm việc thành công.');
            }
            setModal({ open: false, id: null });
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lưu thất bại.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await shiftService.remove(confirm.id);
            toast.success('Đã xoá.');
            setConfirm({ open: false, id: null });
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xoá thất bại.');
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Ca làm việc</h1>
                        <p className="text-gray-500 text-sm mt-1">Cấu hình giờ vào/ra cho mỗi ca.</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow"
                    >
                        <Plus className="w-4 h-4" /> Thêm ca
                    </button>
                </header>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                            <tr>
                                <th className="px-4 py-3 text-left">Tên ca</th>
                                <th className="px-4 py-3 text-left">Bắt đầu</th>
                                <th className="px-4 py-3 text-left">Kết thúc</th>
                                <th className="px-4 py-3 text-left">Cho phép muộn (phút)</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
                            )}
                            {!loading && shifts.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Chưa có ca nào.</td></tr>
                            )}
                            {shifts.map((s) => (
                                <tr key={s.id} className="border-t border-gray-100">
                                    <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-indigo-500" />
                                        {s.shift_name}
                                    </td>
                                    <td className="px-4 py-3">{(s.start_time || '').slice(0, 5)}</td>
                                    <td className="px-4 py-3">{(s.end_time || '').slice(0, 5)}</td>
                                    <td className="px-4 py-3">{s.allowed_late_mins || 0}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => openEdit(s)}
                                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setConfirm({ open: true, id: s.id })}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {modal.open && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setModal({ open: false, id: null })}>
                    <form
                        onSubmit={handleSubmit}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
                    >
                        <h3 className="text-lg font-bold text-gray-900">
                            {modal.id ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}
                        </h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên ca *</label>
                            <input
                                required
                                value={form.shift_name}
                                onChange={(e) => setForm((f) => ({ ...f, shift_name: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bắt đầu</label>
                                <input
                                    type="time"
                                    required
                                    value={form.start_time}
                                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kết thúc</label>
                                <input
                                    type="time"
                                    required
                                    value={form.end_time}
                                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cho phép muộn (phút)</label>
                            <input
                                type="number"
                                min="0"
                                max="240"
                                value={form.allowed_late_mins}
                                onChange={(e) => setForm((f) => ({ ...f, allowed_late_mins: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setModal({ open: false, id: null })}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow"
                            >
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ConfirmDialog
                open={confirm.open}
                title="Xoá ca làm việc?"
                message="Ca đang được dùng bởi nhân viên sẽ không thể xoá."
                onConfirm={handleDelete}
                onCancel={() => setConfirm({ open: false, id: null })}
            />
        </div>
    );
}
