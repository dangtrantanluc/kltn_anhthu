import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/layout/Sidebar';
import AttendanceTable from '../components/AttendanceTable';
import { attendanceService } from '../services/api';
import useAuthStore from '../store/authStore';
import {
    CheckCircle2,
    Clock,
    UserX,
    AlertCircle,
    RefreshCcw,
    AlertTriangle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

// ── Mock data ──────────────────────────────────────────────
const MOCK_ATTENDANCE = [
    {
        id: 1, work_date: '2026-02-03', check_in_time: '2026-02-03T07:58:00',
        check_out_time: '2026-02-03T17:05:00', status: 'PRESENT', shift_name: 'Ca Hành Chính', late_mins: 0, total_worked_hours: 9.12,
    },
    {
        id: 2, work_date: '2026-02-04', check_in_time: '2026-02-04T08:18:00',
        check_out_time: '2026-02-04T17:10:00', status: 'LATE', shift_name: 'Ca Hành Chính', late_mins: 18, total_worked_hours: 8.87,
    },
    {
        id: 3, work_date: '2026-02-05', check_in_time: '2026-02-05T08:01:00',
        check_out_time: null, status: 'MISSING_CHECKOUT', shift_name: 'Ca Hành Chính', late_mins: 0, total_worked_hours: 0,
    },
    {
        id: 4, work_date: '2026-02-06', check_in_time: null,
        check_out_time: null, status: 'ABSENT', shift_name: 'Ca Hành Chính', late_mins: 0, total_worked_hours: 0,
    },
    {
        id: 5, work_date: '2026-02-10', check_in_time: '2026-02-10T07:55:00',
        check_out_time: '2026-02-10T17:00:00', status: 'PRESENT', shift_name: 'Ca Hành Chính', late_mins: 0, total_worked_hours: 9.08,
    },
    {
        id: 6, work_date: '2026-02-11', check_in_time: '2026-02-11T07:59:00',
        check_out_time: '2026-02-11T17:01:00', status: 'PRESENT', shift_name: 'Ca Hành Chính', late_mins: 0, total_worked_hours: 9.03,
    },
    {
        id: 7, work_date: '2026-02-12', check_in_time: '2026-02-12T07:50:00',
        check_out_time: '2026-02-12T17:15:00', status: 'PRESENT', shift_name: 'Ca Hành Chính', late_mins: 0, total_worked_hours: 9.41,
    }
];

// ──────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, bg, text, border, icon: Icon }) {
    return (
        <div className="bg-white border text-gray-900 border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${text} ${border && border}`}>
                <Icon className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-gray-900 text-2xl font-bold mt-1 leading-none">{value}</p>
            </div>
        </div>
    );
}

const COLORS = ['#10b981', '#f43f5e', '#64748b', '#f59e0b']; // Present, Late, Absent, Missing

export default function UserDashboard() {
    const user = useAuthStore((s) => s.user);
    const { t } = useTranslation();

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [useMock, setUseMock] = useState(false);

    const fetchAttendance = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await attendanceService.getMyAttendance(month, year);
            setData(res.data.attendances || []);
            setUseMock(false);
        } catch (err) {
            if (!err.response) {
                setData(MOCK_ATTENDANCE);
                setUseMock(true);
            } else {
                setError('Không thể tải dữ liệu chấm công.');
                setData([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [month, year]);

    // Stats summary
    const stats = {
        onTime: data.filter((d) => d.status === 'PRESENT').length,
        late: data.filter((d) => d.status === 'LATE').length,
        absent: data.filter((d) => d.status === 'ABSENT').length,
        missingCheckout: data.filter((d) => d.status === 'MISSING_CHECKOUT').length,
    };

    const pieData = [
        { name: t('dashboard.stats.onTime'), value: stats.onTime },
        { name: t('dashboard.stats.late'), value: stats.late },
        { name: t('dashboard.stats.absent'), value: stats.absent },
        { name: t('dashboard.stats.missingCheckout'), value: stats.missingCheckout }
    ].filter(i => i.value > 0);

    const areaData = data.filter(d => d.total_worked_hours > 0).map(d => ({
        date: format(parseISO(d.work_date), 'dd/MM'),
        hours: d.total_worked_hours
    }));

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />

            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                {/* Header */}
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {t('dashboard.greeting', { name: user?.fullName || 'User' })}
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm font-medium">
                            {t('dashboard.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <StatCard
                        label={t('dashboard.stats.onTime')}
                        value={stats.onTime}
                        bg="bg-emerald-100" text="text-emerald-600"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label={t('dashboard.stats.late')}
                        value={stats.late}
                        bg="bg-red-100" text="text-red-600"
                        icon={Clock}
                    />
                    <StatCard
                        label={t('dashboard.stats.absent')}
                        value={stats.absent}
                        bg="bg-gray-200" text="text-gray-600"
                        icon={UserX}
                    />
                    <StatCard
                        label={t('dashboard.stats.missingCheckout')}
                        value={stats.missingCheckout}
                        bg="bg-amber-100" text="text-amber-600"
                        icon={AlertCircle}
                    />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-gray-900 font-bold mb-6">{t('dashboard.attendance_chart')}</h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="hours" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-gray-900 font-bold mb-6">{t('dashboard.attendance_distribution')}</h3>
                        <div className="h-[250px] w-full flex justify-center items-center">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-400 text-sm">Chưa có dữ liệu</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Attendance Table Card */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                        <div>
                            <h2 className="text-gray-900 font-bold text-lg">{t('attendance.title')}</h2>
                            {useMock && (
                                <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-medium">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Đang dùng Mock Data
                                </span>
                            )}
                        </div>

                        {/* Month / Year Selector */}
                        <div className="flex items-center gap-3">
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                            >
                                {months.map((m) => (
                                    <option key={m} value={m}>{t('dashboard.month')} {m}</option>
                                ))}
                            </select>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                            >
                                {[2024, 2025, 2026].map((y) => (
                                    <option key={y} value={y}>{t('dashboard.year')} {y}</option>
                                ))}
                            </select>
                            <button
                                onClick={fetchAttendance}
                                className="p-2.5 text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-indigo-600 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                                title="Refresh"
                            >
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mx-6 mt-5 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-red-800">Lỗi kết nối</h3>
                                <div className="mt-1 text-sm text-red-700">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <AttendanceTable attendances={data} loading={loading} />
                </div>
            </main>
        </div>
    );
}
