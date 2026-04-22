import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * RoleGuard — hạn chế route theo role
 * Usage:
 *   <Route element={<RoleGuard roles={['ADMIN','HR']} />}>
 *      <Route path="/users" element={<UsersListPage/>} />
 *   </Route>
 *
 * Nếu chưa đăng nhập → /login
 * Nếu đăng nhập nhưng không đủ role → /dashboard
 */
export default function RoleGuard({ roles = [] }) {
    const { token, user } = useAuthStore();
    if (!token) return <Navigate to="/login" replace />;
    if (roles.length && !roles.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
}
