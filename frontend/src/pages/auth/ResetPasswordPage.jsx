import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token') || '';

    const [form, setForm] = useState({ password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }
        if (form.password !== form.confirm) {
            setError('Hai mật khẩu không khớp.');
            return;
        }
        setLoading(true);
        try {
            await authService.resetPassword(token, form.password);
            setDone(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Không đặt lại được mật khẩu.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
                <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-8 text-center max-w-md">
                    <p className="text-red-400 mb-4">Link không hợp lệ — thiếu token.</p>
                    <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300">
                        Yêu cầu link mới
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
            <div className="relative w-full max-w-md">
                <div className="bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Đặt lại mật khẩu</h1>
                    </div>

                    {done ? (
                        <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                            Đặt lại mật khẩu thành công. Đang chuyển đến trang đăng nhập...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    required
                                    placeholder="Tối thiểu 8 ký tự"
                                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nhập lại mật khẩu</label>
                                <input
                                    type="password"
                                    value={form.confirm}
                                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/25"
                            >
                                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
