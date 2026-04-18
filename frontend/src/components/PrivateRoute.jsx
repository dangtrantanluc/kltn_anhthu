import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * PrivateRoute — wraps protected pages
 * If no token, redirects to /login
 * Optional: roles prop restricts by role
 */
export default function PrivateRoute({ roles }) {
    const { token, user } = useAuthStore();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
