import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileBarChart2, Plus, Download, RefreshCcw, Filter } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import { reportService, triggerDownload } from '../../services/api';
import { fmtDateTime, fmtVND } from '../../utils/format';

const TYPE_LABEL = {
    ATTENDANCE_SUMMARY: 'Chấm công',
    PAYROLL_SUMMARY: 'Lương',
    HEADCOUNT: 'Nhân sự',
    LEAVE_SUMMARY: 'Nghỉ phép',
};

const TYPE_BADGE = {
    ATTENDANCE_SUMMARY: 'bg-blue-100 text-blue-700',
    PAYROLL_SUMMARY: 'bg-emerald-100 text-emerald-700',
    HEADCOUNT: 'bg-purple-100 text-purple-700',
    LEAVE_SUMMARY: 'bg-amber-100 text-amber-700',
};

const STATUS_BADGE = {
    GENERATED: 'bg-emerald-100 text-emerald-700',
    EMPTY: 'bg-gray-100 text-gray-600',
    FAILED: 'bg-red-100 text-red-700',
};

const STATUS_LABEL = {
    GENERATED: 'Đã tạo',
    EMPTY: 'Không có dữ liệu',
    FAILED: 'Lỗi',
};

const renderSummary = (type, s) => {
    if (!s) return '—';
    if (type === 'PAYROLL_SUMMARY') {
        return `${s.employeeCount || 0} NV • ${fmtVND(s.totalSalary || 0)}`;
    }
    if (type === 'ATTENDANCE_SUMMARY') {
        return `${s.users || 0} NV • Đi làm: ${s.present_days || 0}, Trễ: ${s.late_days || 0}`;
    }
    if (type === 'HEADCOUNT') {
        return `Tổng: ${s.total || 0} • Đang làm: ${s.active || 0}`;
    }
    if (type === 'LEAVE_SUMMARY') {
        return `Phép có lương: ${s.paid || 0} • Không lương: ${s.unpaid || 0}`;
    }
    return '—';
};

export default function ReportListPage() {
    const toast = useUiStore((s) => s.toast);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await reportService.list({ report_type: type || undefined });
            setRows(data.reports || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được báo cáo.');
        } finally {
            setLoading(false);
        }
    }, [type, toast]);

    useEffect(() => { load(); }, [load]);

    const handleDownload = async (r) => {
        try {
            const { data } = await reportService.download(r.id);
            const ext = (r.file_format || 'xlsx').toLowerCase();
            triggerDownload(
                data,
                `report_${r.id}_${r.report_type}.${ext}`
            );
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tải file thất bại.');
        }
    };

    return (
        <div className="ml-[260px] min-h-screen bg-gray-50">
            <Sidebar />
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Quản lý báo cáo</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Lịch sử báo cáo đã tạo, tải về Excel/PDF hoặc in.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={load}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            <RefreshCcw className="w-4 h-4" /> Tải lại
                        </button>
                        <Link
                            to="/reports/generate"
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4" /> Lập báo cáo
                        </Link>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex gap-3 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Loại</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
                        >
                            <option value="">Tất cả</option>
                            {Object.entries(TYPE_LABEL).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                        <Filter className="w-4 h-4" /> {rows.length} báo cáo
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                            <tr>
                                <th className="text-left px-4 py-3">Loại</th>
                                <th className="text-left px-4 py-3">Tiêu đề</th>
                                <th className="text-left px-4 py-3">Kỳ</th>
                                <th className="text-left px-4 py-3">Phòng ban</th>
                                <th className="text-left px-4 py-3">Tóm tắt</th>
                                <th className="text-center px-4 py-3">Trạng thái</th>
                                <th className="text-left px-4 py-3">Người tạo</th>
                                <th className="text-left px-4 py-3">Tạo lúc</th>
                                <th className="text-right px-4 py-3">Tải</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading && <tr><td colSpan={9} className="text-center py-10 text-gray-400">Đang tải…</td></tr>}
                            {!loading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center py-10 text-gray-400">
                                        Chưa có báo cáo nào. Bấm “Lập báo cáo” để tạo mới.
                                    </td>
                                </tr>
                            )}
                            {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGE[r.report_type] || 'bg-gray-100 text-gray-700'}`}>
                                            <FileBarChart2 className="w-3 h-3 mr-1" />
                                            {TYPE_LABEL[r.report_type] || r.report_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[300px] truncate" title={r.title}>
                                        {r.title || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {r.period_from
                                            ? `${new Date(r.period_from).toLocaleDateString('vi-VN')} → ${new Date(r.period_to).toLocaleDateString('vi-VN')}`
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{r.department || 'Toàn cty'}</td>
                                    <td className="px-4 py-3 text-gray-700 text-xs">{renderSummary(r.report_type, r.summary_json)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100'}`}>
                                            {STATUS_LABEL[r.status] || r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{r.creator_name || '—'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDateTime(r.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {r.status === 'GENERATED' ? (
                                            <button
                                                onClick={() => handleDownload(r)}
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                            >
                                                <Download className="w-4 h-4" /> Tải
                                            </button>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
