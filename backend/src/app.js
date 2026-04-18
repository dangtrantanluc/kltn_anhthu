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
const attendanceRoutes = require('./modules/attendance/attendance.route');
const requestRoutes = require('./modules/requests/requests.route');
const payrollRoutes = require('./modules/payrolls/payrolls.route');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);          // POST /login, GET /me
app.use('/api/users', userRoutes);          // CRUD /users
app.use('/api/departments', departmentRoutes);    // CRUD /departments
app.use('/api/positions', positionRoutes);      // CRUD /positions
app.use('/api/shifts', shiftRoutes);         // CRUD /shifts
app.use('/api/attendance', attendanceRoutes);    // POST /sync, POST /process
app.use('/api/attendances', attendanceRoutes);    // GET /me, GET /
app.use('/api/requests', requestRoutes);       // Leave & punch correction requests
app.use('/api/payrolls', payrollRoutes);       // Payroll management

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route không tồn tại.' }));

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ message: err.message || 'Lỗi server nội bộ.' });
});

module.exports = app;
