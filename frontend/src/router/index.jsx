import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import RoleGuard from '../components/RoleGuard';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import UserDashboard from '../pages/UserDashboard';
import AttendanceCalendar from '../pages/AttendanceCalendar';
import RequestsView from '../pages/RequestsView';
import Profile from '../pages/Profile';
import PunchPage from '../pages/attendance/PunchPage';
import UsersListPage from '../pages/hr/UsersListPage';
import UserFormPage from '../pages/hr/UserFormPage';
import UserDetailPage from '../pages/hr/UserDetailPage';
import AdminAttendancePage from '../pages/admin/AdminAttendancePage';
import LocationsPage from '../pages/admin/LocationsPage';
import ShiftsPage from '../pages/admin/ShiftsPage';
import PayrollListPage from '../pages/payrolls/PayrollListPage';
import PayrollDetailPage from '../pages/payrolls/PayrollDetailPage';
import PayrollGeneratePage from '../pages/payrolls/PayrollGeneratePage';
import ReportListPage from '../pages/reports/ReportListPage';
import ReportGeneratePage from '../pages/reports/ReportGeneratePage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected — any authenticated */}
                <Route element={<PrivateRoute />}>
                    <Route path="/dashboard" element={<UserDashboard />} />
                    <Route path="/dashboard/punch" element={<PunchPage />} />
                    <Route path="/dashboard/attendance" element={<AttendanceCalendar />} />
                    <Route path="/dashboard/leave" element={<RequestsView />} />
                    <Route path="/dashboard/profile" element={<Profile />} />
                    {/* Payroll: USER xem của mình; MANAGER/ACCOUNTANT/ADMIN/HR xem mở rộng */}
                    <Route path="/payrolls" element={<PayrollListPage />} />
                    <Route path="/payrolls/:id" element={<PayrollDetailPage />} />
                </Route>

                {/* Payroll generate — ACCOUNTANT/HR/ADMIN */}
                <Route element={<RoleGuard roles={['ADMIN', 'HR', 'ACCOUNTANT']} />}>
                    <Route path="/payrolls/generate" element={<PayrollGeneratePage />} />
                </Route>

                {/* HR / ADMIN only */}
                <Route element={<RoleGuard roles={['ADMIN', 'HR']} />}>
                    <Route path="/hr/users" element={<UsersListPage />} />
                    <Route path="/hr/users/new" element={<UserFormPage />} />
                    <Route path="/hr/users/:id" element={<UserDetailPage />} />
                    <Route path="/hr/users/:id/edit" element={<UserFormPage />} />
                </Route>

                {/* Admin/Manager/HR: attendance oversight */}
                <Route element={<RoleGuard roles={['ADMIN', 'HR', 'MANAGER']} />}>
                    <Route path="/admin/attendance" element={<AdminAttendancePage />} />
                </Route>

                {/* Dashboard, Reports cho ADMIN/HR/MANAGER/ACCOUNTANT */}
                <Route element={<RoleGuard roles={['ADMIN', 'HR', 'MANAGER', 'ACCOUNTANT']} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                    <Route path="/reports" element={<ReportListPage />} />
                    <Route path="/reports/generate" element={<ReportGeneratePage />} />
                </Route>

                {/* ADMIN-only: config + audit */}
                <Route element={<RoleGuard roles={['ADMIN']} />}>
                    <Route path="/admin/locations" element={<LocationsPage />} />
                    <Route path="/admin/shifts" element={<ShiftsPage />} />
                </Route>
                <Route element={<RoleGuard roles={['ADMIN', 'HR']} />}>
                    <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                </Route>

                {/* Redirect root */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
