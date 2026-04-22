import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Navigation } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import useUiStore from '../../store/uiStore';
import { locationService } from '../../services/api';
import { getCurrentPosition } from '../../utils/geo';

const emptyForm = {
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_m: 100,
    is_active: true,
};

export default function LocationsPage() {
    const toast = useUiStore((s) => s.toast);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, id: null });
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState({ open: false, id: null });

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await locationService.list();
            setLocations(data.locations || []);
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

    const openEdit = (loc) => {
        setForm({
            name: loc.name,
            address: loc.address || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius_m: loc.radius_m,
            is_active: Boolean(loc.is_active),
        });
        setModal({ open: true, id: loc.id });
    };

    const useCurrentPosition = async () => {
        try {
            const pos = await getCurrentPosition();
            setForm((f) => ({ ...f, latitude: pos.latitude, longitude: pos.longitude }));
            toast.info('Đã dùng toạ độ hiện tại.');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                radius_m: Number(form.radius_m),
            };
            if (modal.id) {
                await locationService.update(modal.id, payload);
                toast.success('Cập nhật địa điểm thành công.');
            } else {
                await locationService.create(payload);
                toast.success('Tạo địa điểm thành công.');
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
            await locationService.remove(confirm.id);
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
                        <h1 className="text-3xl font-extrabold text-gray-900">Địa điểm chấm công</h1>
                        <p className="text-gray-500 text-sm mt-1">Cấu hình các vị trí văn phòng và bán kính cho phép chấm công.</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow"
                    >
                        <Plus className="w-4 h-4" /> Thêm địa điểm
                    </button>
                </header>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                            <tr>
                                <th className="px-4 py-3 text-left">Tên</th>
                                <th className="px-4 py-3 text-left">Địa chỉ</th>
                                <th className="px-4 py-3 text-left">Toạ độ</th>
                                <th className="px-4 py-3 text-left">Bán kính</th>
                                <th className="px-4 py-3 text-left">Trạng thái</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Đang tải...</td>
                                </tr>
                            )}
                            {!loading && locations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chưa có địa điểm nào.</td>
                                </tr>
                            )}
                            {locations.map((l) => (
                                <tr key={l.id} className="border-t border-gray-100">
                                    <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                        {l.name}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{l.address || '—'}</td>
                                    <td className="px-4 py-3 font-mono text-xs">
                                        {Number(l.latitude).toFixed(5)}, {Number(l.longitude).toFixed(5)}
                                    </td>
                                    <td className="px-4 py-3">{l.radius_m}m</td>
                                    <td className="px-4 py-3">
                                        {l.is_active ? (
                                            <span className="text-emerald-600 text-xs font-semibold">● Active</span>
                                        ) : (
                                            <span className="text-gray-400 text-xs font-semibold">● Inactive</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => openEdit(l)}
                                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setConfirm({ open: true, id: l.id })}
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
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
                    >
                        <h3 className="text-lg font-bold text-gray-900">
                            {modal.id ? 'Sửa địa điểm' : 'Thêm địa điểm'}
                        </h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên *</label>
                            <input
                                required
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Địa chỉ</label>
                            <input
                                value={form.address}
                                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Latitude *</label>
                                <input
                                    required
                                    type="number"
                                    step="any"
                                    value={form.latitude}
                                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Longitude *</label>
                                <input
                                    required
                                    type="number"
                                    step="any"
                                    value={form.longitude}
                                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={useCurrentPosition}
                            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                            <Navigation className="w-4 h-4" /> Dùng toạ độ hiện tại
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bán kính (m)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="10000"
                                    value={form.radius_m}
                                    onChange={(e) => setForm((f) => ({ ...f, radius_m: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                />
                            </div>
                            <div className="flex items-end">
                                <label className="inline-flex items-center gap-2 pb-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">Đang hoạt động</span>
                                </label>
                            </div>
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
                title="Xoá địa điểm?"
                message="Thao tác không thể khôi phục."
                onConfirm={handleDelete}
                onCancel={() => setConfirm({ open: false, id: null })}
            />
        </div>
    );
}
