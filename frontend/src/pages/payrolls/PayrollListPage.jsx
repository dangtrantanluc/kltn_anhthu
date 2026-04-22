import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Download, Plus, Eye, RefreshCcw } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import {
    payrollService,
    departmentService,
    triggerDownload,
} from '../../services/api';
import {
    fmtVND,
    fmtHours,
    fmtMonth,
    fmtPayrollStatus,
} from '../../utils/format';

const STATUS_OPTIONS = [
    { v: '', l: 'Tất cả' },
    { v: 'DRAFT', l: 'Chưa duyệt' },
    { v: 'MANAGER_APPROVED', l: 'QL đã duyệt' },
    { v: 'USER_CONFIRMED', l: 'Đã xác nhận' },
];

export default function PayrollListPage() {
    const toast = useUiStore((s) => s.toast);
    const { user } = useAuthStore();
    const now = new Date();

    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [departmentId, setDepartmentId] = useState('');
    const [status, setStatus] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);

    const canManage = ['ADMIN', 'HR', 'ACCOUNTANT'].includes(user?.role);
    const canExport = ['ADMIN', 'HR', 'ACCOUNTANT', 'MANAGER'].includes(user?.role);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await payrollService.list({
                month,
                year,
                department_id: departmentId || undefined,
                status: status || undefined,
            });
            setRows(data.payrolls || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được bảng lương.');
        } finally {
            setLoading(false);
        }
    }, [month, year, departmentId, status, toast]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!['ADMIN', 'HR', 'ACCOUNTANT', 'MANAGER'].includes(user?.role)) return;
        departmentService
            .list()
            .then(({ data }) => setDepartments(data.departments || []))
            .catch(() => { });
    }, [user?.role]);

    const totals = useMemo(() => {
        let count = rows.length;
        let totalHours = 0;
        let totalSalary = 0;
        rows.forEach((r) => {
            totalHours += Number(r.total_actual_hours || 0);
            totalSalary += Number(r.total_calculated_salary || 0);
        });
        return { count, totalHours, totalSalary };
    }, [rows]);

    const handleExportList = async () => {
        try {
            const { data } = await payrollService.exportList({
                year,
                month,
                department_id: departmentId || undefined,
                status: status || undefined,
            });
            triggerDownload(data, `payroll_${year}-${String(month).padStart(2, '0')}.xlsx`);
            toast.success('Đã tải file bảng lương.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xuất file thất bại.');
        }
    };

    return (
        <div className="ml-[260px] min-h-screen bg-gray-50">
            <Sidebar />
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Quản lý lương</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Tổng hợp phiếu lương theo kỳ, phòng ban và trạng thái.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={load}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            <RefreshCcw className="w-4 h-4" /> Tải lại
                        </button>
                        {canExport && (
                            <button
                                onClick={handleExportList}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                <Download className="w-4 h-4" /> Xuất Excel
                            </button>
                        )}
                        {canManage && (
                            <Link
                                to="/payrolls/generate"
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                                <Plus className="w-4 h-4" /> Tính lương
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tháng</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    Tháng {i + 1}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Năm</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            {Array.from({ length: 5 }).map((_, i) => {
                                const y = now.getFullYear() - 2 + i;
                                return (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    {['ADMIN', 'HR', 'ACCOUNTANT', 'MANAGER'].includes(user?.role) && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Phòng ban</label>
                            <select
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
                            >
                                <option value="">Tất cả</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[140px]"
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.v} value={o.v}>
                                    {o.l}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                        <Filter className="w-4 h-4" />
                        {totals.count} phiếu • Quỹ lương: <b className="text-gray-800">{fmtVND(totals.totalSalary)}</b>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                            <tr>
                                <th className="text-left px-4 py-3">Mã NV</th>
                                <th className="text-left px-4 py-3">Họ tên</th>
                                <th className="text-left px-4 py-3">Phòng ban</th>
                                <th className="text-left px-4 py-3">Kỳ</th>
                                <th className="text-right px-4 py-3">Giờ làm</th>
                                <th className="text-right px-4 py-3">Giờ phép</th>
                                <th className="text-right px-4 py-3">Tổng lương</th>
                                <th className="text-center px-4 py-3">Trạng thái</th>
                                <th className="text-right px-4 py-3">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading && (
                                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Đang tải…</td></tr>
                            )}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Chưa có phiếu lương cho kỳ này.</td></tr>
                            )}
                            {rows.map((r) => {
                                const s = fmtPayrollStatus(r.status);
                                return (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.employee_code}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{r.full_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{r.department || '—'}</td>
                                        <td className="px-4 py-3">{fmtMonth(r.payroll_month, r.payroll_year)}</td>
                                        <td className="px-4 py-3 text-right">{fmtHours(r.total_actual_hours)}</td>
                                        <td className="px-4 py-3 text-right">{fmtHours(r.total_paid_leave_hours)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                            {fmtVND(r.total_calculated_salary)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>
                                                {s.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                to={`/payrolls/${r.id}`}
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                            >
                                                <Eye className="w-4 h-4" /> Chi tiết
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
