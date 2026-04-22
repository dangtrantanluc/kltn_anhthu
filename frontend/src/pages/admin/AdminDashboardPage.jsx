import React, { useEffect, useState } from 'react';
import {
    Users,
    CheckCircle2,
    Clock,
    UserX,
    AlertCircle,
    Wallet,
    FileClock,
    RefreshCcw,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { dashboardService } from '../../services/api';
import { fmtVND } from '../../utils/format';

const StatCard = ({ label, value, sub, icon: Icon, bg, text }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${text}`}>
            <Icon className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
            <p className="text-gray-900 text-2xl font-bold mt-1 leading-none truncate">{value}</p>
            {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
        </div>
    </div>
);

const COLORS = ['#10b981', '#f59e0b', '#64748b', '#ef4444'];

export default function AdminDashboardPage() {
    const toast = useUiStore((s) => s.toast);
    const user = useAuthStore((s) => s.user);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await dashboardService.adminOverview();
            setData(data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const pieData = data
        ? [
            { name: 'Đúng giờ', value: data.todayAttendance.present },
            { name: 'Trễ', value: data.todayAttendance.late },
            { name: 'Thiếu checkout', value: data.todayAttendance.missing_checkout },
            { name: 'Vắng', value: data.todayAttendance.absent },
        ]
        : [];

    return (
        <div className="ml-[260px] min-h-screen bg-gray-50">
            <Sidebar />
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard tổng quan</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Xin chào <b>{user?.fullName}</b> — {user?.role} view.
                            {data?.scope?.department_id && <> (theo phòng ban)</>}
                        </p>
                    </div>
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCcw className="w-4 h-4" /> Tải lại
                    </button>
                </div>

                {loading && (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                        Đang tải…
                    </div>
                )}

                {data && !loading && (
                    <>
                        {/* Stat cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard
                                label="Nhân sự"
                                value={data.headcount.active}
                                sub={`Ngưng việc: ${data.headcount.inactive} • Tổng: ${data.headcount.total}`}
                                icon={Users}
                                bg="bg-indigo-50"
                                text="text-indigo-600"
                            />
                            <StatCard
                                label="Đi làm hôm nay"
                                value={data.todayAttendance.present + data.todayAttendance.late}
                                sub={`Đúng giờ: ${data.todayAttendance.present} • Trễ: ${data.todayAttendance.late}`}
                                icon={CheckCircle2}
                                bg="bg-emerald-50"
                                text="text-emerald-600"
                            />
                            <StatCard
                                label="Đơn chờ duyệt"
                                value={data.pendingRequests}
                                sub="Nghỉ phép + bổ sung chấm công"
                                icon={FileClock}
                                bg="bg-amber-50"
                                text="text-amber-600"
                            />
                            <StatCard
                                label="Quỹ lương kỳ này"
                                value={fmtVND(data.payrollThisMonth.total_salary)}
                                sub={`${data.payrollThisMonth.count} phiếu`}
                                icon={Wallet}
                                bg="bg-blue-50"
                                text="text-blue-600"
                            />
                        </div>

                        {/* Charts row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:col-span-2">
                                <h3 className="font-semibold text-gray-800 mb-4">Chấm công 7 ngày</h3>
                                <div className="h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.daily}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 11 }}
                                                tickFormatter={(v) => {
                                                    const d = new Date(v);
                                                    return `${d.getDate()}/${d.getMonth() + 1}`;
                                                }}
                                            />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Area type="monotone" dataKey="present" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Đúng giờ" />
                                            <Area type="monotone" dataKey="late" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Trễ" />
                                            <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} name="Vắng" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-5">
                                <h3 className="font-semibold text-gray-800 mb-4">Chấm công hôm nay</h3>
                                <div className="h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={50}
                                                outerRadius={90}
                                                paddingAngle={2}
                                            >
                                                {pieData.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={32} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white border border-gray-200 rounded-2xl p-5">
                                <h3 className="font-semibold text-gray-800 mb-4">Quỹ lương 6 tháng</h3>
                                <div className="h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.monthlyPayroll}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                                            <YAxis
                                                tick={{ fontSize: 11 }}
                                                tickFormatter={(v) =>
                                                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v
                                                }
                                            />
                                            <Tooltip formatter={(v) => fmtVND(v)} />
                                            <Bar dataKey="total_salary" fill="#3B82F6" name="Tổng lương" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-5">
                                <h3 className="font-semibold text-gray-800 mb-4">Nhân sự theo phòng ban</h3>
                                <div className="h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.byDepartment} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={120} />
                                            <Tooltip />
                                            <Bar dataKey="active" fill="#6366F1" name="Đang làm" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
