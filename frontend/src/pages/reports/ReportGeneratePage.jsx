import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart2, Download, AlertCircle } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import {
    reportService,
    departmentService,
    triggerDownload,
} from '../../services/api';

const TYPES = [
    { v: 'ATTENDANCE_SUMMARY', label: 'Chấm công', needPeriod: true },
    { v: 'PAYROLL_SUMMARY', label: 'Tổng hợp lương', needPeriod: true },
    { v: 'LEAVE_SUMMARY', label: 'Nghỉ phép', needPeriod: true },
    { v: 'HEADCOUNT', label: 'Nhân sự', needPeriod: false },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export default function ReportGeneratePage() {
    const toast = useUiStore((s) => s.toast);
    const navigate = useNavigate();

    const [form, setForm] = useState({
        report_type: 'ATTENDANCE_SUMMARY',
        period_from: firstDayOfMonth(),
        period_to: todayStr(),
        department_id: '',
        file_format: 'XLSX',
        title: '',
    });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        departmentService.list().then(({ data }) => setDepartments(data.departments || [])).catch(() => { });
    }, []);

    const typeSpec = TYPES.find((t) => t.v === form.report_type) || TYPES[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const payload = {
                report_type: form.report_type,
                file_format: form.file_format,
                title: form.title || undefined,
                department_id: form.department_id || undefined,
            };
            if (typeSpec.needPeriod) {
                payload.period_from = form.period_from;
                payload.period_to = form.period_to;
            }
            const { data } = await reportService.generate(payload);
            setResult(data);
            if (data.report.status === 'EMPTY') {
                toast.info(data.message);
            } else {
                toast.success(data.message || 'Đã tạo báo cáo.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tạo báo cáo thất bại.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!result?.report?.id) return;
        try {
            const { data } = await reportService.download(result.report.id);
            const ext = (result.report.file_format || 'xlsx').toLowerCase();
            triggerDownload(data, `report_${result.report.id}.${ext}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tải file thất bại.');
        }
    };

    return (
        <div className="ml-[260px] min-h-screen bg-gray-50">
            <Sidebar />
            <div className="p-6 max-w-3xl">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h1 className="text-xl font-bold text-gray-900">Lập báo cáo</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Chọn loại báo cáo, khoảng thời gian và phòng ban rồi tạo file Excel/PDF.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại báo cáo</label>
                            <select
                                value={form.report_type}
                                onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                {TYPES.map((t) => (
                                    <option key={t.v} value={t.v}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {typeSpec.needPeriod && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={form.period_from}
                                        onChange={(e) => setForm({ ...form, period_from: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={form.period_to}
                                        onChange={(e) => setForm({ ...form, period_to: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban (tuỳ chọn)</label>
                            <select
                                value={form.department_id}
                                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">-- Toàn công ty --</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Định dạng</label>
                                <select
                                    value={form.file_format}
                                    onChange={(e) => setForm({ ...form, file_format: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="XLSX">Excel (.xlsx)</option>
                                    <option value="PDF">PDF (.pdf)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề (tuỳ chọn)</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="Hệ thống sẽ tự sinh nếu để trống"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/reports')}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <FileBarChart2 className="w-4 h-4" />
                                {loading ? 'Đang tạo…' : 'Tạo báo cáo'}
                            </button>
                        </div>
                    </form>

                    {result && (
                        <div className="px-6 pb-5">
                            {result.report.status === 'EMPTY' ? (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    {result.message}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                                    <div className="font-semibold mb-1 text-emerald-800">✓ Đã tạo báo cáo #{result.report.id}</div>
                                    <div className="text-emerald-700">Số dòng: {result.report.row_count}</div>
                                    <button
                                        onClick={handleDownload}
                                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                    >
                                        <Download className="w-4 h-4" /> Tải file
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
