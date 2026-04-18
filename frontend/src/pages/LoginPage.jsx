import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);

    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data } = await authService.login(form.email, form.password);
            login(data.token, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
            {/* Glowing blobs */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600 opacity-10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-purple-700 opacity-10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-8">

                    {/* Logo / Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">HRIS Portal</h1>
                        <p className="text-slate-400 text-sm mt-1">Hệ thống Quản lý Nhân sự & Chấm Công</p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Email
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                placeholder="admin@hris.com"
                                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-white placeholder-slate-500
                           focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Mật khẩu
                            </label>
                            <input
                                id="login-password"
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-white placeholder-slate-500
                           focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800
                         text-white font-semibold rounded-lg transition-all duration-200
                         shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                         flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang đăng nhập...
                                </>
                            ) : 'Đăng Nhập'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-slate-500 text-xs">
                        © {new Date().getFullYear()} HRIS System. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
