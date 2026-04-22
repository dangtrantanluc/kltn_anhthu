import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, AlertCircle } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import {
    payrollService,
    departmentService,
    userService,
} from '../../services/api';

export default function PayrollGeneratePage() {
    const toast = useUiStore((s) => s.toast);
    const navigate = useNavigate();
    const now = new Date();

    const [form, setForm] = useState({
        payroll_month: now.getMonth() + 1,
        payroll_year: now.getFullYear(),
        department_id: '',
        user_id: '',
    });
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        departmentService.list().then(({ data }) => setDepartments(data.departments || [])).catch(() => { });
        userService.list({ limit: 500 }).then(({ data }) => setUsers(data.items || [])).catch(() => { });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const { data } = await payrollService.generate({
                payroll_month: form.payroll_month,
                payroll_year: form.payroll_year,
                department_id: form.department_id || undefined,
                user_id: form.user_id || undefined,
            });
            setResult(data);
            toast.success(data.message || 'Tính lương thành công.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tính lương thất bại.');
        } finally {
            setLoading(false);
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
                        <h1 className="text-xl font-bold text-gray-900">Tính lương kỳ</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Hệ thống sẽ tổng hợp giờ làm và nghỉ phép từ dữ liệu chấm công, ghi nhận snapshot giá giờ / hệ số.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                                <select
                                    value={form.payroll_month}
                                    onChange={(e) => setForm({ ...form, payroll_month: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            Tháng {i + 1}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                                <select
                                    value={form.payroll_year}
                                    onChange={(e) => setForm({ ...form, payroll_year: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                    {Array.from({ length: 5 }).map((_, i) => {
                                        const y = now.getFullYear() - 2 + i;
                                        return <option key={y} value={y}>{y}</option>;
                                    })}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phạm vi — phòng ban (tuỳ chọn)
                            </label>
                            <select
                                value={form.department_id}
                                onChange={(e) => setForm({ ...form, department_id: e.target.value, user_id: '' })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">-- Toàn công ty --</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Chỉ 1 nhân viên (tuỳ chọn)
                            </label>
                            <select
                                value={form.user_id}
                                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">-- Tất cả NV trong phạm vi trên --</option>
                                {users
                                    .filter((u) => !form.department_id || String(u.department_id) === String(form.department_id))
                                    .map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.employee_code} — {u.full_name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                Phiếu lương đã ở trạng thái <b>MANAGER_APPROVED</b> hoặc <b>USER_CONFIRMED</b> sẽ được
                                giữ nguyên, không bị ghi đè. Chỉ các phiếu ở trạng thái <b>DRAFT</b> hoặc chưa có mới được
                                tạo/cập nhật.
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/payrolls')}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Calculator className="w-4 h-4" />
                                {loading ? 'Đang tính…' : 'Tính lương'}
                            </button>
                        </div>
                    </form>

                    {result && (
                        <div className="px-6 pb-5">
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                                <div className="font-semibold mb-1">Kết quả</div>
                                <div>Đã tạo/cập nhật: <b>{result.generated}</b></div>
                                <div>Bỏ qua (đã duyệt hoặc không hợp lệ): <b>{result.skipped}</b></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
