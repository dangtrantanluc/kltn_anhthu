import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import {
    userService,
    departmentService,
    positionService,
    shiftService,
} from '../../services/api';
import { ROLES, GENDERS } from './constants';

const emptyForm = {
    employee_code: '',
    email: '',
    password: '',
    full_name: '',
    role: 'USER',
    gender: '',
    birthdate: '',
    department_id: '',
    position_id: '',
    shift_id: '',
    manager_id: '',
    base_hourly_wage: 0,
    salary_multiplier: 1,
    is_active: true,
};

const toDateInput = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
};

export default function UserFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const toast = useUiStore((s) => s.toast);

    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEdit);

    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [shifts, setShifts] = useState([]);

    useEffect(() => {
        Promise.all([
            departmentService.list().catch(() => ({ data: { departments: [] } })),
            positionService.list().catch(() => ({ data: { positions: [] } })),
            shiftService.list().catch(() => ({ data: { shifts: [] } })),
        ]).then(([d, p, s]) => {
            setDepartments(d.data.departments || []);
            setPositions(p.data.positions || []);
            setShifts(s.data.shifts || []);
        });
    }, []);

    useEffect(() => {
        if (!isEdit) return;
        setLoading(true);
        userService
            .getById(id)
            .then(({ data }) => {
                const u = data.user;
                setForm({
                    employee_code: u.employee_code || '',
                    email: u.email || '',
                    password: '',
                    full_name: u.full_name || '',
                    role: u.role || 'USER',
                    gender: u.gender || '',
                    birthdate: toDateInput(u.birthdate),
                    department_id: u.department_id || '',
                    position_id: u.position_id || '',
                    shift_id: u.shift_id || '',
                    manager_id: u.manager_id || '',
                    base_hourly_wage: u.base_hourly_wage || 0,
                    salary_multiplier: u.salary_multiplier || 1,
                    is_active: Boolean(u.is_active),
                });
            })
            .catch((err) =>
                toast.error(err.response?.data?.message || 'Không tải được thông tin nhân viên.')
            )
            .finally(() => setLoading(false));
    }, [id, isEdit, toast]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...form };
            ['department_id', 'position_id', 'shift_id', 'manager_id'].forEach((k) => {
                if (payload[k] === '') payload[k] = null;
            });
            if (isEdit) {
                delete payload.password;
                await userService.update(id, payload);
                toast.success('Cập nhật nhân viên thành công.');
            } else {
                await userService.create(payload);
                toast.success('Tạo nhân viên thành công.');
            }
            navigate('/hr/users');
        } catch (err) {
            const resp = err.response?.data;
            if (resp?.errors?.length) {
                const map = {};
                resp.errors.forEach((e) => {
                    map[e.path] = e.message;
                });
                setErrors(map);
            }
            toast.error(resp?.message || 'Lưu thất bại.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <main className="flex-1 ml-[260px] p-10 text-gray-400">Đang tải...</main>
            </div>
        );
    }

    const inputCls = (field) =>
        `w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 ${errors[field]
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
        }`;

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <Link
                    to="/hr/users"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
                </Link>

                <h1 className="text-3xl font-extrabold text-gray-900 mb-6">
                    {isEdit ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
                </h1>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-gray-200 rounded-xl p-6 max-w-4xl space-y-6"
                >
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Mã nhân viên" error={errors.employee_code}>
                            <input
                                name="employee_code"
                                value={form.employee_code}
                                onChange={handleChange}
                                placeholder="EMP001"
                                className={inputCls('employee_code')}
                            />
                        </Field>
                        <Field label="Họ và tên *" error={errors.full_name}>
                            <input
                                name="full_name"
                                value={form.full_name}
                                onChange={handleChange}
                                required
                                className={inputCls('full_name')}
                            />
                        </Field>
                        <Field label="Email *" error={errors.email}>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                disabled={isEdit}
                                className={`${inputCls('email')} ${isEdit ? 'bg-gray-50' : ''}`}
                            />
                        </Field>
                        {!isEdit && (
                            <Field label="Mật khẩu *" error={errors.password}>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Tối thiểu 8 ký tự"
                                    className={inputCls('password')}
                                />
                            </Field>
                        )}
                        <Field label="Role *">
                            <select
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                className={inputCls('role')}
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Giới tính">
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className={inputCls('gender')}
                            >
                                <option value="">—</option>
                                {GENDERS.map((g) => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Ngày sinh">
                            <input
                                type="date"
                                name="birthdate"
                                value={form.birthdate}
                                onChange={handleChange}
                                className={inputCls('birthdate')}
                            />
                        </Field>
                    </section>

                    <hr className="border-gray-100" />

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Phòng ban">
                            <select
                                name="department_id"
                                value={form.department_id}
                                onChange={handleChange}
                                className={inputCls('department_id')}
                            >
                                <option value="">—</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Chức vụ">
                            <select
                                name="position_id"
                                value={form.position_id}
                                onChange={handleChange}
                                className={inputCls('position_id')}
                            >
                                <option value="">—</option>
                                {positions.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Ca làm việc">
                            <select
                                name="shift_id"
                                value={form.shift_id}
                                onChange={handleChange}
                                className={inputCls('shift_id')}
                            >
                                <option value="">—</option>
                                {shifts.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.shift_name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </section>

                    <hr className="border-gray-100" />

                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Lương cơ bản / giờ (VND)">
                            <input
                                type="number"
                                step="1000"
                                name="base_hourly_wage"
                                value={form.base_hourly_wage}
                                onChange={handleChange}
                                className={inputCls('base_hourly_wage')}
                            />
                        </Field>
                        <Field label="Hệ số lương">
                            <input
                                type="number"
                                step="0.1"
                                name="salary_multiplier"
                                value={form.salary_multiplier}
                                onChange={handleChange}
                                className={inputCls('salary_multiplier')}
                            />
                        </Field>
                        {isEdit && (
                            <Field label="Trạng thái">
                                <label className="flex items-center gap-2 h-[40px]">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={form.is_active}
                                        onChange={handleChange}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-gray-700">Đang hoạt động</span>
                                </label>
                            </Field>
                        )}
                    </section>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link
                            to="/hr/users"
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Huỷ
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo nhân viên'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}
