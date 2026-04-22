import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    Download,
    FileDown,
    Pencil,
    Save,
    X,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import { payrollService, triggerDownload } from '../../services/api';
import {
    fmtVND,
    fmtHours,
    fmtMonth,
    fmtDateTime,
    fmtPayrollStatus,
} from '../../utils/format';

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
    </div>
);

export default function PayrollDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useUiStore((s) => s.toast);
    const { user } = useAuthStore();

    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    const canEditDraft =
        ['ADMIN', 'HR', 'ACCOUNTANT'].includes(user?.role) &&
        payroll?.status === 'DRAFT';
    const canManagerApprove =
        ['ADMIN', 'MANAGER'].includes(user?.role) && payroll?.status === 'DRAFT';
    const canEmployeeConfirm =
        payroll?.user_id === user?.id && payroll?.status === 'MANAGER_APPROVED';

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await payrollService.getById(id);
            setPayroll(data.payroll);
            setForm({
                total_actual_hours: data.payroll.total_actual_hours,
                total_paid_leave_hours: data.payroll.total_paid_leave_hours,
                base_hourly_wage_snapshot: data.payroll.base_hourly_wage_snapshot,
                salary_multiplier_snapshot: data.payroll.salary_multiplier_snapshot,
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được phiếu lương.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await payrollService.update(id, {
                total_actual_hours: Number(form.total_actual_hours),
                total_paid_leave_hours: Number(form.total_paid_leave_hours),
                base_hourly_wage_snapshot: Number(form.base_hourly_wage_snapshot),
                salary_multiplier_snapshot: Number(form.salary_multiplier_snapshot),
            });
            setPayroll(data.payroll);
            setEditing(false);
            toast.success('Đã lưu thay đổi.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lưu thất bại.');
        } finally {
            setSaving(false);
        }
    };

    const handleManagerApprove = async () => {
        try {
            const { data } = await payrollService.managerApprove(id);
            setPayroll(data.payroll);
            toast.success('Đã duyệt phiếu lương.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Duyệt thất bại.');
        }
    };

    const handleEmployeeConfirm = async () => {
        try {
            const { data } = await payrollService.employeeConfirm(id);
            setPayroll(data.payroll);
            toast.success('Đã xác nhận phiếu lương.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xác nhận thất bại.');
        }
    };

    const handleExport = async (format) => {
        try {
            const { data } = await payrollService.exportOne(id, format);
            const ext = format === 'pdf' ? 'pdf' : 'xlsx';
            triggerDownload(
                data,
                `payroll_${payroll?.employee_code || id}_${payroll?.payroll_year}-${String(payroll?.payroll_month).padStart(2, '0')}.${ext}`
            );
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xuất file thất bại.');
        }
    };

    if (loading) {
        return (
            <div className="ml-[260px] min-h-screen bg-gray-50">
                <Sidebar />
                <div className="p-6 text-gray-400">Đang tải…</div>
            </div>
        );
    }
    if (!payroll) {
        return (
            <div className="ml-[260px] min-h-screen bg-gray-50">
                <Sidebar />
                <div className="p-6 text-gray-500">Không tìm thấy phiếu lương.</div>
            </div>
        );
    }

    const s = fmtPayrollStatus(payroll.status);

    return (
        <div className="ml-[260px] min-h-screen bg-gray-50">
            <Sidebar />
            <div className="p-6 max-w-4xl">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Phiếu lương {fmtMonth(payroll.payroll_month, payroll.payroll_year)}
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {payroll.full_name} • {payroll.employee_code} • {payroll.department || '—'}
                            </p>
                        </div>
                        <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${s.color}`}
                        >
                            {s.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-5">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Thông tin</h3>
                            <InfoRow label="Họ tên" value={payroll.full_name} />
                            <InfoRow label="Mã NV" value={payroll.employee_code} />
                            <InfoRow label="Email" value={payroll.email || '—'} />
                            <InfoRow label="Phòng ban" value={payroll.department || '—'} />
                            <InfoRow label="Chức vụ" value={payroll.position || '—'} />
                            <InfoRow label="Ca làm" value={payroll.shift_name || '—'} />
                            <InfoRow label="Tạo lúc" value={fmtDateTime(payroll.created_at)} />
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Chi tiết lương</h3>

                            {editing ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm text-gray-500">Giờ làm thực tế</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.total_actual_hours}
                                            onChange={(e) => setForm({ ...form, total_actual_hours: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Giờ phép có lương</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.total_paid_leave_hours}
                                            onChange={(e) => setForm({ ...form, total_paid_leave_hours: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Giá giờ (VND)</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={form.base_hourly_wage_snapshot}
                                            onChange={(e) => setForm({ ...form, base_hourly_wage_snapshot: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Hệ số lương</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.salary_multiplier_snapshot}
                                            onChange={(e) => setForm({ ...form, salary_multiplier_snapshot: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <InfoRow label="Giờ làm thực tế" value={fmtHours(payroll.total_actual_hours)} />
                                    <InfoRow label="Giờ phép có lương" value={fmtHours(payroll.total_paid_leave_hours)} />
                                    <InfoRow label="Giá giờ (snapshot)" value={fmtVND(payroll.base_hourly_wage_snapshot)} />
                                    <InfoRow label="Hệ số lương" value={Number(payroll.salary_multiplier_snapshot)} />
                                    <div className="flex justify-between pt-3 mt-2 border-t border-gray-200">
                                        <span className="font-semibold text-gray-800">Tổng lương</span>
                                        <span className="font-bold text-emerald-700 text-lg">
                                            {fmtVND(payroll.total_calculated_salary)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Công thức: (giờ làm + giờ phép) × giá giờ × hệ số
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                        <button
                            onClick={() => handleExport('xlsx')}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            <Download className="w-4 h-4" /> Excel
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            <FileDown className="w-4 h-4" /> PDF
                        </button>

                        {canEditDraft && !editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                            >
                                <Pencil className="w-4 h-4" /> Sửa
                            </button>
                        )}
                        {editing && (
                            <>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <X className="w-4 h-4" /> Huỷ
                                </button>
                                <button
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" /> Lưu
                                </button>
                            </>
                        )}

                        {canManagerApprove && (
                            <button
                                onClick={handleManagerApprove}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Quản lý duyệt
                            </button>
                        )}
                        {canEmployeeConfirm && (
                            <button
                                onClick={handleEmployeeConfirm}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Tôi xác nhận
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
