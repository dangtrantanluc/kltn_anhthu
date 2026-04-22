import React, { useEffect, useState } from 'react';
import {
    MapPin,
    Clock,
    LogIn,
    LogOut,
    CheckCircle2,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { attendanceService, locationService } from '../../services/api';
import { getCurrentPosition, distanceMeters } from '../../utils/geo';

const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString('vi-VN') : '—');

export default function PunchPage() {
    const toast = useUiStore((s) => s.toast);
    const user = useAuthStore((s) => s.user);

    const [position, setPosition] = useState(null);
    const [positionErr, setPositionErr] = useState('');
    const [locating, setLocating] = useState(false);

    const [locations, setLocations] = useState([]);
    const [today, setToday] = useState(null); // attendance row hôm nay

    const [punching, setPunching] = useState(false);

    const refresh = async () => {
        try {
            const now = new Date();
            const { data } = await attendanceService.getMyAttendance(
                now.getMonth() + 1,
                now.getFullYear()
            );
            const todayStr = now.toISOString().slice(0, 10);
            const rec = (data.attendances || []).find(
                (a) => String(a.work_date).slice(0, 10) === todayStr
            );
            setToday(rec || null);
        } catch {
            /* ignore */
        }
    };

    useEffect(() => {
        locationService
            .list({ active_only: true })
            .then(({ data }) => setLocations(data.locations || []))
            .catch(() => { });
        refresh();
    }, []);

    const acquireLocation = async () => {
        setLocating(true);
        setPositionErr('');
        try {
            const pos = await getCurrentPosition();
            setPosition(pos);
        } catch (err) {
            setPositionErr(err.message);
        } finally {
            setLocating(false);
        }
    };

    // Tự lấy vị trí khi vào trang
    useEffect(() => {
        acquireLocation();
    }, []);

    const nearest = position
        ? locations
            .map((l) => ({
                ...l,
                distance: distanceMeters(
                    position.latitude,
                    position.longitude,
                    Number(l.latitude),
                    Number(l.longitude)
                ),
            }))
            .sort((a, b) => a.distance - b.distance)[0]
        : null;

    const inRange = nearest && nearest.distance <= Number(nearest.radius_m);

    const handlePunch = async (type) => {
        if (!position) {
            toast.error('Chưa lấy được vị trí. Nhấn "Lấy lại vị trí" và thử lại.');
            return;
        }
        setPunching(true);
        try {
            const { data } = await attendanceService.punch({
                type,
                latitude: position.latitude,
                longitude: position.longitude,
            });
            toast.success(data.message);
            setToday(data.attendance);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Chấm công thất bại.');
        } finally {
            setPunching(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10 max-w-4xl">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Chấm công</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Card trạng thái */}
                    <section className="bg-white border border-gray-200 rounded-2xl p-6">
                        <h2 className="font-bold text-gray-900 mb-4">Hôm nay</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <LogIn className="w-4 h-4" /> Check-in
                                </span>
                                <span className="font-semibold text-gray-900">
                                    {fmtTime(today?.check_in_time)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <LogOut className="w-4 h-4" /> Check-out
                                </span>
                                <span className="font-semibold text-gray-900">
                                    {fmtTime(today?.check_out_time)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Trạng thái
                                </span>
                                <span className="font-semibold">
                                    {today?.status ? (
                                        <StatusBadge status={today.status} />
                                    ) : (
                                        <span className="text-gray-400">Chưa chấm</span>
                                    )}
                                </span>
                            </div>
                            {today?.late_mins > 0 && (
                                <p className="text-amber-600 text-xs">
                                    ⚠ Đi muộn {today.late_mins} phút
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Card vị trí */}
                    <section className="bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-900">Vị trí hiện tại</h2>
                            <button
                                onClick={acquireLocation}
                                disabled={locating}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                            >
                                {locating ? 'Đang lấy...' : 'Lấy lại vị trí'}
                            </button>
                        </div>

                        {positionErr ? (
                            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                <span>{positionErr}</span>
                            </div>
                        ) : !position ? (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Đang xác định vị trí...
                            </div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-500 text-xs font-mono">
                                    {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                                    {' '}(±{Math.round(position.accuracy)}m)
                                </p>
                                {nearest ? (
                                    <div
                                        className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${inRange
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                            : 'bg-amber-50 border-amber-200 text-amber-800'
                                            }`}
                                    >
                                        {inRange ? (
                                            <CheckCircle2 className="w-4 h-4 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                                        )}
                                        <div>
                                            <p className="font-semibold flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" /> {nearest.name}
                                            </p>
                                            <p className="text-xs">
                                                Cách {Math.round(nearest.distance)}m (cho phép{' '}
                                                {nearest.radius_m}m) ·{' '}
                                                {inRange ? 'Trong phạm vi' : 'Ngoài phạm vi'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">
                                        Chưa có địa điểm được cấu hình.
                                    </p>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* Action buttons */}
                <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => handlePunch('IN')}
                        disabled={punching || !position}
                        className="py-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
                    >
                        <LogIn className="w-6 h-6" />
                        CHECK-IN
                    </button>
                    <button
                        onClick={() => handlePunch('OUT')}
                        disabled={punching || !position}
                        className="py-6 bg-red-600 hover:bg-red-500 disabled:bg-gray-300 text-white font-bold text-lg rounded-2xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-3"
                    >
                        <LogOut className="w-6 h-6" />
                        CHECK-OUT
                    </button>
                </section>

                <p className="mt-6 text-xs text-gray-400">
                    {user?.employeeCode ? (
                        <>Đang đăng nhập với mã: <b className="font-mono">{user.employeeCode}</b></>
                    ) : (
                        'Tài khoản chưa có mã nhân viên — không chấm công được.'
                    )}
                </p>
            </main>
        </div>
    );
}

const statusStyles = {
    PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LATE: 'bg-amber-50 text-amber-700 border-amber-200',
    MISSING_CHECKOUT: 'bg-orange-50 text-orange-700 border-orange-200',
    ABSENT: 'bg-gray-100 text-gray-700 border-gray-200',
};

function StatusBadge({ status }) {
    const cls = statusStyles[status] || statusStyles.ABSENT;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${cls}`}>
            {status}
        </span>
    );
}
