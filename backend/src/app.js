const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

// ── Route imports ────────────────────────────────────────────
const authRoutes = require('./modules/auth/auth.route');
const userRoutes = require('./modules/users/users.route');
const departmentRoutes = require('./modules/departments/departments.route');
const positionRoutes = require('./modules/positions/positions.route');
const shiftRoutes = require('./modules/shifts/shifts.route');
const locationRoutes = require('./modules/locations/locations.route');
const attendanceRoutes = require('./modules/attendance/attendance.route');
const requestRoutes = require('./modules/requests/requests.route');
const payrollRoutes = require('./modules/payrolls/payrolls.route');
const reportRoutes = require('./modules/reports/reports.route');
const auditRoutes = require('./modules/audit/audit.route');
const dashboardRoutes = require('./modules/dashboard/dashboard.route');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
app.use(
    cors({
        origin: corsOrigins.length ? corsOrigins : true,
        credentials: true,
    })
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Trust proxy → req.ip chuẩn khi sau reverse proxy
app.set('trust proxy', 1);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);          // POST /login, GET /me
app.use('/api/users', userRoutes);          // CRUD /users
app.use('/api/departments', departmentRoutes);    // CRUD /departments
app.use('/api/positions', positionRoutes);      // CRUD /positions
app.use('/api/shifts', shiftRoutes);         // CRUD /shifts
app.use('/api/locations', locationRoutes);       // CRUD /locations
app.use('/api/attendance', attendanceRoutes);    // POST /punch, /sync, /process, /rollup
app.use('/api/attendances', attendanceRoutes);    // GET /me, GET /, PUT /:id
app.use('/api/requests', requestRoutes);       // Leave & punch correction requests
app.use('/api/payrolls', payrollRoutes);       // Payroll management
app.use('/api/reports', reportRoutes);         // Reports module
app.use('/api/audit-logs', auditRoutes);       // Audit viewer
app.use('/api/dashboard', dashboardRoutes);    // Admin dashboard aggregates

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route không tồn tại.' }));

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ message: err.message || 'Lỗi server nội bộ.' });
});

module.exports = app;
