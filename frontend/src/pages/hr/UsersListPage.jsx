import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import useUiStore from '../../store/uiStore';
import useDebounce from '../../hooks/useDebounce';
import { userService, departmentService } from '../../services/api';
import { ROLES } from './constants';

const PAGE_SIZE = 20;

export default function UsersListPage() {
    const toast = useUiStore((s) => s.toast);

    const [q, setQ] = useState('');
    const debouncedQ = useDebounce(q, 350);
    const [page, setPage] = useState(1);
    const [role, setRole] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [isActive, setIsActive] = useState('true');

    const [data, setData] = useState({ items: [], total: 0 });
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [confirm, setConfirm] = useState({ open: false, user: null, loading: false });

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(data.total / PAGE_SIZE)),
        [data.total]
    );

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: PAGE_SIZE,
                q: debouncedQ || undefined,
                role: role || undefined,
                department_id: departmentId || undefined,
                is_active: isActive || undefined,
            };
            const { data } = await userService.list(params);
            setData({ items: data.items || [], total: data.total || 0 });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được danh sách.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedQ, role, departmentId, isActive, toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        departmentService
            .list()
            .then((res) => setDepartments(res.data.departments || []))
            .catch(() => { });
    }, []);

    useEffect(() => {
        setPage(1);
    }, [debouncedQ, role, departmentId, isActive]);

    const handleDelete = async () => {
        setConfirm((c) => ({ ...c, loading: true }));
        try {
            await userService.remove(confirm.user.id);
            toast.success(`Đã vô hiệu hoá ${confirm.user.full_name}.`);
            setConfirm({ open: false, user: null, loading: false });
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xoá thất bại.');
            setConfirm((c) => ({ ...c, loading: false }));
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Quản lý nhân sự</h1>
                        <p className="text-gray-500 text-sm mt-1">Danh sách toàn bộ nhân viên của hệ thống.</p>
                    </div>
                    <Link
                        to="/hr/users/new"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow"
                    >
                        <Plus className="w-4 h-4" /> Thêm nhân viên
                    </Link>
                </header>

                {/* Filters */}
                <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative md:col-span-2">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Tìm theo tên, email, mã NV..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                        />
                    </div>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    >
                        <option value="">— Tất cả role —</option>
                        {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    >
                        <option value="">— Tất cả phòng ban —</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <select
                        value={isActive}
                        onChange={(e) => setIsActive(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm md:col-span-1"
                    >
                        <option value="true">Đang hoạt động</option>
                        <option value="false">Đã vô hiệu hoá</option>
                        <option value="">Tất cả trạng thái</option>
                    </select>
                </section>

                {/* Table */}
                <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                            <tr>
                                <th className="px-4 py-3 text-left">Mã NV</th>
                                <th className="px-4 py-3 text-left">Họ tên</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">Phòng ban</th>
                                <th className="px-4 py-3 text-left">Chức vụ</th>
                                <th className="px-4 py-3 text-left">Role</th>
                                <th className="px-4 py-3 text-left">Trạng thái</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                                        Đang tải...
                                    </td>
                                </tr>
                            )}
                            {!loading && data.items.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                                        Không có dữ liệu phù hợp.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                data.items.map((u) => (
                                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                                        <td className="px-4 py-3 font-mono text-xs">{u.employee_code || '—'}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">{u.full_name}</td>
                                        <td className="px-4 py-3 text-gray-700">{u.email}</td>
                                        <td className="px-4 py-3">{u.department || '—'}</td>
                                        <td className="px-4 py-3">{u.position || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.is_active ? (
                                                <span className="text-emerald-600 text-xs font-semibold">● Hoạt động</span>
                                            ) : (
                                                <span className="text-gray-400 text-xs font-semibold">● Đã vô hiệu</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-end">
                                                <Link
                                                    to={`/hr/users/${u.id}`}
                                                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                    title="Xem"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    to={`/hr/users/${u.id}/edit`}
                                                    className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                                                    title="Sửa"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                                {u.is_active && (
                                                    <button
                                                        onClick={() => setConfirm({ open: true, user: u, loading: false })}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title="Vô hiệu hoá"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                        <p className="text-gray-500">
                            Tổng: <b>{data.total}</b> · Trang {page}/{totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <ConfirmDialog
                open={confirm.open}
                title="Vô hiệu hoá nhân viên?"
                message={
                    confirm.user
                        ? `Thao tác sẽ đặt "${confirm.user.full_name}" sang trạng thái không hoạt động. Dữ liệu chấm công và lương vẫn được giữ lại.`
                        : ''
                }
                confirmText="Vô hiệu hoá"
                loading={confirm.loading}
                onConfirm={handleDelete}
                onCancel={() => setConfirm({ open: false, user: null, loading: false })}
            />
        </div>
    );
}
