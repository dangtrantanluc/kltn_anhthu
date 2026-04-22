import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Pencil, Filter } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import { attendanceService, departmentService, userService } from '../../services/api';

const STATUS_OPTIONS = ['PRESENT', 'LATE', 'MISSING_CHECKOUT', 'ABSENT'];

const toDateTimeInput = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusStyles = {
    PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LATE: 'bg-amber-50 text-amber-700 border-amber-200',
    MISSING_CHECKOUT: 'bg-orange-50 text-orange-700 border-orange-200',
    ABSENT: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function AdminAttendancePage() {
    const toast = useUiStore((s) => s.toast);
    const now = new Date();

    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [departmentId, setDepartmentId] = useState('');
    const [userId, setUserId] = useState('');

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);

    const [editing, setEditing] = useState(null); // row being edited
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await attendanceService.getAllAttendance({
                month,
                year,
                department_id: departmentId || undefined,
                user_id: userId || undefined,
            });
            setRows(data.attendances || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được dữ liệu.');
        } finally {
            setLoading(false);
        }
    }, [month, year, departmentId, userId, toast]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        departmentService.list().then(({ data }) => setDepartments(data.departments || [])).catch(() => { });
        userService.list({ limit: 200 }).then(({ data }) => setUsers(data.items || [])).catch(() => { });
    }, []);

    const runRollup = async () => {
        try {
            const { data } = await attendanceService.triggerProcess();
            toast.success(`${data.message} (${data.processedLogs} logs)`);
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rollup thất bại.');
        }
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            await attendanceService.updateAttendance(editing.id, {
                check_in_time: editing.check_in_time || null,
                check_out_time: editing.check_out_time || null,
                status: editing.status,
            });
            toast.success('Cập nhật thành công.');
            setEditing(null);
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Cập nhật thất bại.');
        } finally {
            setSaving(false);
        }
    };

    const totals = useMemo(() => {
        const sum = rows.reduce(
            (acc, r) => {
                acc.present += r.status === 'PRESENT' ? 1 : 0;
                acc.late += r.status === 'LATE' ? 1 : 0;
                acc.absent += r.status === 'ABSENT' ? 1 : 0;
                acc.hours += Number(r.total_worked_hours || 0);
                return acc;
            },
            { present: 0, late: 0, absent: 0, hours: 0 }
        );
        return sum;
    }, [rows]);

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Bảng chấm công</h1>
                        <p className="text-gray-500 text-sm mt-1">Theo dõi và chỉnh sửa dữ liệu chấm công.</p>
                    </div>
                    <button
                        onClick={runRollup}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow"
                    >
                        <RefreshCcw className="w-4 h-4" /> Chạy rollup
                    </button>
                </header>

                {/* Filters */}
                <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tháng</label>
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Năm</label>
                        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phòng ban</label>
                        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
                            <option value="">Tất cả</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nhân viên</label>
                        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
                            <option value="">Tất cả</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <Filter className="w-4 h-4" /> Lọc
                    </button>
                </section>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                    <StatBox label="Đúng giờ" value={totals.present} color="emerald" />
                    <StatBox label="Đi muộn" value={totals.late} color="amber" />
                    <StatBox label="Vắng" value={totals.absent} color="gray" />
                    <StatBox label="Tổng giờ làm" value={totals.hours.toFixed(1)} color="indigo" />
                </div>

                {/* Table */}
                <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Ngày</th>
                                <th className="px-4 py-3 text-left">Nhân viên</th>
                                <th className="px-4 py-3 text-left">Phòng ban</th>
                                <th className="px-4 py-3 text-left">Check-in</th>
                                <th className="px-4 py-3 text-left">Check-out</th>
                                <th className="px-4 py-3 text-left">Giờ</th>
                                <th className="px-4 py-3 text-left">Trạng thái</th>
                                <th className="px-4 py-3 text-right">Sửa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
                            )}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Không có dữ liệu.</td></tr>
                            )}
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                                    <td className="px-4 py-2">{new Date(r.work_date).toLocaleDateString('vi-VN')}</td>
                                    <td className="px-4 py-2 font-medium">{r.full_name} <span className="text-gray-400 text-xs">({r.employee_code})</span></td>
                                    <td className="px-4 py-2">{r.department || '—'}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('vi-VN') : '—'}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('vi-VN') : '—'}</td>
                                    <td className="px-4 py-2">{Number(r.total_worked_hours || 0).toFixed(1)}h</td>
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-semibold ${statusStyles[r.status] || statusStyles.ABSENT}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button
                                            onClick={() => setEditing({
                                                id: r.id,
                                                full_name: r.full_name,
                                                work_date: r.work_date,
                                                check_in_time: toDateTimeInput(r.check_in_time),
                                                check_out_time: toDateTimeInput(r.check_out_time),
                                                status: r.status,
                                            })}
                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>

            {editing && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setEditing(null)}>
                    <div onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Sửa chấm công</h3>
                        <p className="text-sm text-gray-500">
                            {editing.full_name} · {new Date(editing.work_date).toLocaleDateString('vi-VN')}
                        </p>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check-in</label>
                            <input type="datetime-local" value={editing.check_in_time || ''}
                                onChange={(e) => setEditing({ ...editing, check_in_time: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check-out</label>
                            <input type="datetime-local" value={editing.check_out_time || ''}
                                onChange={(e) => setEditing({ ...editing, check_out_time: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trạng thái</label>
                            <select value={editing.status}
                                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button onClick={() => setEditing(null)}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                                Huỷ
                            </button>
                            <button onClick={saveEdit} disabled={saving}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow">
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value, color }) {
    const palette = {
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        gray: 'bg-gray-100 text-gray-700',
        indigo: 'bg-indigo-50 text-indigo-700',
    };
    return (
        <div className={`px-4 py-3 rounded-xl border border-gray-200 bg-white`}>
            <p className="text-xs uppercase font-bold text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${palette[color] || ''} inline-block px-2 rounded`}>
                {value}
            </p>
        </div>
    );
}
