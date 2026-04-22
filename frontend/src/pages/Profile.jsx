import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/layout/Sidebar';
import useAuthStore from '../store/authStore';
import useUiStore from '../store/uiStore';
import { authService, userService } from '../services/api';
import {
    UserSquare2,
    Briefcase,
    Mail,
    Building,
    Hash,
    ShieldCheck,
    DollarSign,
    Clock,
    Pencil,
    Save,
    X,
    KeyRound,
} from 'lucide-react';
import { GENDERS } from './hr/constants';

const toDateInput = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

export default function Profile() {
    const { t } = useTranslation();
    const { user, setUser, logout } = useAuthStore();
    const toast = useUiStore((s) => s.toast);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ full_name: '', gender: '', birthdate: '' });
    const [saving, setSaving] = useState(false);
    const [passwordModal, setPasswordModal] = useState(false);
    const [detail, setDetail] = useState(null);

    // Load đầy đủ thông tin từ /auth/me
    useEffect(() => {
        authService
            .getMe()
            .then(({ data }) => {
                setDetail(data.user);
                setForm({
                    full_name: data.user.full_name || '',
                    gender: data.user.gender || '',
                    birthdate: toDateInput(data.user.birthdate),
                });
            })
            .catch(() => { });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await userService.updateMe(form);
            setDetail(data.user);
            setUser({
                ...user,
                fullName: data.user.full_name,
            });
            toast.success('Cập nhật hồ sơ thành công.');
            setEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Cập nhật thất bại.');
        } finally {
            setSaving(false);
        }
    };

    const hourlyRate = detail?.base_hourly_wage || 0;
    const multiplier = detail?.salary_multiplier || 1;

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <div className="mb-8 flex items-end justify-between">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {t('profile.title')}
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPasswordModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <KeyRound className="w-4 h-4" />
                            Đổi mật khẩu
                        </button>
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow"
                            >
                                <Pencil className="w-4 h-4" />
                                Sửa hồ sơ
                            </button>
                        ) : (
                            <button
                                onClick={() => setEditing(false)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <X className="w-4 h-4" /> Huỷ
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-w-4xl bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                    <div className="px-8 pb-8 relative">
                        <div className="absolute -top-16 left-8">
                            <div className="w-32 h-32 rounded-2xl bg-white p-2 shadow-sm border border-gray-100">
                                <div className="w-full h-full bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                                    <UserSquare2 className="w-16 h-16 text-indigo-400" strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>
                        <div className="pt-20 pb-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {detail?.full_name || user?.fullName || 'User'}
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 uppercase border border-indigo-100">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    {user?.role || 'USER'}
                                </span>
                                <span className="text-gray-500 text-sm font-medium">· Active</span>
                            </div>
                        </div>

                        {editing ? (
                            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <EditField label="Họ và tên">
                                    <input
                                        value={form.full_name}
                                        onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                                        required
                                        minLength={2}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                </EditField>
                                <EditField label="Giới tính">
                                    <select
                                        value={form.gender}
                                        onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    >
                                        <option value="">—</option>
                                        {GENDERS.map((g) => (
                                            <option key={g.value} value={g.value}>{g.label}</option>
                                        ))}
                                    </select>
                                </EditField>
                                <EditField label="Ngày sinh">
                                    <input
                                        type="date"
                                        value={form.birthdate}
                                        onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                </EditField>
                                <div className="md:col-span-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                <ReadField icon={Hash} label={t('profile.employee_code')} value={detail?.employee_code || 'EMP-N/A'} />
                                <ReadField icon={Mail} label={t('profile.email')} value={detail?.email} />
                                <ReadField icon={Building} label={t('profile.department')} value={detail?.department || '—'} />
                                <ReadField icon={Briefcase} label={t('profile.position')} value={detail?.position || '—'} />
                                <ReadField icon={Clock} label={t('profile.shift')} value={detail?.shift_name || '—'} />
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <DollarSign className="w-4 h-4" /> Payroll Info
                                    </label>
                                    <div className="flex gap-4 text-sm">
                                        <span>
                                            <span className="text-gray-500">Base: </span>
                                            <b>{Number(hourlyRate).toLocaleString('vi-VN')}đ/h</b>
                                        </span>
                                        <span>
                                            <span className="text-gray-500">Multiplier: </span>
                                            <b>x{multiplier}</b>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ChangePasswordModal
                open={passwordModal}
                onClose={() => setPasswordModal(false)}
                onSuccess={() => {
                    toast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
                    setTimeout(() => logout(), 800);
                }}
            />
        </div>
    );
}

function ReadField({ icon: Icon, label, value }) {
    return (
        <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <Icon className="w-4 h-4" /> {label}
            </label>
            <p className="text-gray-900 font-medium">{value || '—'}</p>
        </div>
    );
}

function EditField({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            {children}
        </div>
    );
}

function ChangePasswordModal({ open, onClose, onSuccess }) {
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setForm({ oldPassword: '', newPassword: '', confirm: '' });
            setErr('');
        }
    }, [open]);

    if (!open) return null;

    const submit = async (e) => {
        e.preventDefault();
        setErr('');
        if (form.newPassword.length < 8) return setErr('Mật khẩu mới phải có ít nhất 8 ký tự.');
        if (form.newPassword !== form.confirm) return setErr('Hai mật khẩu không khớp.');
        setLoading(true);
        try {
            await authService.changePassword(form.oldPassword, form.newPassword);
            onSuccess?.();
            onClose();
        } catch (e) {
            setErr(e.response?.data?.message || 'Đổi mật khẩu thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Đổi mật khẩu</h3>
                {err && (
                    <div className="px-3 py-2 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                        {err}
                    </div>
                )}
                <div className="space-y-3">
                    <input
                        type="password"
                        placeholder="Mật khẩu hiện tại"
                        value={form.oldPassword}
                        onChange={(e) => setForm((f) => ({ ...f, oldPassword: e.target.value }))}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="Mật khẩu mới (≥ 8 ký tự)"
                        value={form.newPassword}
                        onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="Nhập lại mật khẩu mới"
                        value={form.confirm}
                        onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Huỷ
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow"
                    >
                        {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
                    </button>
                </div>
            </form>
        </div>
    );
}
