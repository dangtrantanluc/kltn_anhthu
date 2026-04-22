import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authService.forgotPassword(email);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Không gửi được email. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
            <div className="relative w-full max-w-md">
                <div className="bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Quên mật khẩu?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Nhập email, chúng tôi sẽ gửi link đặt lại mật khẩu.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-4">
                            Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong ít phút.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@company.com"
                                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/25"
                            >
                                {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
                            </button>
                        </form>
                    )}

                    <p className="mt-6 text-center text-sm">
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                            ← Quay lại đăng nhập
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
