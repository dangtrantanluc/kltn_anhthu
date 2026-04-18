import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    CalendarClock,
    FileText,
    UserSquare2,
    LogOut,
    Globe
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function Sidebar() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'vi' ? 'en' : 'vi';
        i18n.changeLanguage(newLang);
    };

    const navItems = [
        {
            to: '/dashboard',
            label: t('sidebar.dashboard'),
            icon: <LayoutDashboard className="w-5 h-5" />
        },
        {
            to: '/dashboard/attendance',
            label: t('sidebar.attendance'),
            icon: <CalendarClock className="w-5 h-5" />
        },
        {
            to: '/dashboard/leave',
            label: t('sidebar.requests'),
            icon: <FileText className="w-5 h-5" />
        },
        {
            to: '/dashboard/profile',
            label: t('sidebar.profile'),
            icon: <UserSquare2 className="w-5 h-5" />
        },
    ];

    return (
        <aside
            id="main-sidebar"
            className="fixed top-0 left-0 h-screen w-[260px] bg-white border-r border-gray-200 flex flex-col z-50 shadow-sm"
        >
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
                    </svg>
                </div>
                <div>
                    <p className="text-gray-900 font-bold text-base leading-none tracking-tight">HRIS Pro</p>
                    <p className="text-gray-500 text-xs mt-0.5 font-medium">Management System</p>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/dashboard'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions Area */}
            <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">

                {/* Language Switcher */}
                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-2 px-3 py-2 mb-3 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors font-medium"
                >
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span>{i18n.language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </button>

                {/* User Info Capsule */}
                <div className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">
                        {user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-gray-900 text-sm font-semibold truncate leading-tight">{user?.fullName || 'User'}</p>
                        <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wider truncate mt-0.5">{user?.role || 'user'}</p>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    {t('sidebar.logout')}
                </button>
            </div>
        </aside>
    );
}
