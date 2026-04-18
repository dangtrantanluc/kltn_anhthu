import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import LoginPage from '../pages/LoginPage';
import UserDashboard from '../pages/UserDashboard';
import AttendanceCalendar from '../pages/AttendanceCalendar';
import RequestsView from '../pages/RequestsView';
import Profile from '../pages/Profile';

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected */}
                <Route element={<PrivateRoute />}>
                    <Route path="/dashboard" element={<UserDashboard />} />
                    <Route path="/dashboard/attendance" element={<AttendanceCalendar />} />
                    <Route path="/dashboard/leave" element={<RequestsView />} />
                    <Route path="/dashboard/profile" element={<Profile />} />
                </Route>

                {/* Redirect root */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

