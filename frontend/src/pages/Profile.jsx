import React from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/layout/Sidebar';
import useAuthStore from '../store/authStore';
import { UserSquare2, Briefcase, Mail, Building, MapPin, Hash, ShieldCheck, DollarSign } from 'lucide-react';

export default function Profile() {
    const { user } = useAuthStore();
    const { t } = useTranslation();

    const hourlyRate = user?.wage || user?.base_hourly_wage || 0;
    const multiplier = user?.multi || user?.salary_multiplier || 1.0;

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {t('profile.title')}
                    </h1>
                </div>

                <div className="max-w-4xl bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
                    {/* Header Banner */}
                    <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                    {/* Profile Content */}
                    <div className="px-8 pb-8 relative">

                        {/* Avatar */}
                        <div className="absolute -top-16 left-8">
                            <div className="w-32 h-32 rounded-2xl bg-white p-2 shadow-sm border border-gray-100">
                                <div className="w-full h-full bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                                    <UserSquare2 className="w-16 h-16 text-indigo-400" strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>

                        {/* Title / Name */}
                        <div className="pt-20 pb-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900">{user?.fullName || 'User Name'}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 tracking-wide uppercase border border-indigo-100">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    {user?.role || 'USER'}
                                </span>
                                <span className="text-gray-500 text-sm font-medium">· Active</span>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">

                            {/* Left Column */}
                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <Hash className="w-4 h-4" /> {t('profile.employee_code')}
                                    </label>
                                    <p className="text-gray-900 font-medium">{user?.employeeCode || 'EMP-N/A'}</p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <Mail className="w-4 h-4" /> {t('profile.email')}
                                    </label>
                                    <p className="text-gray-900 font-medium">{user?.email || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <Building className="w-4 h-4" /> {t('profile.department')}
                                    </label>
                                    <p className="text-gray-900 font-medium">{user?.department || 'Chưa phân bổ'}</p>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <Briefcase className="w-4 h-4" /> {t('profile.position')}
                                    </label>
                                    <p className="text-gray-900 font-medium">{user?.position || 'Chưa cập nhật'}</p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <MapPin className="w-4 h-4" /> {t('profile.shift')}
                                    </label>
                                    <p className="text-gray-900 font-medium">Ca Hành Chính (08:00 - 17:00)</p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <DollarSign className="w-4 h-4" /> Payroll Info
                                    </label>
                                    <div className="flex gap-4">
                                        <div>
                                            <span className="text-gray-500 text-sm">Base Wage: </span>
                                            <span className="font-semibold text-gray-900">{hourlyRate.toLocaleString('vi-VN')}đ/h</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-sm">Multiplier: </span>
                                            <span className="font-semibold text-gray-900">x{multiplier}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
}
