import React from 'react';
import { format, parseISO } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Loader2, FileX2 } from 'lucide-react';

const STATUS_CONFIG = {
    PRESENT: {
        labelKey: 'dashboard.stats.onTime',
        classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    LATE: {
        labelKey: 'dashboard.stats.late',
        classes: 'bg-red-50 text-red-700 border border-red-200',
    },
    MISSING_CHECKOUT: {
        labelKey: 'dashboard.stats.missingCheckout',
        classes: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    ABSENT: {
        labelKey: 'dashboard.stats.absent',
        classes: 'bg-gray-100 text-gray-600 border border-gray-200',
    },
};

const formatTime = (dt) => {
    if (!dt) return <span className="text-gray-400">—</span>;
    try {
        return format(typeof dt === 'string' ? parseISO(dt) : dt, 'HH:mm');
    } catch {
        return dt;
    }
};

export default function AttendanceTable({ attendances = [], loading = false }) {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language === 'vi' ? vi : enUS;

    const formatDate = (d) => {
        if (!d) return '—';
        try {
            const date = typeof d === 'string' ? parseISO(d) : d;
            return format(date, 'EEEE, dd/MM/yyyy', { locale: currentLocale });
        } catch {
            return d;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (attendances.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                <FileX2 className="w-12 h-12 mb-4 text-gray-300 stroke-[1.5]" />
                <p className="text-sm font-medium">Không có dữ liệu chấm công cho tháng này.</p>
            </div>
        );
    }

    return (
        <div id="attendance-table-wrapper" className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        {['Ngày', 'Giờ Check-in', 'Giờ Check-out', 'Ca', 'Trạng Thái', 'Ghi Chú'].map((h) => (
                            <th key={h} className="py-3.5 px-6 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {attendances.map((row) => {
                        const statusCfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.ABSENT;
                        return (
                            <tr
                                key={row.id}
                                className="hover:bg-gray-50/50 transition-colors duration-200"
                            >
                                <td className="py-3.5 px-6 text-gray-900 font-medium capitalize whitespace-nowrap">
                                    {formatDate(row.work_date)}
                                </td>
                                <td className="py-3.5 px-6 font-mono text-gray-700">
                                    {formatTime(row.check_in_time)}
                                </td>
                                <td className="py-3.5 px-6 font-mono text-gray-700">
                                    {formatTime(row.check_out_time)}
                                </td>
                                <td className="py-3.5 px-6 text-gray-600 text-sm">
                                    {row.shift_name || 'Ca Hành Chính'}
                                    {row.late_mins > 0 && (
                                        <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                            +{row.late_mins}p
                                        </span>
                                    )}
                                </td>
                                <td className="py-3.5 px-6">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${statusCfg.classes}`}>
                                        {t(statusCfg.labelKey)}
                                    </span>
                                </td>
                                <td className="py-3.5 px-6 text-gray-500 text-sm">
                                    {row.note || '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
