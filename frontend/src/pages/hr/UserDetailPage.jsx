import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Mail, Hash, Building, Briefcase, Clock, User, Calendar, DollarSign, ShieldCheck } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { userService } from '../../services/api';
import useUiStore from '../../store/uiStore';

const formatDate = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};
const formatMoney = (n) => (n || 0).toLocaleString('vi-VN') + 'đ';

export default function UserDetailPage() {
    const { id } = useParams();
    const toast = useUiStore((s) => s.toast);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        userService
            .getById(id)
            .then(({ data }) => setUser(data.user))
            .catch((err) => toast.error(err.response?.data?.message || 'Không tải được thông tin.'))
            .finally(() => setLoading(false));
    }, [id, toast]);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <main className="flex-1 ml-[260px] p-10 text-gray-400">Đang tải...</main>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <main className="flex-1 ml-[260px] p-10 text-red-500">Không tìm thấy nhân viên.</main>
            </div>
        );
    }

    const rows = [
        { icon: Hash, label: 'Mã NV', value: user.employee_code || '—' },
        { icon: Mail, label: 'Email', value: user.email },
        { icon: ShieldCheck, label: 'Role', value: user.role },
        { icon: User, label: 'Giới tính', value: user.gender || '—' },
        { icon: Calendar, label: 'Ngày sinh', value: formatDate(user.birthdate) },
        { icon: Building, label: 'Phòng ban', value: user.department || '—' },
        { icon: Briefcase, label: 'Chức vụ', value: user.position || '—' },
        { icon: Clock, label: 'Ca làm việc', value: user.shift_name || '—' },
        { icon: User, label: 'Quản lý trực tiếp', value: user.manager_name || '—' },
        { icon: DollarSign, label: 'Lương/giờ', value: formatMoney(user.base_hourly_wage) },
        { icon: DollarSign, label: 'Hệ số lương', value: `x${user.salary_multiplier || 1}` },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <Link
                    to="/hr/users"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                </Link>

                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{user.full_name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase">
                                {user.role}
                            </span>
                            {user.is_active ? (
                                <span className="text-emerald-600 text-xs font-semibold">● Hoạt động</span>
                            ) : (
                                <span className="text-gray-400 text-xs font-semibold">● Đã vô hiệu</span>
                            )}
                        </div>
                    </div>
                    <Link
                        to={`/hr/users/${user.id}/edit`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg shadow"
                    >
                        <Pencil className="w-4 h-4" /> Sửa
                    </Link>
                </div>

                <section className="bg-white border border-gray-200 rounded-xl p-6 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {rows.map((r) => (
                            <div key={r.label} className="flex items-start gap-3">
                                <r.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{r.label}</p>
                                    <p className="text-gray-900 font-medium mt-0.5">{r.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
